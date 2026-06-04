"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BiChevronLeft } from "react-icons/bi";

export default function EmployeeNominaHistory({ employee, nominaHistory }) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-stack-lg">
      {/* Header */}
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
            Cédula: {employee.cedula} · Historial de Nóminas
          </p>
        </div>
      </div>

      {/* History table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/20">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            Últimas Nóminas
          </h2>
        </div>

        {nominaHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-container-low text-label-sm text-on-surface-variant uppercase">
                  <th className="p-4">Fecha de Pago</th>
                  <th className="p-4 text-right">Salario Base</th>
                  <th className="p-4 text-right">Total Ingresos</th>
                  <th className="p-4 text-right">Total Deducciones</th>
                  <th className="p-4 text-right">Salario Final (Bs)</th>
                  <th className="p-4 text-right">Salario Final (USD)</th>
                  <th className="p-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {nominaHistory.map((nomina, idx) => {
                  const fechaPago = new Date(nomina.fecha_pago + "T00:00:00").toLocaleDateString("es-ES");
                  return (
                    <tr
                      key={idx}
                      className="border-b border-outline-variant/20 hover:bg-surface-container/40 transition-colors cursor-pointer"
                      onClick={() => router.push(`/nomina/${nomina.nomina_id}/employees/${employee.cedula}`)}
                    >
                      <td className="p-4 text-body-md text-on-surface font-medium">
                        {fechaPago}
                      </td>
                      <td className="p-4 text-right font-medium text-on-surface">
                        {parseFloat(nomina.salario_base).toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-medium text-primary">
                        {parseFloat(nomina.total_ingresos).toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-medium text-error">
                        {parseFloat(nomina.total_deducciones).toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-medium text-on-surface bg-surface-container/30">
                        {parseFloat(nomina.salario_final_bs).toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-medium text-primary-fixed-dim bg-surface-container/30">
                        ${parseFloat(nomina.salario_final_usd).toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-label-sm text-primary hover:underline font-medium">
                          Ver Detalle
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-on-surface-variant text-body-md">
            No hay registros de nómina para este empleado
          </div>
        )}
      </div>
    </div>
  );
}
