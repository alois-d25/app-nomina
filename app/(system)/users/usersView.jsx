"use client";
import Link from "next/link";
import { LuUserRoundCog, LuUsers,  } from "react-icons/lu";
import { MdDevices } from "react-icons/md";
import { IoIosArrowRoundForward } from "react-icons/io";
import { HiDotsVertical } from "react-icons/hi";
import { useState, useEffect } from "react";
import { FaChevronLeft, FaChevronRight,  } from "react-icons/fa6";
import SelectionModal from "./selection_modal";
import axios from "axios";
import { toast } from "react-toastify";
import EditionModal from "./edition_modal";
import Can from "@/components/Can";
import { PERMISSIONS } from "@/app/config/permissions";

const API_BASE = "";

const UsersView = ({usersData, employeesData, userRoles}) => {
    const [statusFilter, setStatusFilter] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [userToEdit, setUserToEdit] = useState(null);
    const [inputValue, setInputValue] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [users, setUsers] = useState(usersData);
    const [empleadosDisponibles, setEmpleadosDisponibles] = useState(employeesData);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [confirmDeleteText, setConfirmDeleteText] = useState("");

    // para ir a buscar los datos al backend
    const refrescarEmpleados = async () => {
        setIsRefreshing(true);
        try {
            const res = await axios.get(`${API_BASE}/api/empleados/filtro/sin-usuario`);
            setEmpleadosDisponibles(res.data);
        } catch (error) {
            console.error("Error recargando empleados:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const refrescarUsuarios = async () => {
        const res = await axios.get(`${API_BASE}/api/usuarios/vista/detalles`);
        setUsers(res.data);
    };

    const handleUserCreated = async (empleadoCedula) => {
        setEmpleadosDisponibles((prev) => prev.filter((e) => e.cedula !== empleadoCedula));
        await refrescarUsuarios();
    };

    const handleOpenEdit = (user) => {
        setUserToEdit(user);
        document.getElementById(`popover-${user.id}`)?.hidePopover?.();
        document.getElementById("edition_modal")?.showModal();
    };

    const handleCloseEdit = () => {
        setUserToEdit(null);
    };

    const handleDelete = async () => {
        if (confirmDeleteText.toLowerCase() !== "confirmar") return;
        try {
            await axios.delete(`${API_BASE}/api/usuarios/${userToDelete.id}`);

            setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));

            document.getElementById("delete_user_modal")?.close();

            setUserToDelete(null);
            setConfirmDeleteText("");
            toast.success("Usuario eliminado exitosamente");

        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error(error.response?.data?.detail || "No se pudo eliminar el usuario");
        }
    };

    const handleToggleStatus = async (user) => {
        try {
            const nuevoEstado = !user.activo;
            
            document.getElementById(`popover-${user.id}`)?.hidePopover?.();

            await axios.put(`${API_BASE}/api/usuarios/${user.id}`, {
                activo: nuevoEstado
            });

            await refrescarUsuarios();
            toast.success(nuevoEstado ? "Usuario activado" : "Usuario desactivado");

        } catch (error) {
            console.error("Error al cambiar el estado del usuario:", error);
            toast.error("No se pudo cambiar el estado del usuario");
        }
    };

    const itemsPerPage = 5; 

    const dataCards = [
        {
            title: "Usuarios activos",
            description: "Usuarios registrados en el sistema",
            icon: <LuUsers/>,
            link: "/"
        },
        {
            title: "Sesiones activas",
            description: "Número de sesiones activas en el sistema",
            icon: <MdDevices/>,
            link: "/"
        }
    ]

    const filteredData = users.filter((user) => {
        const matchesRole = 
            roleFilter === "" ||
            user.rol_nombre === roleFilter;
    
        const matchesStatus =
            statusFilter === "" ||
            (user.activo ? '1' : '0') === statusFilter;
    
        return matchesRole && matchesStatus;
    });

    const searchData = empleadosDisponibles.filter((emp) => {
        const matches = 
            inputValue === "" ||
            `${emp.nombre}`.toLowerCase().includes(inputValue.toLowerCase()) ||
            `${emp.apellido}`.toLowerCase().includes(inputValue.toLowerCase()) ||
            `${emp.cedula}`.toLowerCase().includes(inputValue.toLowerCase());
        return matches;
    });

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    // Si la página actual queda fuera de rango (ej: tras borrar el último de la página), la reajustamos
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages || 1);
        }
    }, [totalPages, currentPage]);

    const currentUsers = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2>Usuarios y roles</h2>
                    <p className="text-lg "><span className="text-on-surface-variant">Gestión de usuarios y asignación de roles</span></p>
                </div>
                <Can permission={PERMISSIONS.USUARIOS_CREAR}>
                    <SelectionModal
                        setSelectedEmployee={setSelectedEmployee}
                        selectedEmployee={selectedEmployee}
                        setInputValue={setInputValue}
                        inputValue={inputValue}
                        searchData={searchData}
                        roles={userRoles}
                        refrescarEmpleados={refrescarEmpleados}
                        isRefreshing={isRefreshing}
                        onUserCreated={handleUserCreated}
                    />
                </Can>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {
                    dataCards.map((card, index) => (
                        <div key={index} className=" bg-surface-container-lowest shadow-sm rounded-md p-4">
                            <div className="flex gap-2 items-center">
                                <span className="bg-primary text-on-primary rounded-full p-2 flex items-center justify-center text-xl md:text-3xl">{card.icon}</span>
                                <h3>{card.title}</h3>
                            </div>
                            
                            <div className="divider"></div>
                            <p className="mt-2">{card.description}</p><h2 className="mt-2">5</h2>
                            {/* Aqui iria la data dinamica con un listener */}
                        </div>
                    ))
                }
            </div>

            {users.length === 0 ? (
                <h3 className="mt-20 text-center">No hay usuarios registrados aún</h3>
            ) : (
                <div className="flex flex-col mt-4 shadow-md rounded-t-md">
                    <div className="flex px-4 py-2 justify-between items-center bg-surface-container-lowest rounded-t-md">
                        <h3>Directorio de usuarios</h3>
                        
                        <div className="flex gap-2">
                            <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }} className="select w-40 focus-within:outline-1 focus-within:outline-outline-variant focus-within:ring-0 bg-surface-container-lowest border-outline-variant">
                                <option value={""} className="hover:bg-primary hover:text-on-primary whitespace-nowrap">Todos los roles</option>
                                {userRoles.map((rol, index) => (
                                    <option key={index} value={rol.nombre} className="hover:bg-primary hover:text-on-primary whitespace-nowrap">{rol.nombre}</option>
                                ))}
                            </select>
                            <select value={statusFilter} onChange={(e) => {setStatusFilter(e.target.value); setCurrentPage(1)}} className="select w-45 focus-within:outline-1 focus-within:outline-outline-variant focus-within:ring-0 bg-surface-container-lowest border-outline-variant">
                                <option value={""} className="hover:bg-primary hover:text-on-primary whitespace-nowrap">Todos los estados</option>
                                <option value={1} className="hover:bg-primary hover:text-on-primary">Activo</option>
                                <option value={0} className="hover:bg-primary hover:text-on-primary">Inactivo</option>
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto  rounded-b-md ">
                        <table className="table">
                            <thead>
                                <tr className="">
                                    <th>Empleado</th>
                                    <th>Usuario</th>
                                    <th>Rol</th>
                                    <th>Estado</th>
                                    <th>Creado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface-container-lowest">
                                {
                                    currentUsers.map((user,index) => (
                                        <tr key={index}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="avatar avatar-placeholder">
                                                        <div className="bg-neutral text-neutral-content w-10 rounded-full">
                                                            <span className="text-xl">{`${user.empleado_nombre[0]}${user.empleado_apellido[0]}`}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold">{user.empleado_nombre + " " + user.empleado_apellido}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>{user.email}</td>
                                            <td><div className="badge badge-outline badge-primary">{user.rol_nombre}</div></td>
                                            <td><div className={`badge badge-soft ${user.activo?"badge-primary":"badge-error"}`}>{user.activo? "Activo":"Inactivo"}</div></td>
                                            <td className="text-sm whitespace-nowrap">
                                                {user.created_at
                                                    ? new Date(user.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
                                                    : "—"}
                                            </td>
                                            <td>
                                                <Can permission={[PERMISSIONS.USUARIOS_EDITAR, PERMISSIONS.USUARIOS_ELIMINAR]} anyOf
                                                    fallback={<span className="text-sm opacity-40">—</span>}>
                                                    <button className="btn btn-ghost btn-primary" popoverTarget={`popover-${user.id}`} style={{ anchorName: `--anchor-${user.id}` }}>
                                                        <HiDotsVertical className="text-xl"/>
                                                    </button>

                                                    <ul
                                                        className="dropdown menu rounded-box bg-base-100 shadow-sm"
                                                        popover="auto"
                                                        id={`popover-${user.id}`}
                                                        style={{ positionAnchor: `--anchor-${user.id}`, positionArea: "bottom" }}
                                                    >
                                                        <Can permission={PERMISSIONS.USUARIOS_EDITAR}>
                                                            <li className="hover:bg-primary hover:text-on-primary rounded-md">
                                                                <button type="button" onClick={() => handleOpenEdit(user)}>
                                                                    Editar usuario
                                                                </button>
                                                            </li>

                                                            <li className="hover:bg-warning hover:text-warning-content rounded-md">
                                                                <button type="button" onClick={() => handleToggleStatus(user)}>
                                                                    {user.activo ? "Desactivar usuario" : "Activar usuario"}
                                                                </button>
                                                            </li>
                                                        </Can>

                                                        <Can permission={PERMISSIONS.USUARIOS_ELIMINAR}>
                                                            <li className="hover:bg-error hover:text-white rounded-md">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setUserToDelete(user);
                                                                        setConfirmDeleteText("");
                                                                        document.getElementById(`popover-${user.id}`)?.hidePopover?.();
                                                                        document.getElementById("delete_user_modal")?.showModal();
                                                                    }}
                                                                >
                                                                    Eliminar usuario
                                                                </button>
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
            )}

            <EditionModal
                userToEdit={userToEdit}
                roles={userRoles}
                onClose={handleCloseEdit}
                onUserUpdated={refrescarUsuarios}
            />

            <dialog id="delete_user_modal" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg text-error">
                        Confirmar eliminación
                    </h3>

                    <p className="py-4">
                        Esta acción eliminará el usuario:
                    </p>

                    {userToDelete && (
                        <div className="bg-surface-container-high border border-primary rounded-md p-3 mb-4">
                            <p><strong>Empleado:</strong> {userToDelete.empleado_nombre} {userToDelete.empleado_apellido}</p>
                            <p><strong>Correo:</strong> {userToDelete.email}</p>
                        </div>
                    )}

                    <p className="mb-2">
                        Escribe "<strong>confirmar</strong>" para continuar:
                    </p>

                    <input
                        type="text"
                        value={confirmDeleteText}
                        onChange={(e) => setConfirmDeleteText(e.target.value)}
                        className="input input-bordered w-full"
                        placeholder="confirmar"
                    />

                    <div className="modal-action">
                        <button
                            className="btn"
                            onClick={() => {
                                document.getElementById("delete_user_modal")?.close();
                                setUserToDelete(null);
                                setConfirmDeleteText("");
                            }}
                        >
                            Cancelar
                        </button>

                        <button
                            className="btn btn-error"
                            disabled={confirmDeleteText.toLowerCase() !== "confirmar"}
                            onClick={handleDelete}
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </dialog>
        </div>
    )
}

export default UsersView;