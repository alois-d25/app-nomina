'use client';
import { useEffect, useState } from "react";
import { FaPlus, FaSearch } from "react-icons/fa";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import axios from "axios";
import { toast } from "react-toastify";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClassName = (error) =>
    `w-full pl-4 pr-3 py-2.5 border rounded-md bg-surface text-on-surface font-body-md text-body-md focus:ring-1 focus:ring-primary focus:border-primary transition-colors placeholder:text-on-surface-variant/50 hover:border-outline ${
        error ? "border-error" : "border-outline-variant"
    }`;

const InputField = ({ label, id, type, placeholder, value, onChange, error, name }) => (
    <div>
        <label className="block font-label-md text-label-lg text-on-surface mb-2" htmlFor={id}>
            {label}
        </label>
        <input
            className={inputClassName(error)}
            id={id}
            name={name}
            placeholder={placeholder}
            required
            type={type}
            value={value}
            onChange={onChange}
        />
        {error && <p className="text-error text-sm mt-1">{error}</p>}
    </div>
);

const PasswordField = ({ label, id, placeholder, value, onChange, error, name, visible }) => (
    <div>
        <label className="block font-label-md text-label-lg text-on-surface mb-2" htmlFor={id}>
            {label}
        </label>
        <input
            className={inputClassName(error)}
            id={id}
            name={name}
            placeholder={placeholder}
            required
            type={visible ? "text" : "password"}
            value={value}
            onChange={onChange}
            autoComplete="new-password"
        />
        {error && <p className="text-error text-sm mt-1">{error}</p>}
    </div>
);

