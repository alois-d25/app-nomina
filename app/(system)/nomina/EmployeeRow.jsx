"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { CiWarning } from "react-icons/ci";


const EmployeeRow = ({
  employee,
  nominaId,
  onToggleCheck,
  exchangeRate
}) => {
  const router = useRouter();

  const totalUsd = employee.baseSalary + employee.bonuses + employee.deductions;
  const totalBs = totalUsd * exchangeRate;

  let statusClass = "";
  let statusTextClass = "";
  switch (employee.status) {
    case "Borrador":
      statusClass = "bg-primary/20 border-primary/30";
      statusTextClass = "text-on-primary-container";
      break;
    case "Pendiente":
      statusClass = "bg-tertiary-container border-tertiary-container/80";
      statusTextClass = "text-on-tertiary-container";
      break;
    case "Pagada":
      statusClass = "bg-primary border-primary/80";
      statusTextClass = "text-on-primary";
      break;
  }

  const handleRowClick = () => {
    if (nominaId) {
      router.push(`/nomina/${nominaId}/employees/${employee.id}`);
    }
  };

  return (
    <tr
      className={`transition-colors rounded-sm ${nominaId ? 'cursor-pointer hover:bg-gray-300' : 'cursor-default'}`}
      onClick={handleRowClick}
    >
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-medium text-primary hover:underline">
              {employee.name}
            </p>
            <p className="text-on-surface-variant text-body-sm">
              Cedula: {employee.id}
            </p>
          </div>
        </div>
      </td>
      <td className="p-4 text-right font-medium">
        {employee.baseSalary.toFixed(2)}
      </td>
      <td className="p-4 text-right text-primary">
        {employee.bonuses.toFixed(2)}
      </td>
      <td className="p-4 text-right text-error">
        {employee.deductions.toFixed(2)}
      </td>
      <td className="p-4 text-right text-secondary">
        {employee.cestaticket ? parseFloat(employee.cestaticket).toFixed(2) : "0.00"}
      </td>
      <td className="p-4 text-right font-bold bg-surface-container/10">
        Bs.{totalBs.toFixed(2)}
      </td>
      <td className="p-4 text-right font-bold text-primary-fixed-dim bg-surface-container/10">
        ${totalUsd.toFixed(2)}
      </td>
      <td className="p-4 text-center">
        <span
          className={`inline-block ${statusClass} ${statusTextClass} font-label-sm text-label-sm px-2.5 py-1 rounded-full border`}
        >
          {employee.status}
        </span>
      </td>
    </tr>
  );
};

export default EmployeeRow;
