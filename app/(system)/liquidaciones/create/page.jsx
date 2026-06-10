"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft, FaCalculator, FaCheck } from "react-icons/fa6";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const CAUSAS = [
  { value: "renuncia", label: "Renuncia" },
  { value: "despido", label: "Despido" },
  { value: "fin_contrato", label: "Fin de Contrato" },
  { value: "jubilacion", label: "Jubilación" },
];

function fmt(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ConceptoRow({ label, dias, monto_bs, tasa, obs, destacado }) {
  const monto_usd = tasa ? monto_bs / tasa : 0;
  return (
    <tr className={destacado ? "font-bold bg-primary/10" : ""}>
      <td className="py-1 px-2 text-sm">{label}</td>
      <td className="py-1 px-2 text-sm text-right tabular-nums">{dias != null ? fmt(dias) : "—"}</td>
      <td className="py-1 px-2 text-sm text-right tabular-nums text-primary">Bs. {fmt(monto_bs)}</td>
      <td className="py-1 px-2 text-sm text-right tabular-nums text-on-surface-variant">$ {fmt(monto_usd)}</td>
      {obs !== undefined && <td className="py-1 px-2 text-xs text-on-surface-variant">{obs || ""}</td>}
    </tr>
  );
}

export default function CreateLiquidacionPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [empleados, setEmpleados] = useState([]);
  const [tasaDolar, setTasaDolar] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const [formData, setFormData] = useState({
    empleado_cedula: "",
    fecha_egreso: "",
    causa_egreso: "",
    saldo_deudor_prestamos: "",
    tasa_activa_porcentaje: "",
  });

  const [draftData, setDraftData] = useState(null);

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [empRes, tasaRes] = await Promise.all([
          axios.get(`${API_URL}/api/empleados/`),
          axios.get(`${API_URL}/api/tasa_dolar/actual`),
        ]);
        setEmpleados(empRes.data || []);
        if (tasaRes.data?.tasa) setTasaDolar(tasaRes.data.tasa);
      } catch {
        toast.error("Error al cargar datos iniciales");
      }
    };
    fetchInit();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCalcular = async () => {
    const { empleado_cedula, fecha_egreso, causa_egreso } = formData;
    if (!empleado_cedula || !fecha_egreso || !causa_egreso) {
      toast.error("Complete todos los campos obligatorios");
      return;
    }

    // La fecha de egreso no puede ser anterior al ingreso ni futura.
    if (empleadoSeleccionado?.fecha_ingreso && fecha_egreso < empleadoSeleccionado.fecha_ingreso.slice(0, 10)) {
      toast.error("La fecha de egreso no puede ser anterior a la fecha de ingreso");
      return;
    }
    if (fecha_egreso > new Date().toISOString().slice(0, 10)) {
      toast.error("La fecha de egreso no puede estar en el futuro");
      return;
    }

    const tasa = tasaDolar || 1;
    const deudor = parseFloat(formData.saldo_deudor_prestamos) || 0;
    const tasaActiva = parseFloat(formData.tasa_activa_porcentaje) || 0;

    setCalculating(true);
    try {
      const params = new URLSearchParams({
        fecha_egreso,
        causa_egreso,
        tasa_dolar: tasa,
        saldo_deudor_prestamos: deudor,
        tasa_activa_porcentaje: tasaActiva,
      });

      const res = await axios.post(
        `${API_URL}/api/liquidaciones/crear/${empleado_cedula}?${params.toString()}`
      );

      const liq = res.data?.liquidacion;
      if (!liq) throw new Error("Respuesta inesperada del servidor");

      setDraftData(liq);
      setStep(2);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Error al calcular la liquidación");
    } finally {
      setCalculating(false);
    }
  };

  const handleConfirmar = () => {
    router.push(`/liquidaciones/${draftData.liquidacion_id}`);
  };

  const empleadoSeleccionado = empleados.find((e) => e.cedula === formData.empleado_cedula);

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/liquidaciones" className="btn btn-ghost btn-sm">
            <FaArrowLeft /> Volver
          </Link>
          <h2 className="text-2xl font-bold text-base-content">Nueva Liquidación</h2>
        </div>

        {/* Indicador de pasos */}
        <ul className="steps w-full mb-8">
          <li className={`step ${step >= 1 ? "step-primary" : ""}`}>Información</li>
          <li className={`step ${step >= 2 ? "step-primary" : ""}`}>Revisar Cálculo</li>
          <li className={`step ${step >= 3 ? "step-primary" : ""}`}>Confirmar</li>
        </ul>

        {/* ── Paso 1: Datos ──────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="card bg-surface-container-lowest rounded-md shadow-xl">
            <div className="card-body space-y-4">
              <h3 className="font-semibold text-lg">Datos de Egreso</h3>

              <div className="form-control">
                <label className="label"><span className="label-text">Empleado *</span></label>
                <select name="empleado_cedula" value={formData.empleado_cedula} onChange={handleChange} className="select select-bordered w-full">
                  <option value="">Seleccionar empleado...</option>
                  {empleados.map((e) => (
                    <option key={e.cedula} value={e.cedula}>
                      {e.cedula} — {e.nombre} {e.apellido}
                    </option>
                  ))}
                </select>
              </div>

              {empleadoSeleccionado && (
                <div className="bg-base-200/60 rounded-md p-3 text-sm space-y-1">
                  <p><span className="font-medium">Ingreso:</span> {new Date(empleadoSeleccionado.fecha_ingreso).toLocaleDateString("es-ES")}</p>
                  <p><span className="font-medium">Salario base:</span> Bs. {fmt(empleadoSeleccionado.salario_base)}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label"><span className="label-text">Fecha de Egreso *</span></label>
                  <input type="date" name="fecha_egreso" value={formData.fecha_egreso} onChange={handleChange} className="input input-bordered w-full" />
                </div>

                <div className="form-control">
                  <label className="label"><span className="label-text">Causa de Egreso *</span></label>
                  <select name="causa_egreso" value={formData.causa_egreso} onChange={handleChange} className="select select-bordered w-full">
                    <option value="">Seleccionar causa...</option>
                    {CAUSAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="divider text-sm text-on-surface-variant">Información adicional</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Saldo deudor préstamos (Bs)</span>
                    <span className="label-text-alt text-on-surface-variant">0 si no aplica</span>
                  </label>
                  <input type="number" name="saldo_deudor_prestamos" min="0" step="0.01" value={formData.saldo_deudor_prestamos} onChange={handleChange} placeholder="0.00" className="input input-bordered w-full" />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Tasa activa BCV (%)</span>
                    <span className="label-text-alt text-on-surface-variant">Para intereses</span>
                  </label>
                  <input type="number" name="tasa_activa_porcentaje" min="0" max="100" step="0.1" value={formData.tasa_activa_porcentaje} onChange={handleChange} placeholder="ej: 15.5" className="input input-bordered w-full" />
                </div>
              </div>

              {tasaDolar && (
                <p className="text-xs text-on-surface-variant">
                  Tasa BCV actual: <strong>Bs. {fmt(tasaDolar)}</strong> / USD
                </p>
              )}

              <button onClick={handleCalcular} disabled={calculating} className="btn btn-primary w-full mt-2">
                <FaCalculator />
                {calculating ? "Calculando..." : "Calcular Liquidación"}
              </button>
            </div>
          </div>
        )}

        {/* ── Paso 2: Desglose ───────────────────────────────────────────── */}
        {step === 2 && draftData && (
          <div className="space-y-6">
            {/* Datos base */}
            <div className="card bg-surface-container-lowest rounded-md shadow-xl">
              <div className="card-body">
                <h3 className="font-semibold text-lg mb-3">Datos Base del Cálculo</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  {[
                    ["Empleado", draftData.empleado_nombre || draftData.empleado_cedula],
                    ["Salario Base", `Bs. ${fmt(draftData.empleado_salario_base)}`],
                    ["Años de Servicio", `${Number(draftData.anios_totales).toFixed(2)} años`],
                    ["Salario Integral/Día", `Bs. ${fmt(draftData.salario_integral_dia)}`],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-base-200/50 rounded-md p-2">
                      <p className="text-on-surface-variant text-xs">{k}</p>
                      <p className="font-semibold">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Prestaciones sociales Art. 142 */}
            <div className="card bg-surface-container-lowest rounded-md shadow-xl">
              <div className="card-body">
                <h3 className="font-semibold text-lg mb-3">Prestaciones Sociales (Art. 142 LOTTT)</h3>
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-on-surface-variant border-b border-outline-variant">
                      <th className="py-1 px-2 text-left">Concepto</th>
                      <th className="py-1 px-2 text-right">Monto (Bs)</th>
                      <th className="py-1 px-2 text-right">Monto (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ConceptoRow
                      label={`Escenario A — Depósitos trimestrales + adicionales${draftData.escenario_aplicado === "A" ? " ✓" : ""}`}
                      monto_bs={draftData.escenario_a_bs}
                      tasa={draftData.tasa_dolar}
                    />
                    <ConceptoRow
                      label={`Escenario B — SID × 30 días × ${Number(draftData.anios_totales).toFixed(2)} años${draftData.escenario_aplicado === "B" ? " ✓" : ""}`}
                      monto_bs={draftData.escenario_b_bs}
                      tasa={draftData.tasa_dolar}
                    />
                    <ConceptoRow
                      label={`Prestaciones Sociales (Escenario ${draftData.escenario_aplicado} — el mayor)`}
                      monto_bs={draftData.prestaciones_bs}
                      tasa={draftData.tasa_dolar}
                      destacado
                    />
                  </tbody>
                </table>
              </div>
            </div>

            {/* Conceptos fraccionados */}
            <div className="card bg-surface-container-lowest rounded-md shadow-xl">
              <div className="card-body">
                <h3 className="font-semibold text-lg mb-3">Conceptos Fraccionados</h3>
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-on-surface-variant border-b border-outline-variant">
                      <th className="py-1 px-2 text-left">Concepto</th>
                      <th className="py-1 px-2 text-right">Días</th>
                      <th className="py-1 px-2 text-right">Monto (Bs)</th>
                      <th className="py-1 px-2 text-right">Monto (USD)</th>
                      <th className="py-1 px-2 text-left">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Vacaciones Fraccionadas", "vacaciones_fracc_bs", "vacaciones_fraccionadas"],
                      ["Bono Vacacional Fraccionado", "bono_vac_fracc_bs", "bono_vac_fraccionado"],
                      ["Utilidades Fraccionadas", "utilidades_fracc_bs", "utilidades_fraccionadas"],
                      ["Salarios Pendientes", "salarios_pendientes_bs", "salarios_pendientes"],
                      ["Intereses de Prestaciones", "intereses_bs", "intereses"],
                    ].map(([label, field, concepto]) => {
                      const linea = draftData.desglose?.find((d) => d.concepto === concepto) || {};
                      return (
                        <ConceptoRow
                          key={field}
                          label={label}
                          dias={linea.cantidad_dias}
                          monto_bs={draftData[field] ?? 0}
                          tasa={draftData.tasa_dolar}
                          obs={linea.observacion}
                        />
                      );
                    })}
                    <ConceptoRow
                      label="SUBTOTAL INGRESOS"
                      monto_bs={draftData.monto_total_bs}
                      tasa={draftData.tasa_dolar}
                      destacado
                    />
                  </tbody>
                </table>
              </div>
            </div>

            {/* Deducciones */}
            {(draftData.saldo_deudor_bs > 0) && (
              <div className="card bg-surface-container-lowest rounded-md shadow-xl border border-error/30">
                <div className="card-body">
                  <h3 className="font-semibold text-lg mb-3 text-error">Deducciones</h3>
                  <div className="flex justify-between text-sm">
                    <span>Saldo Deudor Préstamos y Anticipos</span>
                    <span className="font-bold text-error">- Bs. {fmt(draftData.saldo_deudor_bs)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Resumen final */}
            <div className="card bg-primary/10 border border-primary/30 rounded-md shadow-xl">
              <div className="card-body">
                <h3 className="font-semibold text-lg mb-3">Resumen Final</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Bruto</span>
                    <span className="font-semibold">Bs. {fmt(draftData.monto_total_bs)}</span>
                  </div>
                  {draftData.saldo_deudor_bs > 0 && (
                    <div className="flex justify-between text-error">
                      <span>(-) Deducciones</span>
                      <span className="font-semibold">Bs. {fmt(draftData.saldo_deudor_bs)}</span>
                    </div>
                  )}
                  <div className="divider my-1" />
                  <div className="flex justify-between text-lg font-bold text-primary">
                    <span>NETO A PAGAR</span>
                    <span>Bs. {fmt(draftData.monto_neto_bs)}</span>
                  </div>
                  <div className="flex justify-between text-primary">
                    <span></span>
                    <span>$ {fmt(draftData.monto_neto_usd)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn btn-ghost flex-1">Volver</button>
              <button onClick={() => setStep(3)} className="btn btn-primary flex-1">Continuar</button>
            </div>
          </div>
        )}

        {/* ── Paso 3: Confirmar ──────────────────────────────────────────── */}
        {step === 3 && draftData && (
          <div className="card bg-surface-container-lowest rounded-md shadow-xl">
            <div className="card-body space-y-4">
              <h3 className="font-semibold text-lg">Confirmar Liquidación</h3>

              <div className="alert alert-success">
                <FaCheck />
                <span>La liquidación fue calculada y guardada como <strong>Borrador</strong>. Al confirmar, podrás aprobarla desde la pantalla de detalle.</span>
              </div>

              <div className="bg-base-200/50 rounded-md p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Empleado:</span>
                  <span className="font-semibold">{draftData.empleado_nombre || draftData.empleado_cedula}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Fecha de Egreso:</span>
                  <span className="font-semibold">{new Date(draftData.fecha_egreso).toLocaleDateString("es-ES")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Escenario Aplicado:</span>
                  <span className="font-semibold">Art. 142 — Escenario {draftData.escenario_aplicado}</span>
                </div>
                <div className="divider my-1" />
                <div className="flex justify-between text-base font-bold text-primary">
                  <span>Neto a Pagar:</span>
                  <span>Bs. {fmt(draftData.monto_neto_bs)} / $ {fmt(draftData.monto_neto_usd)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn btn-ghost flex-1">Ver desglose</button>
                <button onClick={handleConfirmar} className="btn btn-success flex-1">
                  <FaCheck /> Ir al detalle
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
