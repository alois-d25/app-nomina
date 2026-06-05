'use client';

import { useState, useEffect } from "react";
import axios from "axios";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";

const API_BASE = "";
const PAGE_SIZE = 20;

const EMPTY_FILTERS = { tabla: "", accion: "", fechaDesde: "", fechaHasta: "" };

export default function AuditLogsView() {
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    // draft: lo que el usuario escribe antes de aplicar
    const [draft, setDraft] = useState(EMPTY_FILTERS);
    // applied: lo que realmente se envía al backend
    const [applied, setApplied] = useState(EMPTY_FILTERS);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const params = new URLSearchParams({ page: currentPage, page_size: PAGE_SIZE });
            if (applied.tabla)      params.append("tabla",       applied.tabla);
            if (applied.accion)     params.append("accion",      applied.accion);
            if (applied.fechaDesde) params.append("fecha_desde", `${applied.fechaDesde}T00:00:00`);
            if (applied.fechaHasta) params.append("fecha_hasta", `${applied.fechaHasta}T23:59:59`);

            try {
                const res = await axios.get(`${API_BASE}/api/auditorias/vista/detalles?${params}`);
                setLogs(res.data.data);
                setTotal(res.data.total);
            } catch (err) {
                console.error("Error al cargar auditorías:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentPage, applied]);

    const handleApply = () => {
        setCurrentPage(1);
        setApplied({ ...draft });
    };

    const handleClear = () => {
        setDraft(EMPTY_FILTERS);
        setCurrentPage(1);
        setApplied(EMPTY_FILTERS);
    };

    const getActionBadge = (action) => {
        switch (action?.toUpperCase()) {
            case 'INSERT': return <div className="badge badge-soft badge-primary">Inserción</div>;
            case 'UPDATE': return <div className="badge badge-warning badge-soft">Modificación</div>;
            case 'DELETE': return <div className="badge badge-error badge-soft">Eliminación</div>;
            case 'LOGIN':  return <div className="badge badge-info badge-soft">Inicio sesión</div>;
            case 'LOGOUT': return <div className="badge badge-ghost badge-soft">Cierre sesión</div>;
            default:       return <div className="badge badge-info badge-soft">{action}</div>;
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h2 className="text-3xl font-bold">Registros de Auditoría</h2>
                <p className="text-base-content/60 mt-2">Historial de todas las acciones y modificaciones del sistema.</p>
            </div>

            {/* Filtros */}
            <section className="card bg-surface-container-lowest shadow-sm border border-base-300 mb-6">
                <div className="card-body p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div className="form-control">
                            <label className="label pb-1"><span className="label-text font-medium">Tabla afectada</span></label>
                            <input
                                className="input input-bordered input-sm"
                                type="text"
                                placeholder="Ej: empleados, usuarios..."
                                value={draft.tabla}
                                onChange={(e) => setDraft((d) => ({ ...d, tabla: e.target.value }))}
                                onKeyDown={(e) => e.key === "Enter" && handleApply()}
                            />
                        </div>
                        <div className="form-control">
                            <label className="label pb-1"><span className="label-text font-medium">Acción</span></label>
                            <select
                                className="select select-bordered select-sm"
                                value={draft.accion}
                                onChange={(e) => setDraft((d) => ({ ...d, accion: e.target.value }))}
                            >
                                <option value="">Todas las acciones</option>
                                <option value="INSERT">Inserción</option>
                                <option value="UPDATE">Modificación</option>
                                <option value="DELETE">Eliminación</option>
                                <option value="LOGIN">Inicio de sesión</option>
                                <option value="LOGOUT">Cierre de sesión</option>
                            </select>
                        </div>
                        <div className="form-control">
                            <label className="label pb-1"><span className="label-text font-medium">Fecha desde</span></label>
                            <input
                                className="input input-bordered input-sm"
                                type="date"
                                value={draft.fechaDesde}
                                onChange={(e) => setDraft((d) => ({ ...d, fechaDesde: e.target.value }))}
                            />
                        </div>
                        <div className="form-control">
                            <label className="label pb-1"><span className="label-text font-medium">Fecha hasta</span></label>
                            <input
                                className="input input-bordered input-sm"
                                type="date"
                                value={draft.fechaHasta}
                                onChange={(e) => setDraft((d) => ({ ...d, fechaHasta: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                        <span className="text-xs opacity-60">{total} registro{total !== 1 ? "s" : ""} en total</span>
                        <div className="flex gap-2">
                            <button className="btn btn-ghost btn-xs" onClick={handleClear}>Limpiar</button>
                            <button className="btn btn-primary btn-sm" onClick={handleApply}>Buscar</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tabla */}
            <section className="card bg-surface-container-lowest shadow-sm border border-base-300 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Fecha y Hora</th>
                                <th>Usuario Responsable</th>
                                <th>Acción</th>
                                <th>Módulo / Tabla</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-10">
                                        <span className="loading loading-spinner loading-sm"></span>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-10 text-base-content/50">
                                        No se encontraron registros que coincidan con los filtros.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover">
                                        <td className="font-mono text-xs opacity-70">#{log.id}</td>
                                        <td className="whitespace-nowrap text-xs">
                                            {new Date(log.fecha).toLocaleString('es-ES', {
                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit', second: '2-digit'
                                            })}
                                        </td>
                                        <td className="text-xs font-semibold">{log.usuario_nombre}</td>
                                        <td>{getActionBadge(log.accion)}</td>
                                        <td className="text-xs font-medium">{log.tabla_afectada}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                <div className="card-body p-4 bg-base-200/50 border-t border-base-300">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-base-content/70">
                            {total === 0
                                ? "Sin resultados"
                                : `Mostrando ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, total)} de ${total} registros`}
                        </div>
                        <div className="join">
                            <button
                                className="join-item btn btn-sm"
                                disabled={currentPage === 1 || loading}
                                onClick={() => setCurrentPage((p) => p - 1)}
                            >
                                <FaChevronLeft />
                            </button>
                            <button className="join-item btn btn-sm btn-primary">
                                {currentPage} de {totalPages || 1}
                            </button>
                            <button
                                className="join-item btn btn-sm"
                                disabled={currentPage >= totalPages || loading}
                                onClick={() => setCurrentPage((p) => p + 1)}
                            >
                                <FaChevronRight />
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
