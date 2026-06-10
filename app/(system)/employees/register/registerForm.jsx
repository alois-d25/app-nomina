"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FaArrowLeft,
  FaUser,
  FaGraduationCap,
  FaBriefcase,
  FaDownload,
} from "react-icons/fa6";
import FormField from "./form";
import axios from 'axios'
import { toast } from "react-toastify"
/**
 * Página de registro de empleados
 */
export default function RegisterEmployeePage({ titulos, escalafones, reglas }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dni: "",
    email: "",
    status: "activo",
    highestDegree: "",
    academicRank: "",
    hireDate: "",
    yearsExperience: "",
    tipoJornada: "dias",
    diasTrabajados: "5",
    horasTrabajadas: "",
  });

  const [errors, setErrors] = useState({});

  const yearsFromHireDate = useMemo(() => {
    if (!formData.hireDate) return 0;
    const hireDate = new Date(formData.hireDate);
    const today = new Date();
    return Math.floor((today - hireDate) / (365.25 * 24 * 60 * 60 * 1000));
  }, [formData.hireDate]);

  const effectiveYears = useMemo(() => {
    if (formData.yearsExperience !== "") {
      return parseInt(formData.yearsExperience) || 0;
    }
    return yearsFromHireDate;
  }, [formData.yearsExperience, yearsFromHireDate]);

  const calculatedSalary = useMemo(() => {
    const rankId = parseInt(formData.academicRank);
    const degreeId = parseInt(formData.highestDegree);

    if (!isNaN(rankId) && !isNaN(degreeId)) {
      const reglaAplicable = reglas.find(rule =>
        rule.nivel_escalafon_id === rankId &&
        rule.titulo_academico_id === degreeId &&
        rule.activa === true &&
        rule.anios_min <= effectiveYears &&
        rule.anios_max > effectiveYears
      );
      return reglaAplicable?.salario_base?.toString() || "";
    }
    return "";
  }, [formData.academicRank, formData.highestDegree, effectiveYears, reglas]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "tipoJornada" && formData.tipoJornada === "horas") {
      return;
    }

    let newData = {
      [name]: type === "checkbox" ? checked : value,
    };

    if (name === "academicRank") {
      const rankId = parseInt(value);
      const selectedRank = escalafones.find(e => e.id === rankId);
      const isProfessor = selectedRank?.nombre?.toLowerCase().includes("profesor x hora");
      if (isProfessor) {
        newData.tipoJornada = "horas";
      } else {
        newData.tipoJornada = "dias";
      }
    }

    setFormData((prev) => ({
      ...prev,
      ...newData,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim())
      newErrors.firstName = "El nombre es requerido";
    if (!formData.lastName.trim())
      newErrors.lastName = "El apellido es requerido";
    if (!formData.dni.trim()) {
      newErrors.dni = "La cédula es requerida";
    } else if (!/^[VEJ]\d{6,10}$/.test(formData.dni)) {
      newErrors.dni = "Formato inválido. Use: V123456 a V1234567890";
    }
    if (!formData.email.trim()) {
      newErrors.email = "El correo electrónico es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Formato de correo inválido";
    }
    if (!formData.highestDegree)
      newErrors.highestDegree = "El título académico es requerido";
    if (!formData.academicRank)
      newErrors.academicRank = "La categoría (escalafón) es requerida";
    if (!formData.hireDate)
      newErrors.hireDate = "La fecha de contratación es requerida";
    if (formData.yearsExperience !== "" && parseInt(formData.yearsExperience) < 0)
      newErrors.yearsExperience = "Los años de experiencia no pueden ser negativos";
    if (formData.tipoJornada === "dias") {
      const dias = parseInt(formData.diasTrabajados);
      if (!formData.diasTrabajados || dias < 1 || dias > 7)
        newErrors.diasTrabajados = "Indique entre 1 y 7 días";
    } else if (formData.tipoJornada === "horas") {
      const horas = parseInt(formData.horasTrabajadas);
      if (!formData.horasTrabajadas || horas < 1)
        newErrors.horasTrabajadas = "Indique las horas trabajadas por semana";
    }
    if (!calculatedSalary)
      newErrors.baseSalary = "El salario base es requerido";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log(formData)
    if (validateForm()) {
      try {
        // 1. Mapeamos el estado del frontend al esquema EmpleadoCreate del backend
        
        const payload = {
          cedula: formData.dni,
          email: formData.email,
          nombre: formData.firstName,
          apellido: formData.lastName,
          anios_experiencia: effectiveYears,

          estado: formData.status,

          nivel_escalafon_id: parseInt(formData.academicRank),
          titulo_academico_id: parseInt(formData.highestDegree),

          fecha_ingreso: formData.hireDate,

          salario_base: parseFloat(calculatedSalary),

          es_por_hora: formData.tipoJornada === "horas",
          dias_trabajados_semana:
            formData.tipoJornada === "dias" ? parseInt(formData.diasTrabajados) || null : null,
          horas_trabajadas_semana:
            formData.tipoJornada === "horas" ? parseInt(formData.horasTrabajadas) || null : null,
        };

        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        //usa el endpoint default para crear el empleado
        await axios.post(`${API_URL}/api/empleados/`, payload);

        // Create cestaticket record for the employee
        // await axios.post(`${API_URL}/api/cestaticket/`, {
        //   empleado_cedula: formData.dni,
        //   monto: 40,
        // });

        toast.success("¡Empleado registrado exitosamente!");
        router.push("/employees");
      } catch (error) {
        const errorMsg = error.response?.data?.detail || "Hubo un error al registrar el empleado.";
        // Duplicados (409): mostramos el error directamente en el campo correspondiente.
        if (/correo ya est/i.test(errorMsg)) {
          setErrors((prev) => ({ ...prev, email: "Este correo ya está registrado" }));
        } else if (error.response?.status === 409 || /c[ée]dula ya est/i.test(errorMsg)) {
          setErrors((prev) => ({ ...prev, dni: "Esta cédula ya está registrada" }));
        }
        toast.error(errorMsg);
      }
    }
  };

  const handleReset = () => {
    setFormData({
      firstName: "",
      lastName: "",
      dni: "",
      email: "",
      status: "activo",
      highestDegree: "",
      academicRank: "",
      hireDate: "",
      yearsExperience: "",
      tipoJornada: "dias",
      diasTrabajados: "5",
      horasTrabajadas: "",
    });
    setErrors({});
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
            <h2 className="text-2xl font-bold text-base-content my-5">
                Registro de Empleado
              </h2>
              <p className="text-sm text-base-content/70 mt-1">
                Agregue un nuevo miembro al sistema de nómina.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="card bg-white shadow-xl">
            <div className="card-body space-y-6">
              {/* Section: Personal Information */}
              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-base-300 pb-2">
                <FaUser className="text-primary text-xl" />
                  <h3 className="font-semibold text-lg text-base-content m-0">
                    Información Personal
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField label="Nombre" name="firstName" value={formData.firstName} onChange={handleChange} error={errors.firstName} required placeholder="ej. Juan" />
                  <FormField label="Apellido" name="lastName" value={formData.lastName} onChange={handleChange} error={errors.lastName} required placeholder="ej. Pérez" />
                  <FormField label="Cédula" name="dni" value={formData.dni} onChange={handleChange} error={errors.dni} required placeholder="V111111111 / E22222222" />
                  <FormField
                    label="Correo Institucional"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    required
                    type="email"
                    placeholder="juan.perez@university.edu"
                    className="lg:col-span-2"
                  />

                  {/* Status */}
                  <div className="form-control">
                    <label className="label"><span className="label-text">Estado inicial</span></label>
                    <div className="flex items-center gap-4 flex-wrap">
                      <label className="label cursor-pointer gap-2">
                        <input name="status" type="radio" value="activo" checked={formData.status === "activo"} onChange={handleChange} className="radio radio-primary" />
                        <span className="label-text">Activo</span>
                      </label>
                      <label className="label cursor-pointer gap-2">
                        <input name="status" type="radio" value="permiso" checked={formData.status === "permiso"} onChange={handleChange} className="radio radio-warning" />
                        <span className="label-text">Permiso</span>
                      </label>
                      <label className="label cursor-pointer gap-2">
                        <input name="status" type="radio" value="inactivo" checked={formData.status === "inactivo"} onChange={handleChange} className="radio radio-error" />
                        <span className="label-text">Inactivo</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Academic Information */}
              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-base-300 pb-2">
                <FaGraduationCap className="text-primary text-xl" />
                  <h3 className="font-semibold text-lg text-base-content m-0">
                    Información Académica
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField label="Título Académico" name="highestDegree" value={formData.highestDegree} onChange={handleChange} error={errors.highestDegree} type="select" required>
                    <option value="" disabled>Seleccionar título</option>
                    {titulos.map((titulo) => (
                      <option key={titulo.id} value={titulo.id} className="hover:bg-primary hover:text-on-primary whitespace-nowrap">
                        {titulo.nombre}
                      </option>
                    ))}
                  </FormField>

                  <FormField label="Categoría (Escalafón)" name="academicRank" value={formData.academicRank} onChange={handleChange} error={errors.academicRank} type="select" required>
                    <option value="" disabled>Seleccionar categoría</option>
                    {escalafones.map((escalafon) => (
                      <option key={escalafon.id} value={escalafon.id} className="hover:bg-primary hover:text-on-primary whitespace-nowrap">
                        {escalafon.nombre}
                      </option>
                    ))}
                  </FormField>

                  <FormField
                    label="Años de Experiencia"
                    name="yearsExperience"
                    value={formData.yearsExperience}
                    onChange={handleChange}
                    error={errors.yearsExperience}
                    placeholder={yearsFromHireDate > 0 ? `${yearsFromHireDate} (calculado)` : "0"}
                    type="number"
                    min="0"
                  />
                </div>
              </div>

              {/* Section: Employment Information */}
              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-base-300 pb-2">
                <FaBriefcase className="text-primary text-xl" />
                  <h3 className="font-semibold text-lg text-base-content m-0">
                    Información Laboral
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Fecha de Contratación" name="hireDate" value={formData.hireDate} onChange={handleChange} error={errors.hireDate} required type="date" />
                  <FormField
                    label="Tipo de Jornada"
                    name="tipoJornada"
                    value={formData.tipoJornada}
                    onChange={handleChange}
                    type="select"
                    required
                    disabled={formData.tipoJornada === "horas"}
                  >
                    <option value="dias">Por días</option>
                    <option value="horas">Por horas</option>
                  </FormField>
                  {formData.tipoJornada === "dias" ? (
                    <FormField
                      label="Días trabajados por semana"
                      name="diasTrabajados"
                      value={formData.diasTrabajados}
                      onChange={handleChange}
                      error={errors.diasTrabajados}
                      type="number"
                      min="1"
                      max="7"
                      placeholder="5"
                    />
                  ) : (
                    <FormField
                      label="Horas trabajadas por semana"
                      name="horasTrabajadas"
                      value={formData.horasTrabajadas}
                      onChange={handleChange}
                      error={errors.horasTrabajadas}
                      type="number"
                      min="1"
                      placeholder="ej. 12"
                    />
                  )}
                  <FormField
                    label="Salario Base (Mensual)"
                    name="baseSalary"
                    value={calculatedSalary}
                    onChange={handleChange}
                    error={
                      errors.baseSalary ||
                      (formData.academicRank && formData.highestDegree && (formData.yearsExperience !== "" || formData.hireDate) && !calculatedSalary
                        ? "No hay regla salarial para esta combinación"
                        : null)
                    }
                    required
                    prefix="RD$"
                    placeholder="Calculado automáticamente"
                    readOnly
                    className="bg-base-200/50 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-4 border-t border-base-300">
                <button
                  type="reset"
                  onClick={handleReset}
                  className="btn btn-ghost"
                >
                  Limpiar Formulario
                </button>
                <Link href="/employees" className="btn btn-error btn-outline">
                  Cancelar
                </Link>
                <button type="submit" className="btn btn-primary">
                <FaDownload className=""/>
                  Guardar Empleado
                </button>
              </div>
            </div>
          </form>
      </div>
    </div>
  );
}
