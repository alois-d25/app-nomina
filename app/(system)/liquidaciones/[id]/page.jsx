"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft, FaCheck, FaDownload } from "react-icons/fa6";
import Link from "next/link";

export default function LiquidacionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const liquidacionId = params.id;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const [liquidacion, setLiquidacion] = useState(null);
  const [empleado, setEmpleado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [liqRes, empRes] = await Promise.all([
          axios.get(`${API_URL}/api/liquidaciones/${liquidacionId}`),
          axios.get(`${API_URL}/api/empleados/`),
        ]);

        setLiquidacion(liqRes.data);

        // Find the employee from the response
        const empleados = empRes.data || [];
        const emp = empleados.find((e) => e.cedula === liqRes.data.empleado_cedula);
        setEmpleado(emp);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Error al cargar la liquidación");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [liquidacionId, API_URL]);

  const handleApprove = async () => {
    if (!window.confirm("¿Está seguro de aprobar esta liquidación? El empleado será marcado como inactivo.")) {
      return;
    }

    setApproving(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/liquidaciones/${liquidacionId}/approve`
      );
      setLiquidacion(response.data);
      toast.success("Liquidación aprobada exitosamente");
      router.refresh();
    } catch (error) {
      console.error("Error approving liquidacion:", error);
      toast.error("Error al aprobar liquidación");
    } finally {
      setApproving(false);
    }
  };

  const handleExport = () => {
    // TODO: Implement export to PDF
    toast.info("Función de exportación en desarrollo");
  };

  const getEstadoBadgeColor = (estado) => {
    switch (estado) {
      case "Borrador":
        return "bg-gray-100 text-gray-800";
      case "Pendiente":
        return "bg-yellow-100 text-yellow-800";
      case "Aprobada":
        return "bg-green-100 text-green-800";
      case "Completada":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-base-content/50">Cargando liquidación...</p>
      </div>
    );
  }

  if (!liquidacion) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-error">Liquidación no encontrada</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/liquidaciones" className="btn btn-ghost btn-sm">
            <FaArrowLeft /> Volver
          </Link>
          <h2 className="text-2xl font-bold text-base-content">
            Detalle de Liquidación
          </h2>
          <span className={`badge ${getEstadoBadgeColor(liquidacion.estado)}`}>
            {liquidacion.estado}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información del Empleado */}
            <div className="card bg-surface-container-lowest rounded-md shadow-xl">
              <div className="card-body">
                <h3 className="font-semibold text-lg mb-4">
                  Información del Empleado
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Cédula:</span>
                    <span className="font-semibold">{liquidacion.empleado_cedula}</span>
                  </div>
                  {empleado && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Nombre:</span>
                        <span className="font-semibold">
                          {empleado.nombre} {empleado.apellido}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">
                          Fecha Ingreso:
                        </span>
                        <span className="font-semibold">
                          {new Date(empleado.fecha_ingreso).toLocaleDateString(
                            "es-ES"
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">
                          Salario Base:
                        </span>
                        <span className="font-semibold">
                          Bs. {parseFloat(empleado.salario_base).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Información de Egreso */}
            <div className="card bg-surface-container-lowest rounded-md shadow-xl">
              <div className="card-body">
                <h3 className="font-semibold text-lg mb-4">
                  Información de Egreso
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">
                      Fecha Egreso:
                    </span>
                    <span className="font-semibold">
                      {new Date(liquidacion.fecha_egreso).toLocaleDateString(
                        "es-ES"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">
                      Causa Egreso:
                    </span>
                    <span className="font-semibold">
                      {liquidacion.causa_egreso}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">
                      Años Totales:
                    </span>
                    <span className="font-semibold">
                      {liquidacion.anios_totales} años
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cálculo de Liquidación */}
            <div className="card bg-surface-container-lowest rounded-md shadow-xl">
              <div className="card-body">
                <h3 className="font-semibold text-lg mb-4">
                  Cálculo de Liquidación
                </h3>

                <div className="space-y-3 bg-base-200/50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <span>Monto Total (Bs):</span>
                    <span className="font-bold text-lg text-primary">
                      Bs. {parseFloat(liquidacion.monto_total_bs).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monto Total (USD):</span>
                    <span className="font-bold text-lg text-primary">
                      $ {parseFloat(liquidacion.monto_total_usd).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="alert alert-info mt-4">
                  <span>
                    Nota: Este monto es una aproximación y puede variar según
                    deducciones pendientes, préstamos y anticipos.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card bg-surface-container-lowest rounded-md shadow-xl sticky top-8">
              <div className="card-body">
                <h3 className="font-semibold text-lg mb-4">Acciones</h3>

                <div className="space-y-2">
                  {liquidacion.estado === "Borrador" && (
                    <button
                      onClick={handleApprove}
                      disabled={approving}
                      className="btn btn-success w-full"
                    >
                      <FaCheck />
                      {approving ? "Aprobando..." : "Aprobar Liquidación"}
                    </button>
                  )}

                  <button
                    onClick={handleExport}
                    className="btn btn-outline w-full"
                  >
                    <FaDownload />
                    Descargar Recibo
                  </button>

                  {liquidacion.estado === "Aprobada" && (
                    <div className="alert alert-success text-sm">
                      <span>
                        ✓ Esta liquidación ha sido aprobada. El empleado ha
                        sido marcado como inactivo.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
