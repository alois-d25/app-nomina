'use client';
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import PayrollActionModal from "@/app/(system)/nomina/PayrollActionModal";
import Can from "@/components/Can";
import { PERMISSIONS } from "@/app/config/permissions";
import { FaArrowTrendDown, FaArrowsRotate, FaChevronLeft, FaChevronRight, FaPlus, FaLock } from "react-icons/fa6";
import { BsPeopleFill } from "react-icons/bs";
import { HiDotsVertical } from "react-icons/hi";
import { FaSearch } from "react-icons/fa";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ITEMS_PER_PAGE = 10;

// Deducciones de ley (IVSS, LPH, Paro Forzoso/SPF, FAOV): no pueden editarse ni eliminarse.
const DEDUCCIONES_LEGALES = new Set(["ivss", "lph", "spf", "faov"]);
const esDeduccionLegal = (ded) =>
    DEDUCCIONES_LEGALES.has(String(ded?.formula_calculo || "").toLowerCase()) ||
    DEDUCCIONES_LEGALES.has(String(ded?.nombre || "").toLowerCase());

const DeductionsPage = () => {
    const [inputValue, setInputValue] = useState("");
    const [tab, setTab] = useState(1);
    const [deducciones, setDeducciones] = useState([]);
    const [deduccionesEmpleados, setDeduccionesEmpleados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deduccionToEdit, setDeduccionToEdit] = useState(null);
    const [deduccionToDelete, setDeduccionToDelete] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [deduccionesRes, deduccionesEmpRes] = await Promise.all([
                axios.get(`${API_BASE}/api/deducciones/`),
                axios.get(`${API_BASE}/api/deducciones_relaciones/empleados`),
            ]);
            setDeducciones(deduccionesRes.data);
            setDeduccionesEmpleados(deduccionesEmpRes.data);
        } catch (err) {
            console.error("Error cargando deducciones:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSubmitDeduccion = async (formData) => {
        try {
            const { selectedEmployees, type, ...data } = formData;
            const payload = {
                nombre: data.nombre,
                monto: parseFloat(data.monto),
                es_porcentaje: data.es_porcentaje,
                descripcion: data.descripcion || "",
                observacion: data.observacion || null,
                tipo_pago: data.tipo_pago,
                fecha: data.fecha || null,
            };
            if (deduccionToEdit) {
                await axios.put(`${API_BASE}/api/deducciones/${deduccionToEdit.id}`, payload);
                setDeduccionToEdit(null);
                toast.success("Deducción actualizada exitosamente");
            } else {
                await axios.post(`${API_BASE}/api/deducciones/`, { ...payload, lista_empleados: selectedEmployees });
                toast.success("Deducción creada exitosamente");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error("Error al guardar deducción:", err);
            toast.error(err.response?.data?.detail || "No se pudo guardar la deducción");
        }
    };

    const handleOpenEdit = (ded) => {
        setDeduccionToEdit(ded);
        setIsModalOpen(true);
    };

    const handleOpenDelete = (ded) => {
        setDeduccionToDelete(ded);
        document.getElementById("delete_deduccion_modal")?.showModal();
    };

    const handleConfirmDelete = async () => {
        try {
            await axios.delete(`${API_BASE}/api/deducciones/${deduccionToDelete.id}`);
            document.getElementById("delete_deduccion_modal")?.close();
            setDeduccionToDelete(null);
            fetchData();
            toast.success("Deducción eliminada exitosamente");
        } catch (err) {
            console.error("Error al eliminar deducción:", err);
            toast.error(err.response?.data?.detail || "No se pudo eliminar la deducción");
        }
    };

    const handleTabChange = (newTab) => { setTab(newTab); setCurrentPage(1); setInputValue(""); };
    const handleSearch = (e) => { setInputValue(e.target.value); setCurrentPage(1); };

    const filteredDeducciones = deducciones.filter((d) =>
        inputValue === "" || String(d.nombre).toLowerCase().includes(inputValue.toLowerCase())
    );
    const filteredDeduccionesEmpleados = deduccionesEmpleados.filter((d) => {
        if (inputValue === "") return true;
        const q = inputValue.toLowerCase();
        return d.deduccion_nombre.toLowerCase().includes(q) || d.empleado_nombre.toLowerCase().includes(q);
    });

    const activeData = tab === 1 ? filteredDeducciones : filteredDeduccionesEmpleados;
    const totalPages = Math.ceil(activeData.length / ITEMS_PER_PAGE);
    const currentData = activeData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Reajusta la página si queda fuera de rango (ej: tras borrar el último de la página)
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages || 1);
        }
    }, [totalPages, currentPage]);

    const totalMonto = deducciones.reduce((acc, d) => acc + (d.monto || 0), 0);
    const deduccionesRecurrentes = deducciones.filter((d) => d.tipo_pago !== "Unico").length;
    const empleadosConDeduccion = new Set(deduccionesEmpleados.map((d) => d.empleado_cedula)).size;

    const dataCards = [
        { title: "Total deducciones", quantity: <span className="text-error">${totalMonto.toFixed(2)}</span>, icon: <span className="bg-error text-on-primary text-3xl rounded-full p-2"><FaArrowTrendDown /></span>, desc: "Suma de todas las deducciones registradas" },
        { title: "Deducciones recurrentes", quantity: deduccionesRecurrentes, icon: <span className="bg-primary text-on-primary text-3xl rounded-full p-2"><FaArrowsRotate /></span>, desc: "Deducciones mensuales o quincenales" },
        { title: "Personal con deducciones", quantity: empleadosConDeduccion, icon: <span className="bg-primary text-on-primary text-3xl rounded-full p-2"><BsPeopleFill /></span>, desc: "Empleados con al menos una deducción" },
    ];

    return (
        <>
        <div className="flex flex-col">
            <div className="flex justify-between mb-4">
                <div>
                    <h2>Gestión de deducciones</h2>
                    <p className="text-lg"><span className="text-on-surface-variant">Gestionar deducciones únicas y recurrentes</span></p>
                </div>
                <Can permission={PERMISSIONS.NOMINAS_CREAR}>
                    <div>
                        <button className="btn btn-error" onClick={() => setIsModalOpen(true)}><FaPlus /> Aplicar deducciones</button>
                    </div>
                </Can>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {dataCards.map((card, index) => (
                    <div key={index} className="bg-surface-container-lowest shadow-sm rounded-md p-4">
                        <div className="flex justify-between items-center gap-1">
                            <h3>{card.title}</h3>
                            {card.icon}
                        </div>
                        <h2 className="mt-2">{loading ? <span className="loading loading-dots loading-sm" /> : card.quantity}</h2>
                        <div className="divider my-0"></div>
                        <span className="text-on-surface-variant">{card.desc}</span>
                    </div>
                ))}
            </div>

            <div className="mt-4 flex flex-col shadow-md rounded-md border border-outline-variant">
                <div className="flex px-4 py-2 justify-between items-center bg-(--surface-container-low) rounded-md">
                    <div className="flex flex-row w-full justify-between items-center">
                        <div className="tabs tabs-border border-primary">
                            <input type="radio" name="deductions_tabs" onChange={() => handleTabChange(1)} className="tab checked:border-primary checked:text-primary" aria-label="Deducción" defaultChecked />
                            <input type="radio" name="deductions_tabs" onChange={() => handleTabChange(2)} className="tab checked:border-primary checked:text-primary" aria-label="Deducción por empleado" />
                        </div>
                        <label className="input focus-within:outline-1 focus-within:outline-outline-variant focus-within:ring-0 bg-surface-container-lowest border-outline-variant">
                            <FaSearch />
                            <input type="search" className="bg-surface-container-lowest w-55" placeholder={`Buscar ${tab === 2 ? "empleado o deducción" : "deducción"}`} value={inputValue} onChange={handleSearch} />
                        </label>
                    </div>
                </div>

                <div className="overflow-x-auto bg-surface-container-lowest rounded-b-md">
                    <table className="table">
                        <thead>
                            <tr className="text-black">
                                {tab === 2 && <th>Empleado</th>}
                                <th>Deducción</th>
                                <th>Monto</th>
                                <th>Tipo de pago</th>
                                <th>Descripción</th>
                                {tab === 1 && <th>Creado</th>}
                                {tab === 1 && <th>Acciones</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-8"><span className="loading loading-spinner loading-sm" /></td></tr>
                            ) : currentData.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-base-content/50">No se encontraron registros.</td></tr>
                            ) : tab === 1 ? (
                                currentData.map((ded) => (
                                    <tr key={ded.id} className="hover">
                                        <td className="font-medium">{String(ded.nombre)}</td>
                                        <td>{ded.es_porcentaje ? `${ded.monto}%` : `$${ded.monto}`}</td>
                                        <td><span className="badge badge-soft badge-error">{ded.tipo_pago}</span></td>
                                        <td className="text-sm opacity-70">{ded.descripcion || "—"}</td>
                                        <td className="text-sm whitespace-nowrap">{ded.created_at ? new Date(ded.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}</td>
                                        <td>
                                            {esDeduccionLegal(ded) ? (
                                                <span className="badge badge-soft badge-neutral gap-1" title="Deducción de ley: no editable ni eliminable">
                                                    <FaLock className="text-xs" /> De ley
                                                </span>
                                            ) : (
                                            <Can permission={[PERMISSIONS.NOMINAS_EDITAR, PERMISSIONS.NOMINAS_ELIMINAR]} anyOf
                                                fallback={<span className="text-sm opacity-40">—</span>}>
                                                <button className="btn btn-ghost btn-primary btn-sm" popoverTarget={`popover-ded-${ded.id}`} style={{ anchorName: `--anchor-ded-${ded.id}` }}>
                                                    <HiDotsVertical className="text-xl" />
                                                </button>
                                                <ul className="dropdown menu rounded-box bg-base-100 shadow-sm" popover="auto" id={`popover-ded-${ded.id}`} style={{ positionAnchor: `--anchor-ded-${ded.id}`, positionArea: "bottom" }}>
                                                    <Can permission={PERMISSIONS.NOMINAS_EDITAR}>
                                                        <li className="hover:bg-warning hover:text-warning-content rounded-md">
                                                            <button type="button" onClick={() => { document.getElementById(`popover-ded-${ded.id}`)?.hidePopover?.(); handleOpenEdit(ded); }}>Editar</button>
                                                        </li>
                                                    </Can>
                                                    <Can permission={PERMISSIONS.NOMINAS_ELIMINAR}>
                                                        <li className="hover:bg-error hover:text-white rounded-md">
                                                            <button type="button" onClick={() => { document.getElementById(`popover-ded-${ded.id}`)?.hidePopover?.(); handleOpenDelete(ded); }}>Eliminar</button>
                                                        </li>
                                                    </Can>
                                                </ul>
                                            </Can>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                currentData.map((de, i) => (
                                    <tr key={`${de.empleado_cedula}-${de.deduccion_id}-${i}`} className="hover">
                                        <td className="font-medium">{de.empleado_nombre}</td>
                                        <td>{de.deduccion_nombre}</td>
                                        <td>{de.es_porcentaje ? `${de.monto}%` : `$${de.monto}`}</td>
                                        <td><span className="badge badge-soft badge-error">{de.tipo_pago}</span></td>
                                        <td className="text-sm opacity-70">{de.descripcion || "—"}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="card-body p-4 bg-base-200/50 border-t border-base-300">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-base-content/70">
                            {activeData.length === 0 ? "Sin resultados" : `Mostrando ${(currentPage - 1) * ITEMS_PER_PAGE + 1} a ${Math.min(currentPage * ITEMS_PER_PAGE, activeData.length)} de ${activeData.length} registros`}
                        </div>
                        <div className="join">
                            <button className="join-item btn btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}><FaChevronLeft /></button>
                            <button className="join-item btn btn-sm btn-primary">{currentPage} de {totalPages || 1}</button>
                            <button className="join-item btn btn-sm" disabled={currentPage >= totalPages || totalPages === 0} onClick={() => setCurrentPage((p) => p + 1)}><FaChevronRight /></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <PayrollActionModal
            isOpen={isModalOpen}
            onClose={() => { setIsModalOpen(false); setDeduccionToEdit(null); }}
            onSubmit={handleSubmitDeduccion}
            type="deduccion"
            editData={deduccionToEdit}
            relationshipsData={deduccionesEmpleados}
        />

        <dialog id="delete_deduccion_modal" className="modal">
            <div className="modal-box">
                <h3 className="font-bold text-lg text-error">Confirmar eliminación</h3>
                <p className="py-4">
                    ¿Eliminar la deducción <strong>{deduccionToDelete ? String(deduccionToDelete.nombre) : ""}</strong>?
                    <br />
                    <span className="text-sm opacity-60">También se eliminarán todas las asignaciones de esta deducción a empleados.</span>
                </p>
                <div className="modal-action">
                    <button className="btn" onClick={() => { document.getElementById("delete_deduccion_modal")?.close(); setDeduccionToDelete(null); }}>Cancelar</button>
                    <button className="btn btn-error" onClick={handleConfirmDelete}>Eliminar</button>
                </div>
            </div>
        </dialog>
        </>
    );
};

export default DeductionsPage;
