"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft, FaCheck, FaDownload } from "react-icons/fa6";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function fmt(n) {
  if (n == null || n === undefined) return "—";
  return Number(n).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDias(n) {
  if (n == null) return "—";
  return Number(n).toFixed(2);
}

const ESTADO_COLORS = {
  Borrador: "badge-ghost",
  Pendiente: "badge-warning",
  Aprobada: "badge-success",
  Completada: "badge-info",
};

function SectionTitle({ children }) {
  return (
    <h3 className="font-semibold text-base text-on-surface mb-3 flex items-center gap-2">
      {children}
    </h3>
  );
}

function RowDato({ label, value, highlight }) {
  return (
    <div className={`flex justify-between py-1.5 border-b border-outline-variant/40 last:border-0 ${highlight ? "font-bold text-primary" : ""}`}>
      <span className="text-on-surface-variant text-sm">{label}</span>
      <span className="font-medium text-sm">{value}</span>
    </div>
  );
}

function ConceptoRow({ label, dias, monto_bs, monto_usd, obs, esDeduccion, subtotal, destacado }) {
  const rowClass = [
    "text-sm",
    esDeduccion ? "text-error" : "",
    subtotal ? "font-bold border-t border-outline-variant" : "",
    destacado ? "bg-primary/10 font-bold" : "",
  ].filter(Boolean).join(" ");

  return (
    <tr className={rowClass}>
      <td className="py-1.5 px-2">{label}</td>
      <td className="py-1.5 px-2 text-right tabular-nums">{dias != null ? fmtDias(dias) : "—"}</td>
      <td className={`py-1.5 px-2 text-right tabular-nums ${esDeduccion ? "text-error" : "text-primary"}`}>
        {esDeduccion ? "-" : ""}Bs. {fmt(monto_bs)}
      </td>
      <td className={`py-1.5 px-2 text-right tabular-nums ${esDeduccion ? "text-error" : "text-on-surface-variant"}`}>
        {esDeduccion ? "-" : ""}$ {fmt(monto_usd)}
      </td>
      {obs !== undefined && (
        <td className="py-1.5 px-2 text-xs text-on-surface-variant hidden lg:table-cell">{obs || ""}</td>
      )}
    </tr>
  );
}

