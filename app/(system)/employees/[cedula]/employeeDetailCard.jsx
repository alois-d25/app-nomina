"use client";

import Link from "next/link";
import { BiChevronLeft } from "react-icons/bi";
import { FaUser, FaPhone, FaBank } from "react-icons/fa6";

export default function EmployeeDetailCard({ employee, nominaHistory }) {
  const statusColors = {
    activo: "bg-primary/10 text-primary border-primary/20",
    permiso: "bg-warning/10 text-warning border-warning/20",
    inactivo: "bg-error/10 text-error border-error/20",
  };

  const statusBadgeColor = statusColors[employee.estado] || statusColors.activo;

  return (
    <div className="flex flex-col gap-stack-lg">
      {/* Header with back button */}
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
            Cédula: {employee.cedula}
          </p>
        </div>
      </div>

      {/* Employee Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FaUser className="text-primary text-xl" />
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              Información Personal
            </h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase">
                Email
              </p>
              <p className="text-body-md text-on-surface font-medium">
                {employee.email}
              </p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase">
                Estado
              </p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-label-sm font-medium border ${statusBadgeColor}`}
              >
                {employee.estado.charAt(0).toUpperCase() + employee.estado.slice(1)}
              </span>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase">
                Años de Experiencia
              </p>
              <p className="text-body-md text-on-surface font-medium">
                {employee.anios_experiencia} años
              </p>
            </div>
          </div>
        </div>

        {/* Contact & Bank Info */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FaPhone className="text-primary text-xl" />
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              Contacto e Información Bancaria
            </h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase">
                Teléfono
              </p>
              <p className="text-body-md text-on-surface font-medium">
                {employee.telefono || "No registrado"}
              </p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase">
                Número de Cuenta
              </p>
              <p className="text-body-md text-on-surface font-medium">
                {employee.numero_cuenta || "No registrado"}
              </p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase">
                Salario Base
              </p>
              <p className="text-body-md text-on-surface font-medium">
                RD$ {parseFloat(employee.salario_base).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase">
                Tipo de Jornada
              </p>
              <p className="text-body-md text-on-surface font-medium">
                {employee.es_por_hora ? "Por horas" : "Por días"}
              </p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase">
                Jornada Semanal
              </p>
              <p className="text-body-md text-on-surface font-medium">
                {employee.es_por_hora
                  ? (employee.horas_trabajadas_semana != null
                      ? `${employee.horas_trabajadas_semana} h/semana`
                      : "No registrado")
                  : (employee.dias_trabajados_semana != null
                      ? `${employee.dias_trabajados_semana} días/semana`
                      : "No registrado")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Nomina History */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 shadow-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">
          Historial de Nóminas
        </h2>

        {nominaHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/30">
                  <th className="p-3 text-label-sm text-on-surface-variant uppercase">
                    Fecha de Pago
                  </th>
                  <th className="p-3 text-label-sm text-on-surface-variant uppercase text-right">
                    Salario Base
                  </th>
                  <th className="p-3 text-label-sm text-on-surface-variant uppercase text-right">
                    Total Ingresos
                  </th>
                  <th className="p-3 text-label-sm text-on-surface-variant uppercase text-right">
                    Deducciones
                  </th>
                  <th className="p-3 text-label-sm text-on-surface-variant uppercase text-right">
                    Cesta Ticket
                  </th>
                  <th className="p-3 text-label-sm text-on-surface-variant uppercase text-right">
                    Salario Final
                  </th>
                </tr>
              </thead>
              <tbody>
                {nominaHistory.map((nomina) => {
                  const fechaPago = new Date(nomina.fecha_pago + "T00:00:00").toLocaleDateString("es-ES");
                  const totalFinal = parseFloat(nomina.salario_final_bs || 0);

                  return (
                    <tr
                      key={nomina.nomina_id}
                      className="border-b border-outline-variant/20 hover:bg-surface-container/50 transition-colors"
                    >
                      <td className="p-3 text-body-md text-on-surface">
                        {fechaPago}
                      </td>
                      <td className="p-3 text-body-md text-on-surface text-right font-medium">
                        {parseFloat(nomina.salario_base).toFixed(2)}
                      </td>
                      <td className="p-3 text-body-md text-primary text-right font-medium">
                        {parseFloat(nomina.total_ingresos).toFixed(2)}
                      </td>
                      <td className="p-3 text-body-md text-error text-right font-medium">
                        {parseFloat(nomina.total_deducciones).toFixed(2)}
                      </td>
                      <td className="p-3 text-body-md text-secondary text-right font-medium">
                        {nomina.cestaticket ? parseFloat(nomina.cestaticket).toFixed(2) : "0.00"}
                      </td>
                      <td className="p-3 text-body-md text-on-surface text-right font-bold bg-surface-container/30">
                        {totalFinal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-on-surface-variant text-body-md">
              No hay registros de nómina para este empleado
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
