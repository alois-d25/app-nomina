'use client';
import { useState } from "react";
import { toast } from "react-toastify";
import { FaPen, FaTrash, FaXmark } from "react-icons/fa6";
import { TituloService } from "@/services/titulo.service";
import Can from "@/components/Can";
import { PERMISSIONS } from "@/app/config/permissions";

/**
 * Modal de gestión de títulos académicos: lista todos los títulos registrados y
 * permite crear, editar y eliminar cualquiera. Las mutaciones notifican al padre
 * vía onTitulosChanged() para refrescar la lista (y el select del modal de reglas).
 */
const TituloModal = ({ titulos = [], onTitulosChanged }) => {
    const [editingId, setEditingId] = useState(null);
    const [nombre, setNombre] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const resetForm = () => {
        setEditingId(null);
        setNombre("");
        setDescripcion("");
    };

    const handleClose = () => {
        document.getElementById("titulo_modal")?.close();
        resetForm();
        setConfirmDeleteId(null);
    };

    const startEdit = (titulo) => {
        setConfirmDeleteId(null);
        setEditingId(titulo.id);
        setNombre(titulo.nombre || "");
        setDescripcion(titulo.descripcion || "");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const nombreLimpio = nombre.trim();
        if (!nombreLimpio) {
            toast.error("El nombre del título es requerido");
            return;
        }

        setIsSaving(true);
        try {
            const payload = { nombre: nombreLimpio, descripcion: descripcion.trim() || null };
            if (editingId) {
                await TituloService.actualizar(editingId, payload);
                toast.success("Título actualizado exitosamente");
            } else {
                await TituloService.crear(payload);
                toast.success("Título creado exitosamente");
            }
            resetForm();
            if (onTitulosChanged) await onTitulosChanged();
        } catch (error) {
            const detail = error.response?.data?.detail;
            toast.error(typeof detail === "string" ? detail : "No se pudo guardar el título.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        setIsDeleting(true);
        try {
            await TituloService.eliminar(id);
            toast.success("Título eliminado exitosamente");
            if (editingId === id) resetForm();
            setConfirmDeleteId(null);
            if (onTitulosChanged) await onTitulosChanged();
        } catch (error) {
            const detail = error.response?.data?.detail;
            toast.error(
                typeof detail === "string"
                    ? detail
                    : "No se puede eliminar: el título podría estar en uso."
            );
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <dialog id="titulo_modal" className="modal">
            <div className="modal-box w-11/12 max-w-2xl bg-surface-container-lowest">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Títulos académicos</h3>
                    <button type="button" className="btn btn-ghost btn-sm btn-circle" onClick={handleClose}>
                        <FaXmark className="text-lg" />
                    </button>
                </div>

                {/* Formulario crear / editar */}
                <Can permission={[PERMISSIONS.NOMINAS_CREAR, PERMISSIONS.NOMINAS_EDITAR]} anyOf>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border border-outline-variant rounded-md p-4 mb-4 bg-surface-container-low/30">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">
                                {editingId ? "Editar título" : "Nuevo título"}
                            </label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                placeholder="Nombre (ej: Licenciatura)"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                            />
                        </div>
                        <input
                            type="text"
                            className="input input-bordered w-full"
                            placeholder="Descripción (opcional)"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            {editingId && (
                                <button type="button" className="btn btn-ghost" onClick={resetForm} disabled={isSaving}>
                                    Cancelar edición
                                </button>
                            )}
                            <button type="submit" className="btn btn-primary" disabled={isSaving}>
                                {isSaving && <span className="loading loading-spinner loading-xs"></span>}
                                {editingId ? "Actualizar" : "Guardar"}
                            </button>
                        </div>
                    </form>
                </Can>

                {/* Lista de títulos */}
                <div className="overflow-x-auto max-h-[45vh] overflow-y-auto border border-outline-variant rounded-md">
                    <table className="table table-pin-rows">
                        <thead>
                            <tr className="bg-base-200">
                                <th>Nombre</th>
                                <th>Descripción</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {titulos.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="text-center text-base-content/50 py-6">
                                        No hay títulos registrados.
                                    </td>
                                </tr>
                            ) : (
                                titulos.map((t) => (
                                    <tr key={t.id} className={editingId === t.id ? "bg-primary/5" : ""}>
                                        <td className="font-medium">{t.nombre}</td>
                                        <td className="text-sm opacity-70">{t.descripcion || "—"}</td>
                                        <td>
                                            {confirmDeleteId === t.id ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-xs text-error">¿Eliminar?</span>
                                                    <button
                                                        type="button"
                                                        className="btn btn-xs btn-error"
                                                        onClick={() => handleDelete(t.id)}
                                                        disabled={isDeleting}
                                                    >
                                                        {isDeleting && <span className="loading loading-spinner loading-xs"></span>}
                                                        Sí
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-xs"
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        disabled={isDeleting}
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end gap-1">
                                                    <Can permission={PERMISSIONS.NOMINAS_EDITAR}>
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost btn-xs btn-square text-warning"
                                                            title="Editar"
                                                            onClick={() => startEdit(t)}
                                                        >
                                                            <FaPen />
                                                        </button>
                                                    </Can>
                                                    <Can permission={PERMISSIONS.NOMINAS_ELIMINAR}>
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost btn-xs btn-square text-error"
                                                            title="Eliminar"
                                                            onClick={() => setConfirmDeleteId(t.id)}
                                                        >
                                                            <FaTrash />
                                                        </button>
                                                    </Can>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="modal-action mt-4">
                    <button type="button" className="btn btn-ghost" onClick={handleClose}>Cerrar</button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop"><button onClick={handleClose}>cerrar</button></form>
        </dialog>
    );
};

export default TituloModal;