export default function LiquidacionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const liquidacionId = params.id;

  const [liq, setLiq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/liquidaciones/${liquidacionId}`);
        setLiq(res.data?.liquidacion || res.data);
      } catch {
        toast.error("Error al cargar la liquidación");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [liquidacionId]);

  const handleApprove = async () => {
    if (!window.confirm("¿Aprobar esta liquidación? El empleado será marcado como INACTIVO y no aparecerá en futuras nóminas.")) return;

    setApproving(true);
    try {
      const res = await axios.post(`${API_URL}/api/liquidaciones/${liquidacionId}/approve`);
      setLiq(res.data?.liquidacion || res.data);
      toast.success("Liquidación aprobada. Empleado marcado como inactivo.");
      router.refresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al aprobar liquidación");
    } finally {
      setApproving(false);
    }
  };

  const handleExport = async () => {
    setDownloading(true);
    try {
      const res = await axios.get(`${API_URL}/api/liquidaciones/${liquidacionId}/recibo`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `Liquidacion_${liq.empleado_cedula}_${liq.fecha_egreso}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al descargar el recibo");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!liq) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-error">Liquidación no encontrada</p>
      </div>
    );
  }

  const tasa = liq.tasa_dolar || 1;
  const desglose = Object.fromEntries((liq.desglose || []).map((d) => [d.concepto, d]));

  const conceptosFraccionados = [
    { label: "Vacaciones Fraccionadas", field: "vacaciones_fracc_bs", key: "vacaciones_fraccionadas" },
    { label: "Bono Vacacional Fraccionado", field: "bono_vac_fracc_bs", key: "bono_vac_fraccionado" },
    { label: "Utilidades Fraccionadas", field: "utilidades_fracc_bs", key: "utilidades_fraccionadas" },
    { label: "Salarios Pendientes", field: "salarios_pendientes_bs", key: "salarios_pendientes" },
    { label: "Intereses de Prestaciones", field: "intereses_bs", key: "intereses" },
  ];

  const subtotalFracc = conceptosFraccionados.reduce((s, c) => s + (liq[c.field] || 0), 0);

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <Link href="/liquidaciones" className="btn btn-ghost btn-sm">
            <FaArrowLeft /> Volver
          </Link>
          <h2 className="text-2xl font-bold text-base-content flex-1">Detalle de Liquidación #{liq.liquidacion_id}</h2>
          <span className={`badge badge-lg ${ESTADO_COLORS[liq.estado] || "badge-ghost"}`}>{liq.estado}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Columna Principal ──────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Información del empleado */}
            <div className="card bg-surface-container-lowest rounded-md shadow-xl">
              <div className="card-body">
                <SectionTitle>Información del Empleado</SectionTitle>
                <RowDato label="Cédula" value={liq.empleado_cedula} />
                <RowDato label="Nombre" value={liq.empleado_nombre || "—"} />
                <RowDato label="Salario Base Mensual" value={`Bs. ${fmt(liq.empleado_salario_base)}`} />
                <RowDato label="Fecha de Egreso" value={new Date(liq.fecha_egreso).toLocaleDateString("es-ES")} />
                <RowDato label="Causa de Egreso" value={liq.causa_egreso} />
                <RowDato label="Años de Servicio" value={`${Number(liq.anios_totales).toFixed(2)} años`} />
              </div>
            </div>

            {/* Datos base del cálculo */}
            <div className="card bg-surface-container-lowest rounded-md shadow-xl">
              <div className="card-body">
                <SectionTitle>Datos Base del Cálculo</SectionTitle>
                <RowDato label="Salario Integral Diario (SID)" value={`Bs. ${fmt(liq.salario_integral_dia)}`} />
                <RowDato label="Tasa de Cambio" value={`Bs. ${fmt(tasa)} / USD`} />
                <RowDato label="Escenario Art. 142 Aplicado" value={`Escenario ${liq.escenario_aplicado} (el mayor)`} />
              </div>
            </div>

            {/* Prestaciones sociales Art. 142 */}
            <div className="card bg-surface-container-lowest rounded-md shadow-xl">
              <div className="card-body">
                <SectionTitle>Prestaciones Sociales (Art. 142 LOTTT)</SectionTitle>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-on-surface-variant border-b border-outline-variant">
                        <th className="py-1 px-2 text-left font-medium">Concepto</th>
                        <th className="py-1 px-2 text-right font-medium">Monto (Bs)</th>
                        <th className="py-1 px-2 text-right font-medium">Monto (USD)</th>
                        <th className="py-1 px-2 text-left font-medium hidden lg:table-cell">Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      <ConceptoRow
                        label={`Escenario A — Histórico + adicionales${liq.escenario_aplicado === "A" ? " ✓" : ""}`}
                        monto_bs={liq.escenario_a_bs}
                        monto_usd={liq.escenario_a_bs / tasa}
                        obs={liq.escenario_aplicado === "A" ? "Escenario aplicado" : "No aplicado"}
                        destacado={liq.escenario_aplicado === "A"}
                      />
                      <ConceptoRow
                        label={`Escenario B — SID × 30 días × ${Number(liq.anios_totales).toFixed(2)} años${liq.escenario_aplicado === "B" ? " ✓" : ""}`}
                        monto_bs={liq.escenario_b_bs}
                        monto_usd={liq.escenario_b_bs / tasa}
                        obs={liq.escenario_aplicado === "B" ? "Escenario aplicado" : "No aplicado"}
                        destacado={liq.escenario_aplicado === "B"}
                      />
                      <ConceptoRow
                        label={`PRESTACIONES SOCIALES (Escenario ${liq.escenario_aplicado})`}
                        monto_bs={liq.prestaciones_bs}
                        monto_usd={liq.prestaciones_bs / tasa}
                        subtotal
                      />
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Conceptos fraccionados */}
            <div className="card bg-surface-container-lowest rounded-md shadow-xl">
              <div className="card-body">
                <SectionTitle>Conceptos Fraccionados</SectionTitle>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-on-surface-variant border-b border-outline-variant">
                        <th className="py-1 px-2 text-left font-medium">Concepto</th>
                        <th className="py-1 px-2 text-right font-medium">Días</th>
                        <th className="py-1 px-2 text-right font-medium">Monto (Bs)</th>
                        <th className="py-1 px-2 text-right font-medium">Monto (USD)</th>
                        <th className="py-1 px-2 text-left font-medium hidden lg:table-cell">Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conceptosFraccionados.map(({ label, field, key }) => {
                        const linea = desglose[key] || {};
                        const monto = liq[field] || 0;
                        return (
                          <ConceptoRow
                            key={key}
                            label={label}
                            dias={linea.cantidad_dias}
                            monto_bs={monto}
                            monto_usd={monto / tasa}
                            obs={linea.observacion}
                          />
                        );
                      })}
                      <ConceptoRow
                        label="SUBTOTAL FRACCIONADOS"
                        monto_bs={subtotalFracc}
                        monto_usd={subtotalFracc / tasa}
                        subtotal
                      />
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Deducciones */}
            <div className="card bg-surface-container-lowest rounded-md shadow-xl">
              <div className="card-body">
                <SectionTitle>Deducciones</SectionTitle>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-on-surface-variant border-b border-outline-variant">
                        <th className="py-1 px-2 text-left font-medium">Concepto</th>
                        <th className="py-1 px-2 text-right font-medium">Días</th>
                        <th className="py-1 px-2 text-right font-medium">Monto (Bs)</th>
                        <th className="py-1 px-2 text-right font-medium">Monto (USD)</th>
                        <th className="py-1 px-2 text-left font-medium hidden lg:table-cell">Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      <ConceptoRow
                        label="Saldo Deudor Préstamos y Anticipos"
                        monto_bs={liq.saldo_deudor_bs || 0}
                        monto_usd={(liq.saldo_deudor_bs || 0) / tasa}
                        obs={(desglose["saldo_deudor"] || {}).observacion}
                        esDeduccion
                      />
                      <ConceptoRow
                        label="TOTAL DEDUCCIONES"
                        monto_bs={liq.saldo_deudor_bs || 0}
                        monto_usd={(liq.saldo_deudor_bs || 0) / tasa}
                        esDeduccion
                        subtotal
                      />
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Resumen final */}
            <div className="card bg-primary/5 border border-primary/20 rounded-md shadow-xl">
              <div className="card-body">
                <SectionTitle>Resumen Final</SectionTitle>
                <RowDato label="Total Bruto (Bs)" value={`Bs. ${fmt(liq.monto_total_bs)}`} />
                <RowDato label="Total Bruto (USD)" value={`$ ${fmt(liq.monto_total_usd)}`} />
                {(liq.saldo_deudor_bs > 0) && (
                  <RowDato label="(-) Deducciones (Bs)" value={`- Bs. ${fmt(liq.saldo_deudor_bs)}`} />
                )}
                <div className="mt-2 pt-2 border-t-2 border-primary/30">
                  <RowDato label="NETO A PAGAR (Bs)" value={`Bs. ${fmt(liq.monto_neto_bs)}`} highlight />
                  <RowDato label="NETO A PAGAR (USD)" value={`$ ${fmt(liq.monto_neto_usd)}`} highlight />
                </div>
              </div>
            </div>
          </div>

          {/* ── Sidebar Acciones ───────────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="card bg-surface-container-lowest rounded-md shadow-xl sticky top-8">
              <div className="card-body space-y-3">
                <h3 className="font-semibold text-lg">Acciones</h3>

                {liq.estado === "Borrador" && (
                  <button onClick={handleApprove} disabled={approving} className="btn btn-success w-full">
                    <FaCheck />
                    {approving ? "Aprobando..." : "Aprobar Liquidación"}
                  </button>
                )}

                <button onClick={handleExport} disabled={downloading} className="btn btn-outline w-full">
                  <FaDownload />
                  {downloading ? "Generando..." : "Descargar Recibo (Excel)"}
                </button>

                {liq.estado === "Aprobada" && (
                  <div className="alert alert-success text-sm">
                    <FaCheck />
                    <span>Aprobada. El empleado fue marcado como <strong>inactivo</strong>.</span>
                  </div>
                )}

                {/* Resumen rápido en sidebar */}
                <div className="divider text-xs">Resumen</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Escenario</span>
                    <span className="font-semibold">Art. 142 — {liq.escenario_aplicado}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Prestaciones</span>
                    <span>Bs. {fmt(liq.prestaciones_bs)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Fraccionados</span>
                    <span>Bs. {fmt(subtotalFracc)}</span>
                  </div>
                  {liq.saldo_deudor_bs > 0 && (
                    <div className="flex justify-between text-error">
                      <span>Deducciones</span>
                      <span>- Bs. {fmt(liq.saldo_deudor_bs)}</span>
                    </div>
                  )}
                  <div className="pt-1 border-t border-outline-variant flex justify-between font-bold text-primary">
                    <span>Neto</span>
                    <span>Bs. {fmt(liq.monto_neto_bs)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
