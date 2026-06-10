"use client";

import Link from "next/link";
import { BiChevronLeft } from "react-icons/bi";
import { FaUser, FaDownload } from "react-icons/fa6";
import { MdAccountBalance } from "react-icons/md";
import { useState } from "react";

export default function NominaEmpleadoDetalle({ detalle, employee }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const fechaPago = new Date(detalle.fecha_pago + "T00:00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleDownloadPayslip = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/nominas/${detalle.nomina_id}/empleado/${detalle.empleado_cedula}/payslip`
      );
      if (!response.ok) throw new Error("Error descargando recibo");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Recibo_${employee.cedula}_${detalle.fecha_pago}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error:", error);
      alert("Error al descargar el recibo de pago.");
    } finally {
      setIsDownloading(false);
    }
  };

  const totalBonos = detalle.bonos.reduce((s, b) => s + b.monto_aplicado, 0);
  const totalDeducciones = detalle.deducciones.reduce((s, d) => s + d.monto_aplicado, 0);
  const cestaticket = parseFloat(detalle.cestaticket_aplicado || 0);

  return (
    <div className="flex flex-col gap-stack-lg">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/nomina"
            className="p-2 hover:bg-surface-container rounded-lg transition-colors"
          >
            <BiChevronLeft className="text-2xl" />
          </Link>
          <div>
            <h1 className="text-headline-lg font-headline-lg text-on-surface">
              {employee.nombre} {employee.apellido}
            </h1>
            <p className="text-body-md text-on-surface-variant">
              Cédula: {employee.cedula} · Nómina del {fechaPago}
            </p>
          </div>
        </div>
        <button
          onClick={handleDownloadPayslip}
          disabled={isDownloading}
          className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <FaDownload /> {isDownloading ? "Descargando..." : "Descargar Recibo"}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard label="Salario Base" value={detalle.salario_base} color="text-on-surface" />
        <SummaryCard label="Total Bonos" value={totalBonos} color="text-primary" />
        <SummaryCard label="Cesta Ticket" value={cestaticket} color="text-secondary" />
        <SummaryCard label="Total Deducciones" value={totalDeducciones} color="text-error" />
        <SummaryCard label="Salario Final (Bs)" value={detalle.salario_final_bs} color="text-on-surface font-bold" />
      </div>

      {/* USD row */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <MdAccountBalance />
          <span className="text-body-md">Equivalente en USD (tasa {detalle.tasa_dolar?.toFixed(2)})</span>
        </div>
        <span className="text-headline-sm font-headline-sm text-primary font-bold">
          ${detalle.salario_final_usd?.toFixed(2)}
        </span>
      </div>

      {/* Bonos table */}
      <Section title="Bonos Aplicados" count={detalle.bonos.length} accentClass="text-primary">
        {detalle.bonos.length > 0 ? (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant/30 text-label-sm text-on-surface-variant uppercase">
                <th className="p-3">Nombre</th>
                <th className="p-3">Descripción</th>
                <th className="p-3 text-center">Tipo</th>
                <th className="p-3 text-right">Monto Aplicado (Bs)</th>
              </tr>
            </thead>
            <tbody>
              {detalle.bonos.map((b) => (
                <tr key={b.bono_id} className="border-b border-outline-variant/20 hover:bg-surface-container/40">
                  <td className="p-3 font-medium text-on-surface">{b.nombre}</td>
                  <td className="p-3 text-on-surface-variant text-body-sm">{b.descripcion || "—"}</td>
                  <td className="p-3 text-center">
                    <TypeBadge tipo={b.tipo_pago} />
                  </td>
                  <td className="p-3 text-right font-medium text-primary">
                    {b.monto_aplicado.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-outline-variant/40 bg-surface-container/20">
                <td colSpan={3} className="p-3 font-bold text-on-surface text-right">Total Bonos</td>
                <td className="p-3 text-right font-bold text-primary">{totalBonos.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <EmptyState message="No se aplicaron bonos en esta nómina." />
        )}
      </Section>

      {/* Cestaticket section */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center gap-2">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Cesta Ticket</h2>
          <span className="text-label-sm font-medium px-2 py-0.5 rounded-full bg-surface-container text-secondary">
            mensual
          </span>
        </div>
        {cestaticket > 0 ? (
          <div className="p-6 flex items-center justify-between">
            <div>
              <p className="text-body-md text-on-surface-variant">Monto aplicado este mes</p>
              <p className="text-body-sm text-on-surface-variant/70 mt-1">
                Calculado en 2da quincena · sujeto a reducción por inasistencias
              </p>
            </div>
            <span className="text-headline-md font-headline-md font-bold text-secondary">
              {cestaticket.toFixed(2)} $
            </span>
          </div>
        ) : (
          <div className="py-8 text-center text-on-surface-variant text-body-md">
            No se aplicó cesta ticket en esta nómina.
          </div>
        )}
      </div>

      {/* Deducciones table */}
      <Section title="Deducciones Aplicadas" count={detalle.deducciones.length} accentClass="text-error">
        {detalle.deducciones.length > 0 ? (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant/30 text-label-sm text-on-surface-variant uppercase">
                <th className="p-3">Nombre</th>
                <th className="p-3">Descripción</th>
                <th className="p-3 text-center">Fórmula</th>
                <th className="p-3 text-center">Tipo</th>
                <th className="p-3 text-right">Monto Aplicado (Bs)</th>
              </tr>
            </thead>
            <tbody>
              {detalle.deducciones.map((d) => (
                <tr key={d.deduccion_id} className="border-b border-outline-variant/20 hover:bg-surface-container/40">
                  <td className="p-3 font-medium text-on-surface">{d.nombre}</td>
                  <td className="p-3 text-on-surface-variant text-body-sm">{d.descripcion || "—"}</td>
                  <td className="p-3 text-center">
                    <span className="text-label-sm bg-surface-container px-2 py-0.5 rounded font-mono">
                      {d.formula_calculo}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <TypeBadge tipo={d.tipo_pago} />
                  </td>
                  <td className="p-3 text-right font-medium text-error">
                    {d.monto_aplicado.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-outline-variant/40 bg-surface-container/20">
                <td colSpan={4} className="p-3 font-bold text-on-surface text-right">Total Deducciones</td>
                <td className="p-3 text-right font-bold text-error">{totalDeducciones.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <EmptyState message="No se aplicaron deducciones en esta nómina." />
        )}
      </Section>
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 shadow-sm">
      <p className="text-label-sm text-on-surface-variant uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-headline-sm font-headline-sm font-bold ${color}`}>
        {parseFloat(value).toFixed(2)}
      </p>
    </div>
  );
}

function Section({ title, count, accentClass, children }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center gap-2">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">{title}</h2>
        <span className={`text-label-sm font-medium px-2 py-0.5 rounded-full bg-surface-container ${accentClass}`}>
          {count}
        </span>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function TypeBadge({ tipo }) {
  const styles = {
    mensual: "bg-primary/10 text-primary",
    quincenal: "bg-secondary/10 text-secondary",
    unico: "bg-tertiary/10 text-tertiary",
  };
  return (
    <span className={`text-label-sm px-2 py-0.5 rounded-full font-medium ${styles[tipo] || "bg-surface-container text-on-surface-variant"}`}>
      {tipo}
    </span>
  );
}

function EmptyState({ message }) {
  return (
    <div className="py-8 text-center text-on-surface-variant text-body-md">{message}</div>
  );
}
