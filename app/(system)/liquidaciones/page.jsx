"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-toastify";
import { FaPlus, FaChevronLeft, FaChevronRight, FaEye, FaCheck, FaCircleCheck } from "react-icons/fa6";

const ITEMS_PER_PAGE = 10;

export default function LiquidacionesPage() {
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [approvingId, setApprovingId] = useState(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  const fetchLiquidaciones = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/liquidaciones/`);
      setLiquidaciones(response.data?.liquidaciones || []);
    } catch (error) {
      console.error("Error fetching liquidaciones:", error);
      toast.error("Error al cargar liquidaciones");
      setLiquidaciones([]);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchLiquidaciones();
  }, [fetchLiquidaciones]);

  const handleApprove = async (liquidacionId) => {
    if (!window.confirm("¿Está seguro de aprobar esta liquidación? El empleado será marcado como inactivo.")) {
      return;
    }

    setApprovingId(liquidacionId);
    try {
      await axios.post(`${API_URL}/api/liquidaciones/${liquidacionId}/approve`);
      toast.success("Liquidación aprobada exitosamente");
      fetchLiquidaciones();
    } catch (error) {
      console.error("Error approving liquidacion:", error);
      toast.error("Error al aprobar liquidación");
    } finally {
      setApprovingId(null);
    }
  };

  const filteredLiquidaciones = liquidaciones.filter((liq) => {
    const matchEstado = !filtroEstado || liq.estado === filtroEstado;
    const matchBusqueda =
      !busqueda ||
      liq.empleado_cedula.toLowerCase().includes(busqueda.toLowerCase());
    return matchEstado && matchBusqueda;
  });

  const totalPages = Math.ceil(filteredLiquidaciones.length / ITEMS_PER_PAGE);
  const currentLiquidaciones = filteredLiquidaciones.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-base-content my-5">
              Liquidaciones
            </h2>
            <p className="text-sm text-base-content/70 mt-1">
              Gestione liquidaciones finales de empleados.
            </p>
          </div>
          <Link href="/liquidaciones/create" className="btn btn-primary">
            <FaPlus />
            Nueva Liquidación
          </Link>
        </div>

        {/* Filters */}
        <div className="card bg-surface-container-lowest rounded-md shadow-xl mb-6">
          <div className="card-body p-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="form-control flex-1">
                <input
                  type="text"
                  placeholder="Buscar por cédula de empleado..."
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="input input-bordered w-full"
                />
              </div>
              <select
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value);
                  setCurrentPage(1);
                }}
                className="select select-bordered w-full md:w-48"
              >
                <option value="">Todos los estados</option>
                <option value="Borrador">Borrador</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Aprobada">Aprobada</option>
                <option value="Completada">Completada</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card bg-surface-container-lowest rounded-md shadow-xl">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-base-content/50">Cargando liquidaciones...</p>
            </div>
          ) : currentLiquidaciones.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-base-content/50">
                {liquidaciones.length === 0
                  ? "No hay liquidaciones registradas."
                  : "No se encontraron liquidaciones que coincidan con los filtros."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr className="bg-base-200">
                      <th>Cédula Empleado</th>
                      <th>Fecha Egreso</th>
                      <th>Años Totales</th>
                      <th>Monto BS</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentLiquidaciones.map((liq) => (
                      <tr key={liq.liquidacion_id} className="hover">
                        <td>{liq.empleado_cedula}</td>
                        <td>{new Date(liq.fecha_egreso).toLocaleDateString("es-ES")}</td>
                        <td>{Number(liq.anios_totales).toFixed(2)}</td>
                        <td className="font-mono">
                          {parseFloat(liq.monto_neto_bs ?? liq.monto_total_bs).toFixed(2)} Bs
                        </td>
                        <td>
                          <span className={`badge badge-sm ${getEstadoBadgeColor(liq.estado)}`}>
                            {liq.estado}
                          </span>
                        </td>
                        <td className="space-x-2">
                          <Link
                            href={`/liquidaciones/${liq.liquidacion_id}`}
                            className="btn btn-ghost btn-sm"
                          >
                            <FaEye />
                          </Link>
                          {liq.estado === "Borrador" && (
                            <button
                              onClick={() => handleApprove(liq.liquidacion_id)}
                              disabled={approvingId === liq.liquidacion_id}
                              className="btn btn-success btn-sm"
                            >
                              <FaCircleCheck />
                              {approvingId === liq.liquidacion_id ? "Aprobando..." : ""}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="card-body p-4 bg-base-200/50 border-t border-base-300">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-base-content/70">
                    Mostrando {filteredLiquidaciones.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} a{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredLiquidaciones.length)} de{" "}
                    {filteredLiquidaciones.length} registros
                  </div>
                  <div className="join">
                    <button
                      className="join-item btn btn-sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      <FaChevronLeft />
                    </button>
                    <button className="join-item btn btn-sm btn-primary">
                      {currentPage} de {totalPages || 1}
                    </button>
                    <button
                      className="join-item btn btn-sm"
                      disabled={currentPage >= totalPages || totalPages === 0}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
