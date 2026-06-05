"use client";
import { useState, useEffect } from "react";
import { FaPlus, FaSearch } from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import RuleModal from "./ruleModal";
import { toast } from "react-toastify";
import axios from "axios";
import { useRouter } from "next/navigation";
import Can from "@/components/Can";
import { PERMISSIONS } from "@/app/config/permissions";

const itemsPerPage = 5; 

const SalaryRules = ({rulesData, titulos, escalafones}) => {
    const [rules, setRules] = useState(rulesData);
    
    // 2. Estados para filtros y paginación
    const [statusFilter, setStatusFilter] = useState("");
    const [inputValue, setInputValue] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    // 3. Estados para Modales
    const [ruleToEdit, setRuleToEdit] = useState(null);
    const [ruleToDelete, setRuleToDelete] = useState(null);
    const router = useRouter();

    const API_URL = "";
    
    const refrescarReglas = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/reglas_escalafon/vista/detalles`);
            setRules(res.data);
            router.refresh(); 
        } catch (error) {
            console.error("Error recargando reglas:", error);
        }
    };

    const handleToggleStatus = async (rule) => {
        try {
            const nuevoEstado = !rule.activa;
            document.getElementById(`popover-${rule.id}`)?.hidePopover?.();

            await axios.put(`${API_URL}/api/reglas_escalafon/${rule.id}`, {
                salario_base: rule.salario_base,
                activa: nuevoEstado
            });

            await refrescarReglas();
            router.refresh(); 
            toast.success(`Regla ${nuevoEstado ? "activada" : "desactivada"}`);
        } catch (error) {
            toast.error("Error al cambiar el estado de la regla.");
        }
    };

    const handleDelete = async () => {
        if (!ruleToDelete) return;
        try {
            await axios.delete(`${API_URL}/api/reglas_escalafon/${ruleToDelete.id}`);
            setRules((prev) => prev.filter((r) => r.id !== ruleToDelete.id));
            router.refresh(); 
            toast.success("Regla eliminada exitosamente");
        } catch (error) {
            toast.error("No se pudo eliminar la regla. Podría estar en uso.");
        } finally {
            document.getElementById("delete_rule_modal")?.close();
            setRuleToDelete(null);
        }
    };

    const openAddModal = () => {
        setRuleToEdit(null);
        document.getElementById("rule_modal")?.showModal();
    };

    const openEditModal = (rule) => {
        setRuleToEdit(rule);
        document.getElementById(`popover-${rule.id}`)?.hidePopover?.();
        document.getElementById("rule_modal")?.showModal();
    };

    const openDeleteModal = (rule) => {
        setRuleToDelete(rule);
        document.getElementById(`popover-${rule.id}`)?.hidePopover?.();
        document.getElementById("delete_rule_modal")?.showModal();
    };

    const filteredData = rules.filter((emp) => {
        const matchesSearch =
            inputValue === "" ||
            `${emp.nivel_escalafon_nombre}`.toLowerCase().includes(inputValue.toLowerCase()) ||
            `${emp.titulo_academico_nombre}`.toLowerCase().includes(inputValue.toLowerCase())
    
        const matchesStatus =
            statusFilter === "" ||
            emp.activa.toString() === statusFilter;
    
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    // Reajusta la página si queda fuera de rango (ej: tras borrar el último de la página)
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages || 1);
        }
    }, [totalPages, currentPage]);

    const currentRules = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2>Escala y reglas salariales</h2>
                    <p className="text-lg "><span className="text-on-surface-variant">Configure rangos académicos y salarios base</span></p>
                </div>
                <Can permission={PERMISSIONS.NOMINAS_CREAR}>
                    <div>
                        <button className="btn btn-primary whitespace-nowrap" onClick={openAddModal}>
                            <FaPlus/> Añadir regla
                        </button>
                    </div>
                </Can>
            </div>

            <div className="flex flex-col mt-4 shadow-md rounded-md border border-outline-variant">
                <div className="flex px-4 py-2 justify-between items-center bg-surface-container-low) rounded-md">
                    <label className="input focus-within:outline-1 focus-within:outline-outline-variant focus-within:ring-0 bg-surface-container-lowest border-outline-variant">
                        <FaSearch />
                        <input type="search" className="bg-surface-container-lowest" placeholder="Buscar por titulo o rango" value={inputValue} onChange={(e) => setInputValue(e.target.value)}/>
                    </label>

                    <div className="flex gap-2">
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select focus-within:outline-1 focus-within:outline-outline-variant focus-within:ring-0 bg-surface-container-lowest border-outline-variant">
                            <option className="hover:bg-primary hover:text-on-primary whitespace-nowrap" value={""}>Todos los estados</option>
                            <option className="hover:bg-primary hover:text-on-primary" value={'true'}>Activo</option>
                            <option className="hover:bg-primary hover:text-on-primary" value={"false"}>Inactivo</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto bg-surface-container-lowest rounded-b-md ">
                    <table className="table">
                        {/* head */}
                        <thead>
                            <tr className="text-black">
                                <th>Escalafón / Título</th>
                                <th>Salario base</th>
                                <th>Años experiencia</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                currentRules.map((rule,index) => (
                                    <tr key={index}>
                                        <td>
                                            <div className="flex flex-col">
                                                <div className="font-bold">{rule.nivel_escalafon_nombre}</div>
                                                <div className="text-sm opacity-50">{rule.titulo_academico_nombre}</div>
                                            </div>
                                        </td>
                                        <td>${rule.salario_base}</td>
                                        <td>Mínimo: {rule.anios_min}, máximo: {rule.anios_max} años</td>
                                        <td><div className={`badge badge-soft ${rule.activa ? "badge-primary" : "badge-error"}`}>{rule.activa? "Activo":"Inactivo"}</div></td>
                                        <td>
                                            <Can permission={[PERMISSIONS.NOMINAS_EDITAR, PERMISSIONS.NOMINAS_ELIMINAR]} anyOf
                                                fallback={<span className="text-sm opacity-40">—</span>}>
                                                <button className="btn btn-ghost btn-primary" popoverTarget={`popover-${rule.id}`} style={{ anchorName: `--anchor-${rule.id}` }}>
                                                    <HiDotsVertical className="text-xl"/>
                                                </button>
                                                <ul
                                                    className="dropdown menu rounded-box bg-base-100 shadow-sm"
                                                    popover="auto"
                                                    id={`popover-${rule.id}`}
                                                    style={{ positionAnchor: `--anchor-${rule.id}`, positionArea: "bottom" }}
                                                >
                                                <Can permission={PERMISSIONS.NOMINAS_EDITAR}>
                                                    <li className="hover:bg-primary hover:text-on-primary rounded-md">
                                                        <button type="button" onClick={() => handleToggleStatus(rule)}>
                                                            {rule.activa ? "Desactivar" : "Activar"}
                                                        </button>
                                                    </li>
                                                    <li className="hover:bg-warning hover:text-warning-content rounded-md">
                                                        <button type="button" onClick={() => openEditModal(rule)}>Editar</button>
                                                    </li>
                                                </Can>
                                                <Can permission={PERMISSIONS.NOMINAS_ELIMINAR}>
                                                    <li className="hover:bg-error hover:text-white rounded-md">
                                                        <button type="button" onClick={() => openDeleteModal(rule)}>Eliminar</button>
                                                    </li>
                                                </Can>
                                            </ul>
                                            </Can>
                                        </td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>
                </div>

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

            <RuleModal 
                ruleToEdit={ruleToEdit} 
                titulos={titulos} 
                escalafones={escalafones} 
                onClose={() => setRuleToEdit(null)} 
                onRuleSaved={refrescarReglas} 
            />

            <dialog id="delete_rule_modal" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg text-error">Confirmar Eliminación</h3>
                    <p className="py-4">¿Está seguro que desea eliminar la regla de <strong>{ruleToDelete?.nivel_escalafon_nombre} ({ruleToDelete?.titulo_academico_nombre})</strong>?</p>
                    <p className="text-sm opacity-70">Esta acción no se puede deshacer.</p>
                    <div className="modal-action">
                        <button className="btn" onClick={() => { document.getElementById("delete_rule_modal")?.close(); setRuleToDelete(null); }}>Cancelar</button>
                        <button className="btn btn-error" onClick={handleDelete}>Eliminar</button>
                    </div>
                </div>
            </dialog>
        </div>
    )
}

export default SalaryRules;