const SelectionModal = ({    selectedEmployee, setSelectedEmployee, inputValue, setInputValue, searchData,roles, refrescarEmpleados, isRefreshing, onUserCreated,
}) => {
    const [selectedRolId, setSelectedRolId] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [submitError, setSubmitError] = useState("");

    const rolSeleccionado = roles.find((r) => r.id.toString() === selectedRolId);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const totalPages = Math.ceil(searchData.length / itemsPerPage);
    const currentEmployees = searchData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reajusta la página si queda fuera de rango (ej: al filtrar o tras crear un usuario)
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages || 1);
        }
    }, [totalPages, currentPage]);

    useEffect(() => {
        if (selectedEmployee) {
            setEmail(selectedEmployee.email || "");
            setPassword("");
            setConfirmPassword("");
            setSelectedRolId("");
            setErrors({});
            setSubmitError("");
        }
    }, [selectedEmployee]);

    const resetForm = () => {
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setSelectedRolId("");
        setErrors({});
        setSubmitError("");
    };

    const handleVolver = () => {
        resetForm();
        setSelectedEmployee(null);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!email.trim()) {
            newErrors.email = "El correo es requerido";
        } else if (!EMAIL_REGEX.test(email.trim())) {
            newErrors.email = "Ingrese un correo electrónico válido";
        }

        if (!selectedRolId) {
            newErrors.rol = "Debe seleccionar un rol";
        }

        if (!password) {
            newErrors.password = "La contraseña es requerida";
        } else if (password.length < 6) {
            newErrors.password = "La contraseña debe tener al menos 6 caracteres";
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = "Debe confirmar la contraseña";
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = "Las contraseñas no coinciden";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        setSubmitError("");

        if (!validateForm() || !selectedEmployee) return;

        setIsSaving(true);
        try {
            await axios.post(`${API_BASE}/api/usuarios`, {
                email: email.trim(),
                password,
                empleado_cedula: selectedEmployee.cedula,
                activo: true,
                rol_id: Number(selectedRolId),
            });

            resetForm();
            setSelectedEmployee(null);
            setInputValue("");
            setCurrentPage(1);
            document.getElementById("my_modal_4")?.close();
            toast.success("Usuario creado exitosamente");

            if (onUserCreated) {
                await onUserCreated(selectedEmployee.cedula);
            }
        } catch (error) {
            const detail = error.response?.data?.detail;
            let mensaje;
            if (typeof detail === "string") {
                mensaje = detail;
            } else if (Array.isArray(detail)) {
                mensaje = detail.map((d) => d.msg).join(". ");
            } else {
                mensaje = "No se pudo registrar el usuario. Intente de nuevo.";
            }
            setSubmitError(mensaje);
            toast.error(mensaje);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAbrirModal = async () => {
        await refrescarEmpleados();
        document.getElementById('my_modal_4').showModal();
    };
    
    return (
        <div>
            <button className="btn btn-primary" onClick={handleAbrirModal} disabled={isRefreshing}>{isRefreshing ? <span className="loading loading-spinner loading-xs"></span> : <FaPlus/>} Agregar usuario</button>
            <dialog id="my_modal_4" className="modal">
                <div className="modal-box w-11/12 max-w-2xl bg-surface-container-lowest">
                    {
                        selectedEmployee ? (
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="avatar avatar-placeholder">
                                        <div className="bg-neutral text-neutral-content w-16 rounded-full">
                                            <span className="text-2xl">{`${selectedEmployee.nombre[0]}${selectedEmployee.apellido[0]}`}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg">{selectedEmployee.nombre} {selectedEmployee.apellido}</div>
                                        <div className="text-sm">{selectedEmployee.cedula}</div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <form onSubmit={handleGuardar} className="flex flex-col gap-2">
                                        <InputField
                                            id="email"
                                            name="email"
                                            label="Correo:"
                                            placeholder="Ingrese el correo"
                                            type="email"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                                            }}
                                            error={errors.email}
                                        />
                                        <div className="flex flex-col">
                                            <label className="block font-label-md text-label-lg text-on-surface mb-2">Roles</label>
                                            <select
                                                className={`select ${errors.rol ? "border-error" : ""}`}
                                                value={selectedRolId}
                                                onChange={(e) => {
                                                    setSelectedRolId(e.target.value);
                                                    if (errors.rol) setErrors((prev) => ({ ...prev, rol: null }));
                                                }}
                                            >
                                                <option value="" disabled>Escoja el rol</option>
                                                {roles.map((role) => (
                                                    <option key={role.id} className="hover:bg-primary hover:text-on-primary whitespace-nowrap" value={role.id}>{role.nombre}</option>
                                                ))}
                                            </select>
                                            {errors.rol && <p className="text-error text-sm mt-1">{errors.rol}</p>}
                                            <span className="label text-sm mt-1 text-on-surface-variant text-wrap">
                                                {rolSeleccionado ? rolSeleccionado.descripcion : "Seleccione un rol para ver su descripción."}
                                            </span>
                                        </div>
                                        <PasswordField
                                            id="password"
                                            name="password"
                                            label="Contraseña:"
                                            placeholder="Ingrese la contraseña"
                                            visible={showPassword}
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                                            }}
                                            error={errors.password}
                                        />
                                        <PasswordField
                                            id="repetir_password"
                                            name="repetir_password"
                                            label="Repetir contraseña:"
                                            placeholder="Confirme la contraseña"
                                            visible={showPassword}
                                            value={confirmPassword}
                                            onChange={(e) => {
                                                setConfirmPassword(e.target.value);
                                                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null }));
                                            }}
                                            error={errors.confirmPassword}
                                        />
                                        <label className="flex items-center gap-2 cursor-pointer w-fit">
                                            <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)}/>
                                            <span className="text-sm text-on-surface">Mostrar contraseña</span>
                                        </label>
                                        {submitError && (
                                            <p className="text-error text-sm">{submitError}</p>
                                        )}
                                        <div className="flex gap-2 justify-end mt-2">
                                            <button type="button" className="btn btn-error" onClick={handleVolver} disabled={isSaving}>
                                                Volver
                                            </button>
                                            <button type="submit" className="btn btn-primary" disabled={isSaving}>
                                                {isSaving ? <span className="loading loading-spinner loading-xs"></span> : null}
                                                Guardar
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        ) : (
                            <div className='flex flex-col gap-4'>
                                <h3 className="font-bold text-lg">Seleccionar empleado al que se le creará un usuario</h3>
                                <fieldset className="fieldset">
                                    <legend className="text-sm">Buscar por nombre o cédula</legend>
                                    <label className="input focus-within:outline-1 focus-within:outline-outline-variant focus-within:ring-0 bg-surface-container-lowest border-outline-variant">
                                        <FaSearch />
                                        <input type="search" 
                                            disabled={!!selectedEmployee} 
                                            className="bg-surface-container-lowes)" 
                                            placeholder="Ej:13456427 / Juan Peréz" 
                                            value={inputValue} 
                                            onChange={(e) => {
                                                setInputValue(e.target.value);
                                                setCurrentPage(1);
                                            }}/>
                                    </label>
                                </fieldset>
                                <table className="table">
                                    <thead>
                                        <tr className="text-black shadow-sm">
                                            <th></th>
                                            <th>Nombre</th>
                                            <th>Cedula</th>
                                            <th>Correo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {
                                            currentEmployees.map((emp,index) => (
                                                <tr key={index} className='shadow-sm hover:bg-background' onClick={() => setSelectedEmployee(emp)}>
                                                    <td>
                                                        <div className="avatar avatar-placeholder">
                                                            <div className="bg-neutral text-neutral-content w-10 rounded-full">
                                                                <span className="text-xl">{`${emp.nombre[0]}${emp.apellido[0]}`}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>{emp.nombre} {emp.apellido}</td>
                                                    <td>V{emp.cedula}</td>
                                                    <td>{emp.email}</td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </table>

                                <div className="card-body p-4 bg-base-200/50 border-t border-base-300">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-base-content/70">
                                            Mostrando {searchData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, searchData.length)} de{" "}
                                            {searchData.length} registros
                                        </div>
                                        <div className="join">
                                            <button className="join-item btn btn-sm" disabled={currentPage === 1}onClick={() => setCurrentPage(prev => prev - 1)}>
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

                                <div className="modal-action mt-0">
                                    <form method="dialog">
                                        <button className="btn btn-error" onClick={() => { setSelectedEmployee(null); setInputValue(""); setCurrentPage(1); resetForm(); }}>
                                            Cancelar
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )
                    }
                </div>
            </dialog>
        </div>
    )
}

export default SelectionModal;