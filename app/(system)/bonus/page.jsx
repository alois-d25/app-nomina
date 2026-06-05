'use client';
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowTrendUp, FaArrowsRotate, FaChevronLeft, FaChevronRight, FaPlus } from "react-icons/fa6";
import { BsPeopleFill } from "react-icons/bs";
import { HiDotsVertical } from "react-icons/hi";
import { FaSearch } from "react-icons/fa";
import PayrollActionModal from "@/app/(system)/nomina/PayrollActionModal";
import Can from "@/components/Can";
import { PERMISSIONS } from "@/app/config/permissions";

const API_BASE = "";
const ITEMS_PER_PAGE = 10;

const BonusPage = () => {
    const [inputValue, setInputValue] = useState("");
    const [tab, setTab] = useState(1);
    const [bonos, setBonos] = useState([]);
    const [bonosEmpleados, setBonosEmpleados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [bonoToEdit, setBonoToEdit] = useState(null);
    const [bonoToDelete, setBonoToDelete] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [bonosRes, bonosEmpRes] = await Promise.all([
                axios.get(`${API_BASE}/api/bonos/`),
                axios.get(`${API_BASE}/api/bonos_relaciones/empleados`),
            ]);
            setBonos(bonosRes.data);
            setBonosEmpleados(bonosEmpRes.data);
        } catch (err) {
            console.error("Error cargando bonos:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSubmitBono = async (formData) => {
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
            if (bonoToEdit) {
                await axios.put(`${API_BASE}/api/bonos/${bonoToEdit.id}`, payload);
                setBonoToEdit(null);
                toast.success("Bono actualizado exitosamente");
            } else {
                await axios.post(`${API_BASE}/api/bonos/`, { ...payload, lista_empleados: selectedEmployees });
                toast.success("Bono creado exitosamente");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error("Error al guardar bono:", err);
            toast.error(err.response?.data?.detail || "No se pudo guardar el bono");
        }
    };

    const handleOpenEdit = (bono) => {
        setBonoToEdit(bono);
        setIsModalOpen(true);
    };

    const handleOpenDelete = (bono) => {
        setBonoToDelete(bono);
        document.getElementById("delete_bono_modal")?.showModal();
    };

    const handleConfirmDelete = async () => {
        try {
            await axios.delete(`${API_BASE}/api/bonos/${bonoToDelete.id}`);
            document.getElementById("delete_bono_modal")?.close();
            setBonoToDelete(null);
            fetchData();
            toast.success("Bono eliminado exitosamente");
        } catch (err) {
            console.error("Error al eliminar bono:", err);
            toast.error(err.response?.data?.detail || "No se pudo eliminar el bono");
        }
    };

    const handleTabChange = (newTab) => {
        setTab(newTab);
        setCurrentPage(1);
        setInputValue("");
    };

    const handleSearch = (e) => {
        setInputValue(e.target.value);
        setCurrentPage(1);
    };

    const filteredBonos = bonos.filter((b) =>
        inputValue === "" || b.nombre.toLowerCase().includes(inputValue.toLowerCase())
    );

    const filteredBonosEmpleados = bonosEmpleados.filter((b) => {
        if (inputValue === "") return true;
        const q = inputValue.toLowerCase();
        return b.bono_nombre.toLowerCase().includes(q) || b.empleado_nombre.toLowerCase().includes(q);
    });

    const activeData = tab === 1 ? filteredBonos : filteredBonosEmpleados;
    const totalPages = Math.ceil(activeData.length / ITEMS_PER_PAGE);
    const currentData = activeData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Reajusta la página si queda fuera de rango (ej: tras borrar el último de la página)
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages || 1);
        }
    }, [totalPages, currentPage]);

    const totalMonto = bonos.reduce((acc, b) => acc + (b.monto || 0), 0);
    const bonosRecurrentes = bonos.filter((b) => b.tipo_pago !== "Unico").length;
    const empleadosConBono = new Set(bonosEmpleados.map((b) => b.empleado_cedula)).size;

    const dataCards = [
        { title: "Total bonos", quantity: <span className="text-primary">${totalMonto.toFixed(2)}</span>, icon: <FaArrowTrendUp />, desc: "Suma de todos los bonos registrados" },
        { title: "Bonos recurrentes", quantity: bonosRecurrentes, icon: <FaArrowsRotate />, desc: "Bonos mensuales o quincenales" },
        { title: "Personal con bonos", quantity: empleadosConBono, icon: <BsPeopleFill />, desc: "Empleados con al menos un bono" },
    ];

    return (
        <>
        <div className="flex flex-col">
            <div className="flex justify-between mb-4">
                <div>
                    <h2>Gestión de bonos</h2>
                    <p className="text-lg"><span className="text-on-surface-variant">Gestionar bonos únicos y recurrentes</span></p>
                </div>
                <Can permission={PERMISSIONS.NOMINAS_CREAR}>
                    <div>
                        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><FaPlus /> Asignar bonos</button>
                    </div>
                </Can>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {dataCards.map((card, index) => (
                    <div key={index} className="bg-surface-container-lowest shadow-sm rounded-md p-4">
                        <div className="flex justify-between items-center">
                            <h3>{card.title}</h3>
                            <span className="bg-primary text-on-primary text-3xl rounded-full p-2">{card.icon}</span>
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
                            <input type="radio" name="bonus_tabs" onChange={() => handleTabChange(1)} className="tab checked:border-primary checked:text-primary" aria-label="Bonos" defaultChecked />
                            <input type="radio" name="bonus_tabs" onChange={() => handleTabChange(2)} className="tab checked:border-primary checked:text-primary" aria-label="Bonos por empleado" />
                        </div>
                        <label className="input focus-within:outline-1 focus-within:outline-outline-variant focus-within:ring-0 bg-surface-container-lowest border-outline-variant">
                            <FaSearch />
                            <input type="search" className="bg-surface-container-lowest w-55" placeholder={`Buscar ${tab === 2 ? "empleado o bono" : "bono"}`} value={inputValue} onChange={handleSearch} />
                        </label>
                    </div>
                </div>

                <div className="overflow-x-auto bg-surface-container-lowest">
                    <table className="table">
                        <thead>
                            <tr className="text-black">
                                {tab === 2 && <th>Empleado</th>}
                                <th>Bono</th>
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
                                currentData.map((bono) => (
                                    <tr key={bono.id} className="hover">
                                        <td className="font-medium">{bono.nombre}</td>
                                        <td>{bono.es_porcentaje ? `${bono.monto}%` : `$${bono.monto}`}</td>
                                        <td><span className="badge badge-soft badge-primary">{bono.tipo_pago}</span></td>
                                        <td className="text-sm opacity-70">{bono.descripcion || "—"}</td>
                                        <td className="text-sm whitespace-nowrap">{bono.created_at ? new Date(bono.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}</td>
                                        <td>
                                            <Can permission={[PERMISSIONS.NOMINAS_EDITAR, PERMISSIONS.NOMINAS_ELIMINAR]} anyOf
                                                fallback={<span className="text-sm opacity-40">—</span>}>
                                                <button className="btn btn-ghost btn-primary btn-sm" popoverTarget={`popover-bono-${bono.id}`} style={{ anchorName: `--anchor-bono-${bono.id}` }}>
                                                    <HiDotsVertical className="text-xl" />
                                                </button>
                                                <ul className="dropdown menu rounded-box bg-base-100 shadow-sm" popover="auto" id={`popover-bono-${bono.id}`} style={{ positionAnchor: `--anchor-bono-${bono.id}`, positionArea: "bottom" }}>
                                                    <Can permission={PERMISSIONS.NOMINAS_EDITAR}>
                                                        <li className="hover:bg-warning hover:text-warning-content rounded-md">
                                                            <button type="button" onClick={() => { document.getElementById(`popover-bono-${bono.id}`)?.hidePopover?.(); handleOpenEdit(bono); }}>Editar</button>
                                                        </li>
                                                    </Can>
                                                    <Can permission={PERMISSIONS.NOMINAS_ELIMINAR}>
                                                        <li className="hover:bg-error hover:text-white rounded-md">
                                                            <button type="button" onClick={() => { document.getElementById(`popover-bono-${bono.id}`)?.hidePopover?.(); handleOpenDelete(bono); }}>Eliminar</button>
                                                        </li>
                                                    </Can>
                                                </ul>
                                            </Can>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                currentData.map((be, i) => (
                                    <tr key={`${be.empleado_cedula}-${be.bono_id}-${i}`} className="hover">
                                        <td className="font-medium">{be.empleado_nombre}</td>
                                        <td>{be.bono_nombre}</td>
                                        <td>{be.es_porcentaje ? `${be.monto}%` : `$${be.monto}`}</td>
                                        <td><span className="badge badge-soft badge-primary">{be.tipo_pago}</span></td>
                                        <td className="text-sm opacity-70">{be.descripcion || "—"}</td>
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
            onClose={() => { setIsModalOpen(false); setBonoToEdit(null); }}
            onSubmit={handleSubmitBono}
            type="bono"
            editData={bonoToEdit}
            relationshipsData={bonosEmpleados}
        />

        <dialog id="delete_bono_modal" className="modal">
            <div className="modal-box">
                <h3 className="font-bold text-lg text-error">Confirmar eliminación</h3>
                <p className="py-4">
                    ¿Eliminar el bono <strong>{bonoToDelete?.nombre}</strong>?
                    <br />
                    <span className="text-sm opacity-60">También se eliminarán todas las asignaciones de este bono a empleados.</span>
                </p>
                <div className="modal-action">
                    <button className="btn" onClick={() => { document.getElementById("delete_bono_modal")?.close(); setBonoToDelete(null); }}>Cancelar</button>
                    <button className="btn btn-error" onClick={handleConfirmDelete}>Eliminar</button>
                </div>
            </div>
        </dialog>
        </>
    );
};

export default BonusPage;
