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
    yearsExperience: "",
    hireDate: "",
    cestaticket_monto: "40",
  });

  const [errors, setErrors] = useState({});

  const calculatedSalary = useMemo(() => {
    const rankId = parseInt(formData.academicRank);
    const degreeId = parseInt(formData.highestDegree);
    const exp = parseInt(formData.yearsExperience);

    if (!isNaN(rankId) && !isNaN(degreeId) && !isNaN(exp)) {
      const reglaAplicable = reglas.find(rule =>
        rule.nivel_escalafon_id === rankId &&
        rule.titulo_academico_id === degreeId &&
        rule.activa === true &&
        rule.anios_min <= exp &&
        rule.anios_max > exp
      );
      return reglaAplicable?.salario_base?.toString() || "";
    }
    return "";
  }, [formData.academicRank, formData.highestDegree, formData.yearsExperience, reglas]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Limpiar error cuando el usuario comienza a escribir
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
    if (!formData.dni.trim()) newErrors.dni = "La cédula es requerida";
    if (!formData.email.trim())
      newErrors.email = "El correo electrónico es requerido";
    if (!formData.hireDate)
      newErrors.hireDate = "La fecha de contratación es requerida";
    if (!calculatedSalary)
      newErrors.baseSalary = "El salario base es requerido";

    console.log("Validation errors:", newErrors);
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
          anios_experiencia: parseInt(formData.yearsExperience) || 0,

          estado: formData.status,

          nivel_escalafon_id: parseInt(formData.academicRank),
          titulo_academico_id: parseInt(formData.highestDegree),

          fecha_ingreso: formData.hireDate,

          salario_base: parseFloat(calculatedSalary)
        };

        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        await axios.post(`${API_URL}/api/empleados/`, payload);

        // Create cestaticket record for the employee
        await axios.post(`${API_URL}/api/cestaticket/`, {
          empleado_cedula: formData.dni,
          monto: parseFloat(formData.cestaticket_monto),
        });

        toast.success("¡Empleado registrado exitosamente!");
        router.push("/employees");
      } catch (error) {
        const errorMsg = error.response?.data?.detail || "Hubo un error al registrar el empleado.";
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
      yearsExperience: "",
      hireDate: "",
      cestaticket_monto: "40",
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
                  <FormField label="Cédula" name="dni" value={formData.dni} onChange={handleChange} error={errors.dni} required placeholder="000-0000000-0" />
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
                  <FormField label="Título Académico" name="highestDegree" value={formData.highestDegree} onChange={handleChange} type="select" required>
                    <option value="" disabled>Seleccionar título</option>
                    {titulos.map((titulo) => (
                      <option key={titulo.id} value={titulo.id} className="hover:bg-primary hover:text-on-primary whitespace-nowrap">
                        {titulo.nombre}
                      </option>
                    ))}
                  </FormField>

                  <FormField label="Categoría (Escalafón)" name="academicRank" value={formData.academicRank} onChange={handleChange} type="select" required>
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
                    placeholder="0"
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
                    label="Salario Base (Mensual)"
                    name="baseSalary"
                    value={calculatedSalary}
                    onChange={handleChange}
                    error={
                      errors.baseSalary ||
                      (formData.academicRank && formData.highestDegree && formData.yearsExperience !== "" && !calculatedSalary
                        ? "No hay regla salarial para esta combinación"
                        : null)
                    }
                    required
                    prefix="RD$"
                    placeholder="Calculado automáticamente"
                    readOnly
                    className="bg-base-200/50 cursor-not-allowed"
                  />
                  <FormField
                    label="Monto Cesta Ticket"
                    name="cestaticket_monto"
                    value={formData.cestaticket_monto}
                    onChange={handleChange}
                    type="number"
                    placeholder="40"
                    min="0"
                    prefix="RD$"
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
