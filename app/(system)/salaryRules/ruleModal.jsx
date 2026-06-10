'use client';
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const RuleModal = ({ ruleToEdit, titulos, escalafones, onClose, onRuleSaved }) => {
    const [formData, setFormData] = useState({
        nivel_escalafon_id: "",
        titulo_academico_id: "",
        anios_min: 0,
        anios_max: 0,
        salario_base: "",
    });
    
    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // Si ruleToEdit cambia, rellenamos el formulario o lo limpiamos
    useEffect(() => {
        if (ruleToEdit) {
            setFormData({
                nivel_escalafon_id: ruleToEdit.nivel_escalafon_id.toString(),
                titulo_academico_id: ruleToEdit.titulo_academico_id.toString(),
                anios_min: ruleToEdit.anios_min,
                anios_max: ruleToEdit.anios_max,
                salario_base: ruleToEdit.salario_base,
            });
        } else {
            setFormData({
                nivel_escalafon_id: "",
                titulo_academico_id: "",
                anios_min: 0,
                anios_max: 0,
                salario_base: "",
            });
        }
        setErrors({});
    }, [ruleToEdit]);

    const validateForm = () => {
        const newErrors = {};
        if (!formData.nivel_escalafon_id) newErrors.escalafon = "Requerido";
        if (!formData.titulo_academico_id) newErrors.titulo = "Requerido";
        if (formData.anios_min < 0) newErrors.anios_min = "No puede ser negativo";
        if (formData.anios_max <= formData.anios_min) newErrors.anios_max = "Debe ser mayor al mínimo";
        if (!formData.salario_base || formData.salario_base <= 0) newErrors.salario_base = "Debe ser mayor a 0";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleClose = () => {
        document.getElementById("rule_modal")?.close();
        onClose?.();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSaving(true);
        try {
            const payload = {
                nivel_escalafon_id: Number(formData.nivel_escalafon_id),
                titulo_academico_id: Number(formData.titulo_academico_id),
                anios_min: Number(formData.anios_min),
                anios_max: Number(formData.anios_max),
                salario_base: parseFloat(formData.salario_base),
                activa: ruleToEdit ? ruleToEdit.activa : true // Mantiene el estado si es edición, o true si es nueva
            };

            if (ruleToEdit) {
                await axios.put(`${API_BASE}/api/reglas_escalafon/${ruleToEdit.id}`, payload);
                toast.success("Regla actualizada exitosamente");
            } else {
                await axios.post(`${API_BASE}/api/reglas_escalafon/`, payload);
                toast.success("Regla creada exitosamente");
            }

            handleClose();
            if (onRuleSaved) await onRuleSaved();
            
        } catch (error) {
            const detail = error.response?.data?.detail;
            toast.error(typeof detail === "string" ? detail : "Ocurrió un error al guardar la regla.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <dialog id="rule_modal" className="modal">
            <div className="modal-box w-11/12 max-w-lg bg-surface-container-lowest">
                <h3 className="font-bold text-lg mb-4">
                    {ruleToEdit ? "Editar Regla Salarial" : "Nueva Regla Salarial"}
                </h3>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-1">Escalafón</label>
                            <select className={`select select-bordered w-full ${errors.escalafon ? "select-error" : ""}`} value={formData.nivel_escalafon_id} onChange={(e) => setFormData({ ...formData, nivel_escalafon_id: e.target.value })}>
                                <option value="" disabled>Seleccione</option>
                                {escalafones.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Título Académico</label>
                            <select className={`select select-bordered w-full ${errors.titulo ? "select-error" : ""}`} value={formData.titulo_academico_id} onChange={(e) => setFormData({ ...formData, titulo_academico_id: e.target.value })}>
                                <option value="" disabled>Seleccione</option>
                                {titulos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-1">Años Mínimos</label>
                            <input 
                                type="number" 
                                min="0" 
                                // El mínimo nunca puede superar al máximo actual
                                max={formData.anios_max > 0 ? formData.anios_max - 1 : undefined} 
                                className={`input input-bordered w-full ${errors.anios_min ? "input-error" : ""}`} 
                                value={formData.anios_min} 
                                onChange={(e) => {
                                    setFormData({ ...formData, anios_min: Number(e.target.value) });
                                    if (errors.anios_min) setErrors(prev => ({ ...prev, anios_min: null }));
                                }}
                            />
                            {errors.anios_min && <p className="text-error text-xs mt-1">{errors.anios_min}</p>}
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Años Máximos</label>
                            <input 
                                type="number" 
                                // El máximo debe ser obligatoriamente 1 año mayor que el mínimo actual
                                min={formData.anios_min + 1} 
                                className={`input input-bordered w-full ${errors.anios_max ? "input-error" : ""}`} 
                                value={formData.anios_max} 
                                onChange={(e) => {
                                    setFormData({ ...formData, anios_max: Number(e.target.value) });
                                    if (errors.anios_max) setErrors(prev => ({ ...prev, anios_max: null }));
                                }}
                            />
                            {errors.anios_max && <p className="text-error text-xs mt-1">{errors.anios_max}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm mb-1">Salario Base ($)</label>
                        <input type="number" step="0.01" min="0" className={`input input-bordered w-full ${errors.salario_base ? "input-error" : ""}`} value={formData.salario_base} onChange={(e) => setFormData({ ...formData, salario_base: e.target.value })}/>
                        {errors.salario_base && <p className="text-error text-xs mt-1">{errors.salario_base}</p>}
                    </div>

                    <div className="modal-action mt-2">
                        <button type="button" className="btn btn-ghost" onClick={handleClose} disabled={isSaving}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving && <span className="loading loading-spinner loading-xs"></span>} Guardar
                        </button>
                    </div>
                </form>
            </div>
            <form method="dialog" className="modal-backdrop"><button onClick={handleClose}>cerrar</button></form>
        </dialog>
    );
};

export default RuleModal;