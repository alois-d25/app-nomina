"use client";
import React, { useState, useEffect } from "react";
import { IoClose } from "react-icons/io5";
import { toast } from "react-toastify";
import EmployeeSelector from "./EmployeeSelector";
import { EmployeeService } from "@/services/employee.service";

const TIPO_PAGO_OPTIONS = { quincenal: "Quincenal", mensual: "Mensual", unico: "unico" };

// Deducciones que usan fórmula automática de ley en lugar de monto manual
const FORMULA_AUTOMATICA = {
  Ivss: { formula: "ivss", label: "IVSS — Salario × 12/52 × 4% × 4 (mensual)" },
  Lph:  { formula: "lph",  label: "LPH — Salario base × 1%" },
  Spf:  { formula: "spf",  label: "Paro Forzoso — Salario × 12/52 × 0.5% × 4 (mensual)" },
  Faov: { formula: "faov", label: "FAOV — Salario integral × 1%" },
};

export default function PayrollActionModal({ isOpen, onClose, onSubmit, type, editData = null, relationshipsData = [] }) {
  const [formData, setFormData] = useState({
    nombre: "", monto: "", es_porcentaje: false,
    tipo_pago: "Quincenal", fecha: "", descripcion: "", selectedEmployees: [], type,
  });
  const [employees, setEmployees] = useState([]);
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const isEditMode = !!editData;

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);

    const initializeModal = async () => {
      try {
        // Always fetch all employees for the selector UI
        const data = await EmployeeService.getEmployees();
        setEmployees((data || []).map(emp => ({ id: emp.cedula, name: `${emp.nombre} ${emp.apellido}` })));

        if (isEditMode && editData) {
          // EDIT MODE: Get currently assigned employees for this bono/deduccion
          // Filter from relationshipsData if provided (from parent component)
          // Otherwise fetch from API as fallback
          let assignedCedulas = [];

          if (relationshipsData && relationshipsData.length > 0) {
            // Filter relationships by current item ID
            const idField = type === "bono" ? "bono_id" : "deduccion_id";
            assignedCedulas = relationshipsData
              .filter(rel => rel[idField] === editData.id)
              .map(rel => rel.empleado_cedula);
          } else {
            // Fallback: fetch from API if relationshipsData not provided
            try {
              const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
              const endpoint = type === "bono"
                ? `${API_URL}/api/bonos_relaciones/empleados`
                : `${API_URL}/api/deducciones_relaciones/empleados`;

              const assignedRes = await fetch(endpoint);
              const allData = await assignedRes.json();
              const idField = type === "bono" ? "bono_id" : "deduccion_id";
              assignedCedulas = (allData || [])
                .filter(rel => rel[idField] === editData.id)
                .map(rel => rel.empleado_cedula);
            } catch (error) {
              console.error("Error fetching assigned employees:", error);
            }
          }

          setAssignedEmployees(assignedCedulas);

          // Set form data with pre-populated employees
          const rawTipo = (editData.tipo_pago || "").toLowerCase();
          setFormData({
            nombre: editData.nombre || "",
            monto: String(editData.monto ?? ""),
            es_porcentaje: editData.es_porcentaje ?? false,
            tipo_pago: TIPO_PAGO_OPTIONS[rawTipo] ?? "Quincenal",
            fecha: editData.fecha || "",
            descripcion: editData.descripcion || "",
            selectedEmployees: assignedCedulas,
            type,
          });
        } else {
          // CREATION MODE
          setFormData({
            nombre: "", monto: "", es_porcentaje: false,
            tipo_pago: "Quincenal", fecha: "", descripcion: "", selectedEmployees: [], type,
          });
          setAssignedEmployees([]);
        }
      } catch (error) {
        console.error("Error initializing modal:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeModal();
  }, [isOpen, isEditMode, editData, type, relationshipsData?.length]);

  if (!isOpen) return null;

  const isBono = type === "bono";
  const isPrestamo = formData.nombre === "Prestamo Personal";
  const tipoPagoValue = isPrestamo ? "Mensual" : formData.tipo_pago;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isEditMode && formData.selectedEmployees.length === 0) {
      toast.error("Por favor seleccione al menos un empleado");
      return;
    }
    if (isPrestamo && formData.selectedEmployees.length !== 1) {
      toast.error("Los préstamos solo pueden asignarse a un empleado");
      return;
    }
    const monto = parseFloat(formData.monto);
    if (isNaN(monto) || monto <= 0) {
      toast.error("El monto debe ser un número mayor a 0");
      return;
    }
    if (formData.es_porcentaje && monto > 100) {
      toast.error("Un porcentaje no puede ser mayor a 100");
      return;
    }
    onSubmit({ ...formData, isPrestamo });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-container-lowest w-full max-w-2xl rounded-2xl shadow-2xl border border-outline-variant flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant flex justify-between items-center">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">
            {isEditMode
            ? (isBono ? "Editar Bono" : "Editar Deducción")
            : (isBono ? "Crear Nuevo Bono" : "Crear Nueva Deducción")}
          </h3>
          <button onClick={onClose} className="text-on-surface-variant hover:bg-surface-container p-2 rounded-full transition-colors">
            <IoClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-6">
            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-on-surface-variant text-label-md">
                  {isBono ? "Nombre del Bono" : "Tipo de Deducción"}
                </label>
                {isBono ? (
                  <input
                    required
                    className="input rounded-lg border-outline-variant bg-surface-bright p-2.5 focus:ring-primary"
                    placeholder="Ej: Bono Vacacional"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                ) : (
                  <select
                    required
                    className="select rounded-lg border-outline-variant bg-surface-bright p-2.5 focus:ring-primary"
                    value={formData.nombre}
                    onChange={(e) => {
                      const newNombre = e.target.value;
                      const newData = { ...formData, nombre: newNombre };
                      if (newNombre === "Prestamo Personal") {
                        newData.tipo_pago = "Mensual";
                        newData.selectedEmployees = newData.selectedEmployees.length > 0 ? [newData.selectedEmployees[0]] : [];
                      }
                      setFormData(newData);
                    }}
                  >
                    <optgroup label="Deducciones internas (monto manual)">
                      <option value="Anticipos">Anticipos</option>
                      <option value="Uniforme">Uniforme</option>
                      <option value="Inscripcion">Inscripcion</option>
                      <option value="Prestamo Personal">Prestamo Personal</option>
                    </optgroup>
                  </select>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-on-surface-variant text-label-md">Tipo de Pago</label>
                <select
                  disabled={isPrestamo}
                  className={`select rounded-lg border-outline-variant bg-surface-bright p-2.5 ${isPrestamo ? "opacity-50 cursor-not-allowed" : ""}`}
                  value={tipoPagoValue}
                  onChange={(e) => {
                    if (!isPrestamo) {
                      setFormData({ ...formData, tipo_pago: e.target.value });
                    }
                  }}
                >
                  <option value="Quincenal">Quincenal</option>
                  <option value="unico">Único</option>
                  <option value="Mensual">Mensual</option>
                </select>
              </div>
              {(formData.tipo_pago === 'unico' || isPrestamo) && (
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-on-surface-variant text-label-md">
                    {isPrestamo ? "Fecha de Inicio" : "Fecha"}
                  </label>
                  <input
                    required
                    type="date"
                    className="input rounded-lg border-outline-variant bg-surface-bright p-2.5 focus:ring-primary"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-on-surface-variant text-label-md">Monto</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-on-surface-variant">{formData.es_porcentaje ? "%" : "Bs."}</span>
                  <input
                    required
                    type="number"
                    step="0.01"
                    className="input w-full rounded-lg border-outline-variant bg-surface-bright p-2.5 pl-10"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-end pb-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox w-5 h-5 rounded border-outline-variant text-primary"
                    checked={formData.es_porcentaje}
                    onChange={(e) => setFormData({ ...formData, es_porcentaje: e.target.checked })}
                  />
                  <span className="font-label-md text-on-surface">¿Es un porcentaje?</span>
                </label>
              </div>
            </div>

            {/* Description Field */}
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-on-surface-variant text-label-md">Descripción (Opcional)</label>
              <textarea
                className="textarea rounded-lg border-outline-variant bg-surface-bright p-2.5 focus:ring-primary"
                placeholder="Describa este bono o deducción..."
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows="3"
              />
            </div>

            {/* Employee Selector Section */}
            <div className="pt-4 border-t border-outline-variant">
              <label className="font-label-lg text-on-surface block mb-3">Seleccionar Empleados</label>
              {isLoading ? (
                <div className="p-8 text-center text-on-surface-variant font-body-sm">Cargando lista de empleados...</div>
              ) : (
                <EmployeeSelector
                  employees={employees}
                  initialSelected={formData.selectedEmployees}
                  onSelectionChange={(ids) => setFormData({ ...formData, selectedEmployees: ids })}
                  singleSelect={isPrestamo}
                />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-outline-variant bg-surface-container-low flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg font-label-md border border-outline-variant">Cancelar</button>
            <button type="submit" className={`px-6 py-2 rounded-lg font-label-md text-white shadow-md ${isBono ? "bg-primary" : "bg-error"}`}>
              {isEditMode ? "Guardar cambios" : `Crear ${isBono ? "Bono" : "Deducción"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}