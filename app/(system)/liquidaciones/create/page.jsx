"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft, FaCalculator } from "react-icons/fa6";
import Link from "next/link";

export default function CreateLiquidacionPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const [step, setStep] = useState(1); // 1: Input, 2: Draft Review, 3: Confirmation
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);

  const [formData, setFormData] = useState({
    empleado_cedula: "",
    fecha_egreso: "",
    causa_egreso: "",
  });

  const [draftData, setDraftData] = useState(null);

  // Fetch employees on component mount
  useEffect(() => {
    const fetchEmpleados = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/empleados/`);
        setEmpleados(response.data || []);
      } catch (error) {
        console.error("Error fetching empleados:", error);
        toast.error("Error al cargar empleados");
      }
    };
    fetchEmpleados();
  }, [API_URL]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCalculateDraft = async () => {
    if (!formData.empleado_cedula || !formData.fecha_egreso || !formData.causa_egreso) {
      toast.error("Por favor complete todos los campos");
      return;
    }

    setDraftLoading(true);
    try {
      // For now, we'll create with the basic data
      // Full calculation would fetch nomina history, loans, etc.
      const empleado = empleados.find((e) => e.cedula === formData.empleado_cedula);
      if (!empleado) {
        toast.error("Empleado no encontrado");
        return;
      }

      // Calculate years of service
      const fechaIngreso = new Date(empleado.fecha_ingreso);
      const fechaEgreso = new Date(formData.fecha_egreso);
      const aniosTotales = Math.floor(
        (fechaEgreso - fechaIngreso) / (1000 * 60 * 60 * 24 * 365)
      );

      // TODO: Fetch actual nomina history and calculate real amounts
      // For now, use a simple calculation
      const salarioBase = parseFloat(empleado.salario_base) || 0;
      const montoTotalBs = salarioBase * aniosTotales;
      const exchangeRate = 36.5; // TODO: Fetch current exchange rate
      const montoTotalUsd = montoTotalBs / exchangeRate;

      setDraftData({
        empleado_cedula: formData.empleado_cedula,
        fecha_egreso: formData.fecha_egreso,
        anios_totales: aniosTotales,
        monto_total_bs: montoTotalBs.toFixed(2),
        monto_total_usd: montoTotalUsd.toFixed(2),
        causa_egreso: formData.causa_egreso,
        empleado_nombre: `${empleado.nombre} ${empleado.apellido}`,
        salario_base: salarioBase.toFixed(2),
      });

      setStep(2);
    } catch (error) {
      console.error("Error calculating draft:", error);
      toast.error("Error al calcular liquidación");
    } finally {
      setDraftLoading(false);
    }
  };

  const handleCreateLiquidacion = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/liquidaciones/`, {
        empleado_cedula: formData.empleado_cedula,
        fecha_egreso: formData.fecha_egreso,
        causa_egreso: formData.causa_egreso,
        anios_totales: draftData.anios_totales,
        monto_total_bs: parseFloat(draftData.monto_total_bs),
        monto_total_usd: parseFloat(draftData.monto_total_usd),
        estado: "Borrador",
      });

      toast.success("Liquidación creada exitosamente");
      router.push(`/liquidaciones/${response.data.id}`);
    } catch (error) {
      console.error("Error creating liquidacion:", error);
      toast.error("Error al crear liquidación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/liquidaciones" className="btn btn-ghost btn-sm">
            <FaArrowLeft /> Volver
          </Link>
          <h2 className="text-2xl font-bold text-base-content">
            Nueva Liquidación
          </h2>
        </div>

        <div className="card bg-surface-container-lowest rounded-md shadow-xl">
          <div className="card-body space-y-6">
            {/* Step Indicator */}
            <div className="steps w-full">
              <div className={`step ${step >= 1 ? "step-primary" : ""}`}>
                Información
              </div>
              <div className={`step ${step >= 2 ? "step-primary" : ""}`}>
                Revisar Cálculo
              </div>
              <div className={`step ${step >= 3 ? "step-primary" : ""}`}>
                Confirmar
              </div>
            </div>

            {/* Step 1: Input */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Información de Egreso</h3>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Empleado</span>
                  </label>
                  <select
                    name="empleado_cedula"
                    value={formData.empleado_cedula}
                    onChange={handleInputChange}
                    className="select select-bordered w-full"
                  >
                    <option value="">Seleccionar empleado...</option>
                    {empleados.map((emp) => (
                      <option key={emp.cedula} value={emp.cedula}>
                        {emp.cedula} - {emp.nombre} {emp.apellido}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Fecha de Egreso</span>
                  </label>
                  <input
                    type="date"
                    name="fecha_egreso"
                    value={formData.fecha_egreso}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Causa de Egreso</span>
                  </label>
                  <select
                    name="causa_egreso"
                    value={formData.causa_egreso}
                    onChange={handleInputChange}
                    className="select select-bordered w-full"
                  >
                    <option value="">Seleccionar causa...</option>
                    <option value="Renuncia">Renuncia</option>
                    <option value="Despido">Despido</option>
                    <option value="Fin de Contrato">Fin de Contrato</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCalculateDraft}
                    disabled={draftLoading}
                    className="btn btn-primary flex-1"
                  >
                    <FaCalculator />
                    {draftLoading ? "Calculando..." : "Calcular Liquidación"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Review Draft */}
            {step === 2 && draftData && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Revisar Cálculo</h3>

                <div className="bg-base-200/50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Empleado:</span>
                    <span className="font-semibold">{draftData.empleado_nombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cédula:</span>
                    <span className="font-semibold">{draftData.empleado_cedula}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fecha Ingreso a Egreso:</span>
                    <span className="font-semibold">{draftData.anios_totales} años</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Salario Base:</span>
                    <span className="font-semibold">Bs. {draftData.salario_base}</span>
                  </div>
                  <div className="divider my-2"></div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total (Bs):</span>
                    <span className="text-primary">Bs. {draftData.monto_total_bs}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total (USD):</span>
                    <span className="text-primary">$ {draftData.monto_total_usd}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Causa Egreso:</span>
                    <span className="font-semibold">{draftData.causa_egreso}</span>
                  </div>
                </div>

                <div className="alert alert-info">
                  <span>
                    Nota: Este cálculo es una aproximación. El monto final
                    dependerá de deducciones pendientes, préstamos y anticipos.
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="btn btn-ghost flex-1"
                  >
                    Volver
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="btn btn-primary flex-1"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {step === 3 && draftData && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Confirmar Liquidación</h3>

                <div className="alert alert-warning">
                  <span>
                    ¿Está seguro de crear esta liquidación? El empleado
                    podrá ser revisado por el administrador de nóminas.
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="btn btn-ghost flex-1"
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleCreateLiquidacion}
                    disabled={loading}
                    className="btn btn-success flex-1"
                  >
                    {loading ? "Creando..." : "Crear Liquidación"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
