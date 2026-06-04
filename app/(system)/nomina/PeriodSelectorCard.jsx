import React from "react";
import { BsCalendarMonth } from "react-icons/bs";

const getMonthName = (monthNumber) => {
  const date = new Date();
  date.setMonth(monthNumber - 1);
  return date.toLocaleString("es-ES", { month: "long" });
};

const PeriodSelectorCard = ({ period, setPeriod, setPage }) => {
  return (
    <div className="col-span-1 md:col-span-2 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/30 shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
      <div>
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2 mb-4">
          <BsCalendarMonth />
          Período de Pago
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="font-label-md text-label-md text-on-surface-variant">
              Seleccionar Período
            </label>
            <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
              <div className="font-headline-sm text-primary text-headline-sm">
                {getMonthName(period.month).charAt(0).toUpperCase() + getMonthName(period.month).slice(1)}
              </div>
              <div className="font-body-md text-on-surface-variant">
                {period.quincena === 1 ? "1-15" : "16-30"} de {getMonthName(period.month)} • {period.year}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">
              Cambiar fecha
            </label>
            <input
              type="date"
              className="rounded-lg border border-outline-variant bg-surface-bright text-body-md py-2.5 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              value={`${period.year}-${String(period.month).padStart(2, "0")}-${period.quincena === 1 ? "15" : "30"}`}
              onChange={(e) => {
                if (!e.target.value) return;
                const date = new Date(e.target.value + "T00:00:00");
                const y = date.getFullYear();
                const m = date.getMonth() + 1;
                const d = date.getDate();
                setPeriod({ year: y, month: m, quincena: d <= 15 ? 1 : 2 });
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeriodSelectorCard;