'use client';
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClassName = (error) =>
    `w-full pl-4 pr-3 py-2.5 border rounded-md bg-surface text-on-surface font-body-md text-body-md focus:ring-1 focus:ring-primary focus:border-primary transition-colors placeholder:text-on-surface-variant/50 hover:border-outline ${
        error ? "border-error" : "border-outline-variant"
}`;

const EditionModal = ({ userToEdit, roles, onClose, onUserUpdated }) => {
    const [formData, setFormData] = useState({
        email: "",
        rol_id: "",
        password: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitError, setSubmitError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!userToEdit) return;

        const rolId =
            userToEdit.rol_id ??
            roles.find((r) => r.nombre === userToEdit.rol_nombre)?.id ??
            "";

        setFormData({
            email: userToEdit.email || "",
            rol_id: rolId.toString(),
            password: "",
            confirmPassword: "",
        });
        setErrors({});
        setSubmitError("");
        setShowPassword(false);
    }, [userToEdit, roles]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.email.trim()) {
            newErrors.email = "El correo es requerido";
        } else if (!EMAIL_REGEX.test(formData.email.trim())) {
            newErrors.email = "Ingrese un correo electrónico válido";
        }

        if (!formData.rol_id) {
            newErrors.rol = "Debe seleccionar un rol";
        }

        if (formData.password) {
            if (formData.password.length < 6) {
                newErrors.password = "La contraseña debe tener al menos 6 caracteres";
            }
            if (!formData.confirmPassword) {
                newErrors.confirmPassword = "Debe confirmar la contraseña";
            } else if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = "Las contraseñas no coinciden";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleClose = () => {
        document.getElementById("edition_modal")?.close();
        onClose?.();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError("");

        if (!userToEdit || !validateForm()) return;

        setIsSaving(true);
        try {
            const payload = {
                email: formData.email.trim(),
                rol_id: Number(formData.rol_id),
            };

            if (formData.password) {
                payload.password = formData.password;
            }

            await axios.put(`${API_BASE}/api/usuarios/${userToEdit.id}`, payload);

            handleClose();
            toast.success("Usuario actualizado exitosamente");
            if (onUserUpdated) {
                await onUserUpdated();
            }
        } catch (error) {
            const detail = error.response?.data?.detail;
            let mensaje;
            if (typeof detail === "string") {
                mensaje = detail;
            } else if (Array.isArray(detail)) {
                mensaje = detail.map((d) => d.msg).join(". ");
            } else {
                mensaje = "No se pudo actualizar el usuario. Intente de nuevo.";
            }
            setSubmitError(mensaje);
            toast.error(mensaje);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <dialog id="edition_modal" className="modal">
            <div className="modal-box w-11/12 max-w-lg bg-surface-container-lowest">
                <h3 className="font-bold text-lg mb-1">Editar usuario</h3>
                {userToEdit && (
                    <p className="text-sm text-on-surface-variant mb-4">
                        {userToEdit.empleado_nombre} {userToEdit.empleado_apellido}
                    </p>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block font-label-md text-label-lg text-on-surface mb-2" htmlFor="edit-email">
                            Correo
                        </label>
                        <input
                            id="edit-email"
                            className={inputClassName(errors.email)}
                            type="email"
                            value={formData.email}
                            onChange={(e) => {
                                setFormData({ ...formData, email: e.target.value });
                                if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                            }}
                        />
                        {errors.email && <p className="text-error text-sm mt-1">{errors.email}</p>}
                    </div>

                    <div>
                        <label className="block font-label-md text-label-lg text-on-surface mb-2" htmlFor="edit-rol">
                            Rol
                        </label>
                        <select
                            id="edit-rol"
                            className={`select w-full ${errors.rol ? "border-error" : ""}`}
                            value={formData.rol_id}
                            onChange={(e) => {
                                setFormData({ ...formData, rol_id: e.target.value });
                                if (errors.rol) setErrors((prev) => ({ ...prev, rol: null }));
                            }}
                        >
                            <option value="" disabled>
                                Seleccione un rol
                            </option>
                            {roles.map((rol) => (
                                <option key={rol.id} value={rol.id} className="hover:bg-primary hover:text-on-primary whitespace-nowrap">
                                    {rol.nombre}
                                </option>
                            ))}
                        </select>
                        {errors.rol && <p className="text-error text-sm mt-1">{errors.rol}</p>}
                    </div>

                    <div>
                        <label className="block font-label-md text-label-lg text-on-surface mb-2" htmlFor="edit-password">
                            Nueva contraseña
                        </label>
                        <input
                            id="edit-password"
                            className={inputClassName(errors.password)}
                            type={showPassword ? "text" : "password"}
                            placeholder="Dejar en blanco para no cambiar"
                            value={formData.password}
                            autoComplete="new-password"
                            onChange={(e) => {
                                setFormData({ ...formData, password: e.target.value });
                                if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                            }}
                        />
                        {errors.password && <p className="text-error text-sm mt-1">{errors.password}</p>}
                    </div>

                    {formData.password && (
                        <div>
                            <label className="block font-label-md text-label-lg text-on-surface mb-2" htmlFor="edit-confirm-password">
                                Confirmar contraseña
                            </label>
                            <input
                                id="edit-confirm-password"
                                className={inputClassName(errors.confirmPassword)}
                                type={showPassword ? "text" : "password"}
                                placeholder="Repita la contraseña"
                                value={formData.confirmPassword}
                                autoComplete="new-password"
                                onChange={(e) => {
                                    setFormData({ ...formData, confirmPassword: e.target.value });
                                    if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null }));
                                }}
                            />
                            {errors.confirmPassword && (
                                <p className="text-error text-sm mt-1">{errors.confirmPassword}</p>
                            )}
                        </div>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer w-fit">
                        <input
                            type="checkbox"
                            className="checkbox checkbox-sm checkbox-primary"
                            checked={showPassword}
                            onChange={(e) => setShowPassword(e.target.checked)}
                        />
                        <span className="text-sm text-on-surface">Mostrar contraseña</span>
                    </label>

                    {submitError && <p className="text-error text-sm">{submitError}</p>}

                    <div className="modal-action mt-0">
                        <button type="button" className="btn btn-error" onClick={handleClose} disabled={isSaving}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving || !userToEdit}>
                            {isSaving ? <span className="loading loading-spinner loading-xs"></span> : null}
                            Guardar cambios
                        </button>
                    </div>
                </form>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button type="button" onClick={handleClose}>
                    cerrar
                </button>
            </form>
        </dialog>
    );
};

export default EditionModal;
