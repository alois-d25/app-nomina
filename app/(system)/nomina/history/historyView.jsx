"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FaChevronLeft, FaChevronRight, FaArrowLeft } from "react-icons/fa6";
import { FaMagnifyingGlass } from "react-icons/fa6";

const itemsPerPage = 5;

const formatBs = (valor) =>
    new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(valor || 0));

const formatUsd = (valor) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(valor || 0));

const formatFecha = (iso) => {
    if (!iso) return "—";
    return new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
};

export default function NominaHistoryView({ historial }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const filteredData = historial.filter((nomina) => {
        if (searchQuery === "") return true;
        const q = searchQuery.toLowerCase();
        return (
            String(nomina.id).includes(q) ||
            String(nomina.fecha_pago).includes(q)
        );
    });

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    // Reajusta la página si queda fuera de rango (ej: al filtrar)
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages || 1);
        }
    }, [totalPages, currentPage]);

    const currentRecords = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/nomina" className="btn btn-ghost btn-circle" aria-label="Volver a nóminas">
                        <FaArrowLeft className="text-xl" />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold text-base-content">Historial de nóminas</h2>
                        <p className="text-sm text-base-content/70 mt-1">
                            Todas las nóminas generadas con sus totales y la tasa utilizada.
                        </p>
                    </div>
                </div>
                <Link href="/nomina" className="btn btn-primary">
                    <FaArrowLeft /> Volver a nóminas
                </Link>
            </div>

            {/* Main Card */}
            <div className="card bg-surface-container-lowest rounded-md shadow-xl">
                {/* Toolbar */}
                <div className="card-body p-4 bg-surface-container-lowest rounded-md">
                    <div className="form-control w-full lg:w-96">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                placeholder="Buscar por ID o fecha..."
                                className="input input-bordered w-full pl-10"
                            />
                            <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr className="bg-base-200">
                                <th>ID</th>
                                <th>Fecha de pago</th>
                                <th>Empleados</th>
                                <th>Total (Bs.)</th>
                                <th>Total (USD)</th>
                                <th>Tasa usada</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-10 text-base-content/50">
                                        No hay nóminas registradas.
                                    </td>
                                </tr>
                            ) : (
                                currentRecords.map((nomina) => (
                                    <tr key={nomina.id} className="hover">
                                        <td className="font-mono">#{nomina.id}</td>
                                        <td>{formatFecha(nomina.fecha_pago)}</td>
                                        <td>{nomina.total_empleados}</td>
                                        <td className="font-medium">{nomina.monto_total_bs != null ? `Bs. ${formatBs(nomina.monto_total_bs)}` : "—"}</td>
                                        <td className="font-medium">{nomina.monto_total_usd != null ? formatUsd(nomina.monto_total_usd) : "—"}</td>
                                        <td>
                                            <div className="badge badge-outline badge-primary">
                                                {nomina.tasa_dolar ? `Bs. ${formatBs(nomina.tasa_dolar)}` : "—"}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="card-body p-4 bg-base-200/50 border-t border-base-300">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-base-content/70">
                            Mostrando {filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredData.length)} de{" "}
                            {filteredData.length} registros
                        </div>
                        <div className="join">
                            <button
                                className="join-item btn btn-sm"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                            >
                                <FaChevronLeft />
                            </button>
                            <button className="join-item btn btn-sm btn-primary">{currentPage} de {totalPages || 1}</button>
                            <button
                                className="join-item btn btn-sm"
                                disabled={currentPage >= totalPages || totalPages === 0}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                            >
                                <FaChevronRight />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
