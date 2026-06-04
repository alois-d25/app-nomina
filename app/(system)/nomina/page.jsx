"use client";

import React, { useState, useEffect, useCallback } from "react";
import EmployeeRow from "./EmployeeRow"; // Adjust path as needed
import { FaDownload } from "react-icons/fa6";
import { MdAccountBalance, MdFilterList, MdHistory, MdPlayArrow } from "react-icons/md";
import { BiCheckCircle, BiChevronLeft, BiChevronRight, BiSearch } from "react-icons/bi";
import { NominaService } from "@/services/payroll.service";
import PayrollActionModal from "./PayrollActionModal";
import PeriodSelectorCard from "./PeriodSelectorCard";
import ExchangeRateCard from "./ExchangeRateCard";
import { ExchangeRateService } from "@/services/exchangeRate.service";
import Can from "@/components/Can";
import { PERMISSIONS } from "@/app/config/permissions";
import { toast } from "react-toastify";

export default function NominaPage() {
  // Función para calcular el periodo inicial según la fecha actual
  const getInitialPeriod = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const quincena = day <= 15 ? 1 : 2;

    return { month, year, quincena };
  };

  const [period, setPeriod] = useState(getInitialPeriod());
  const [employees, setEmployees] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [nomina, setNomina] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [modalType, setModalType] = useState("bono"); // "bono" or "deduccion"
  const pageSize = 10;
  const [exchangeRates, setExchangeRates] = useState(null);
  const [usedExchangeRate, setUsedExchangeRate] = useState(null);


  const fetchNominaData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Buscar el encabezado de la nómina por periodo (mes, año, quincena)
      const nomina = await NominaService.getPayrollPeriod(period);
      setNomina(nomina);
      if (!nomina) {
        setEmployees([]);
        console.log("No se encontró una nómina para este periodo.");
        return;
      }

      
      // 2. Obtener el desglose de pagos de los empleados vinculados con paginación
      const skip = (page - 1) * pageSize;
      const response = await NominaService.getEmployeesPayrollInfo(nomina.id, skip, pageSize);

      // response ahora es { items: [], total: number }
      const details = response.items || [];
      setTotalRecords(response.total || 0);

      // Mapear los datos del backend al formato que espera EmployeeRow
      const mappedEmployees = details.map(emp => ({
        id: emp.empleado_cedula,
        name: emp.nombre,
        baseSalary: parseFloat(emp.salario_base),
        bonuses: parseFloat(emp.total_ingresos) - parseFloat(emp.salario_base),
        deductions: -parseFloat(emp.total_deducciones),
        cestaticket: parseFloat(emp.cestaticket_aplicado || 0),
        events: 0,
        status: "Procesada",
        avatarInitials: String(emp.empleado_cedula).substring(0, 2),
        avatarBgClass: "bg-primary-container",
        isChecked: false,
      }));

      setEmployees(mappedEmployees);
    } catch (error) {
      console.error("Error fetching payroll data:", error);
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  }, [period, page]);

  useEffect(() => {
    fetchNominaData();
  }, [fetchNominaData]);

  const handleOpenModal = (type) => {
    setModalType(type);
    setIsActionModalOpen(true);
  };

  const handleCreateAction = async (formData) => {
    try {
      const { selectedEmployees, ...eventData } = formData;
      // selectedEmployees is already an array of IDs from the EmployeeSelector
      const employeeIds = selectedEmployees;

      await NominaService.createPayrollEvent(
        eventData,
        employeeIds,
        modalType,
      );

      setIsActionModalOpen(false);
      fetchNominaData(); // Recargar para ver los totales actualizados
      toast.success(modalType === "bono" ? "Bono creado exitosamente" : "Deducción creada exitosamente");
    } catch (error) {
      console.error(`Error al crear el ${modalType}:`, error);
      toast.error(`No se pudo crear el ${modalType === "bono" ? "bono" : "deducción"}`);
    }
  };

  const handleToggleCheck = (id) => {
    setEmployees((prevEmployees) =>
      prevEmployees.map((emp) =>
        emp.id === id ? { ...emp, isChecked: !emp.isChecked } : emp,
      ),
    );
  };

  const handleSelectAll = () => {
    setSelectAll(!selectAll);
    setEmployees((prevEmployees) =>
      prevEmployees.map((emp) => ({ ...emp, isChecked: !selectAll })),
    );
  };

  const canCalculateNomina = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for date comparison
    const fechaPago = new Date(
      period.quincena === 1
        ? `${period.year}-${String(period.month).padStart(2, '0')}-15`
        : `${period.year}-${String(period.month).padStart(2, '0')}-30`
    );
    return fechaPago >= today; // Available for today and future dates
  };

  const handleCreateNomina = async () => {
    try {
      if (!canCalculateNomina()) {
        alert("No se puede calcular una nómina para una fecha futura.");
        return;
      }

      const fechaPago = period.quincena === 1
        ? `${period.year}-${String(period.month).padStart(2, '0')}-15`
        : `${period.year}-${String(period.month).padStart(2, '0')}-30`;

      const tasaPago = exchangeRates?.usd || 36.54;

      if (nomina?.id) {
        // Recalculate existing nomina
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const response = await fetch(`${API_URL}/api/nominas/${nomina.id}/recalcular`, {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || "Error recalculando la nómina");
        }
      } else {
        // Create new nomina
        await NominaService.createNomina(fechaPago, tasaPago);
      }

      setPage(1);
      await fetchNominaData();
      toast.success("Nómina generada exitosamente");
    } catch (error) {
      toast.error("Error al crear la nómina. Por favor intente de nuevo.");
      console.error("Error calculando nómina:", error);
      const msg = error.message || error.response?.data?.detail || "Error al calcular la nómina";
      alert(msg);
    }
  };

  const handleGenerateReport = async () => {
    if (!nomina) {
      alert("No hay nómina para este período.");
      return;
    }
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/nominas/${nomina.id}/reporte`
      );
      if (!response.ok) throw new Error("Error descargando reporte");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Nomina_${nomina.id}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Error al generar el reporte.");
    }
  };

  const handleAprobarNomina = async () => {
    if (!nomina?.id) {
      alert("No hay nómina para este período.");
      return;
    }
    if (nomina.aprobada) {
      alert("Esta nómina ya ha sido aprobada.");
      return;
    }
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/nominas/${nomina.id}/aprobar`,
        { method: "POST" }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Error aprobando la nómina");
      }
      alert("Nómina aprobada exitosamente.");
      await fetchNominaData();
    } catch (error) {
      console.error("Error aprobando nómina:", error);
      alert(error.message || "Error al aprobar la nómina.");
    }
  };

  const totalEstimatedPayrollBs = employees.reduce(
    (sum, emp) => sum + (emp.baseSalary + emp.bonuses + emp.deductions),
    0,
  );


  useEffect(() => {
    // 1. Definimos la función de forma interna y aislada
    const fetchRates = async () => {
      try {
        const [data, systemExchangeRate] = await Promise.all([
          ExchangeRateService.getCurrentBCVPrice(),
          ExchangeRateService.getHistory()
        ]);
        setExchangeRates(data);
        const historialOrdenado = Array.isArray(systemExchangeRate)
          ? systemExchangeRate.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
          : [];
        setUsedExchangeRate(historialOrdenado.length > 0 ? historialOrdenado[0].valor : null);
      } catch (error) {
        console.error("Error en la petición:", error);
      }
    };

    // 2. La ejecutamos inmediatamente
    fetchRates();

    // 3. Array vacío: solo se ejecuta una vez cuando el componente se monta
  }, []);

      

  return (
    <main className="flex-1 p-gutter md:p-margin-page max-w-container-max mx-auto w-full flex flex-col gap-stack-lg">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1">
            Gestión de Nóminas
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Generación y administración del ciclo de pagos institucional.
          </p>
        </div>
        <div className="flex gap-3">
          <Can permission={PERMISSIONS.NOMINAS_CREAR}>
            <button 
            onClick={() => handleOpenModal("bono")}
            className="px-4 py-2 rounded-lg border border-primary text-primary font-label-md text-label-md hover:bg-primary/5 transition-colors flex items-center gap-2"
          >
            <span className="text-lg">+</span> Nuevo Bono
          </button>
          <button 
            onClick={() => handleOpenModal("deduccion")}
            className="px-4 py-2 rounded-lg border border-error text-error font-label-md text-label-md hover:bg-error/5 transition-colors flex items-center gap-2"
          >
            <span className="text-lg">-</span> Nueva Deducción
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={!nomina}
            className="hidden md:flex px-4 py-2 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaDownload /> Descargar Informe
          </button>
          </Can>
          {/* <button className="hidden md:flex px-4 py-2 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors items-center gap-2">
            <span className="material-symbols-outlined flex items-center gap-2" data-icon="download">
              <FaDownload></FaDownload> Generar Informe
            </span>
          </button> */}
          <Can permission={PERMISSIONS.NOMINAS_CREAR}>
            {canCalculateNomina() &&
          <button onClick={handleCreateNomina} className="px-5 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2">
            <MdPlayArrow className="text-2xl"></MdPlayArrow>
            {nomina?.id ? "Recalcular Nómina" : "Calcular Nómina"}
          </button>
}
          </Can>
        </div>
      </div>

      {/* Configuration Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PeriodSelectorCard
          period={period}
          setPeriod={setPeriod}
          setPage={setPage}
        />

        <ExchangeRateCard exchangeRate={exchangeRates?.usd || 36.54} usedExchangeRate={usedExchangeRate} />
      </div>

      {/* Data Table Card */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-[0_4px_12px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-secondary-container bg-surface-bright flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Detalle de Empleados
            </span>
            <span className="bg-surface-container text-on-surface-variant font-label-sm text-label-sm px-2 py-1 rounded-full">
              {employees.length} Registros
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <MdFilterList className="absolute left-3 top-2 text-text-secondary pointer-events-none text-body-md"></MdFilterList>
              <select className="pl-10 pr-8 py-1.5 rounded-lg border-outline-variant/50 bg-surface text-body-sm focus:ring-primary focus:border-primary">
                <option>Todos los Departamentos</option>
                <option>Docencia</option>
                <option>Administración</option>
                <option>Mantenimiento</option>
              </select>
            </div>
            <div className="relative">
              <BiSearch className="absolute left-3 top-2 text-text-secondary pointer-events-none text-body-md"></BiSearch>
              <input
                className="pl-10 pr-4 py-1.5 rounded-lg border-outline-variant/50 bg-surface text-body-sm focus:ring-primary focus:border-primary w-48"
                placeholder="Buscar empleado..."
                type="text"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md uppercase tracking-wider border-b border-secondary-container">
                {/* <th className="p-4 w-12">
                  <input
                    className="rounded border-outline-variant text-primary focus:ring-primary"
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                </th> */}
                <th className="p-4">Empleado</th>
                <th className="p-4 text-right">Salario Base</th>
                <th className="p-4 text-right">Bonos</th>
                <th className="p-4 text-right">Deducciones</th>
                <th className="p-4 text-right">Cesta Ticket</th>
                <th className="p-4 text-right bg-surface-container/30">
                  Total (Bs)
                </th>
                <th className="p-4 text-right bg-surface-container/30">
                  Total (USD)
                </th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="font-body-md text-body-md text-on-surface divide-y divide-secondary-container/50">
              {isLoading ? (
                <tr><td colSpan="10" className="p-8 text-center text-on-surface-variant">Cargando datos de nómina...</td></tr>
              ) : employees.length > 0 ? (
                employees.map((employee) => (
                  <EmployeeRow
                    key={employee.id}
                    employee={employee}
                    nominaId={nomina?.id}
                    onToggleCheck={handleToggleCheck}
                    exchangeRate={exchangeRates?.usd || 500}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="p-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-on-surface-variant font-medium">No se encontró una nómina procesada para este periodo.</p>
                      <p className="text-body-sm text-on-surface-variant/70">Seleccione otro mes o inicie una nueva generación.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="p-4 border-t border-secondary-container bg-surface-bright flex justify-between items-center">
          <div className="font-body-sm text-body-sm text-on-surface-variant">
            Mostrando <span className="font-medium text-on-surface">{(page - 1) * pageSize + 1}</span> a{" "}
            <span className="font-medium text-on-surface">
              {Math.min(page * pageSize, totalRecords)}
            </span>{" "}
            de <span className="font-medium text-on-surface">{totalRecords}</span>{" "}
            empleados
          </div>
          <div className="flex items-center gap-1">
            <button
              className="w-8 h-8 flex items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <BiChevronLeft/>
            </button>
            <span className="px-4 text-body-sm font-medium">
              Página {page} de {Math.ceil(totalRecords / pageSize) || 1}
            </span>
            <button 
              className="w-8 h-8 flex items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(totalRecords / pageSize)}
            >
              <BiChevronRight/>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Footer Panel */}
      <div className="bg-surface-container border-t border-outline-variant/30 mt-auto p-6 rounded-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4 text-on-surface">
              <MdAccountBalance></MdAccountBalance>
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">
              Total Nómina Estimada
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="font-headline-lg text-headline-lg font-bold">
                Bs. {totalEstimatedPayrollBs.toFixed(2)}
              </h3>
              <span className="font-body-md text-body-md text-on-surface-variant">
                ~ ${(totalEstimatedPayrollBs / (exchangeRates?.usd || 36.54)).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none px-6 py-3 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-bright transition-colors">
            Guardar Borrador
          </button>
          <button
            onClick={handleAprobarNomina}
            disabled={!nomina?.id || nomina?.aprobada}
            className="flex-1 md:flex-none px-8 py-3 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {nomina?.aprobada ? "Nómina Aprobada" : "Aprobar y Ejecutar"}
            <BiCheckCircle></BiCheckCircle>
          </button>
        </div>
      </div>

      {/* Action Modal */}
      <PayrollActionModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        onSubmit={handleCreateAction}
        type={modalType}
      />
    </main>
  );
}
