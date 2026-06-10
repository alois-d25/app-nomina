"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import {
  FaPlus,
  FaChevronLeft,
  FaChevronRight,
  FaXmark,
  FaCalendarDay,
  FaMagnifyingGlass,
  FaUserPen,
} from "react-icons/fa6";
import { HiDotsVertical } from "react-icons/hi";
import { EmployeeService } from "@/services/employee.service";
import { EventService } from "@/services/event.service";
import axiosClient from "@/services/axiosClient";
import Can from "@/components/Can";
import { PERMISSIONS } from "@/app/config/permissions";
import Link from "next/link";

// Formatea un Date local a 'YYYY-MM-DD' sin desfase por zona horaria
const fmt = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Estilos por tipo de evento
const EVENT_STYLES = {
  "inasistencia": "bg-error-container/50 border-error/30 text-on-error-container",
  "horas no laboradas": "bg-warning/20 border-warning/40 text-warning-content",
  "reposo": "bg-primary-container/40 border-primary/30 text-on-primary-container",
  "vacaciones": "bg-success/20 border-success/40 text-on-surface-variant",
};

const EVENTS_PER_PAGE = 4;

const formatoFecha = (iso) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : "";

/* ---------------- Celda del calendario ---------------- */
function CalendarCell({ day, isOffMonth, isToday, events = [] }) {
  return (
    <div
      className={`border border-secondary-container/50 rounded-xl p-2 min-h-25 transition-all relative
      ${isOffMonth ? "bg-surface-container-lowest opacity-40" : "bg-surface-container-lowest hover:border-primary hover:shadow-md"}
      ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}
    >
      <span className={`text-xs font-bold ${isOffMonth ? "text-on-surface-variant" : "text-on-surface"}`}>{day}</span>
      <div className="mt-1 flex flex-col gap-1">
        {events.map((ev, idx) => (
          <div
            key={idx}
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold truncate border ${EVENT_STYLES[ev.tipo_evento] || "bg-secondary-container"}`}
            title={ev.observacion || ev.tipo_evento}
          >
            {ev.tipo_evento === "horas no laboradas" && ev.cantidad ? `${ev.cantidad}h ` : ""}
            {ev.tipo_evento}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EmployeeEventsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Empleado seleccionado y picker
  const [empleados, setEmpleados] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isPickerOpen, setIsPickerOpen] = useState(true);
  const [pickerSearch, setPickerSearch] = useState("");

  // Eventos del mes
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsPage, setEventsPage] = useState(1);

  // Cache de meses ya consultados: clave `${cedula}-${anio}-${mes}` -> eventos
  const monthCache = useRef({});

  // Tipos (enum) y modal de registro/edición
  const [tipos, setTipos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [formData, setFormData] = useState({
    tipo_evento: "",
    fecha: "",
    fecha_inicio: "",
    fecha_fin: "",
    cantidad: "",
    observacion: "",
    dias_vacaciones: "",
    dias_bono_vac: "",
    monto_vacaciones_usd: "",
    monto_bono_vac_usd: "",
  });

  // Estado para cálculo de vacaciones
  const [vacCalculo, setVacCalculo] = useState(null);
  const [vacLoadingCalculo, setVacLoadingCalculo] = useState(false);
  // Modal para editar días contractuales
  const [showEditDiasModal, setShowEditDiasModal] = useState(false);
  const [diasEditInput, setDiasEditInput] = useState("");

  /* ----- Carga inicial: empleados + tipos (una sola vez) ----- */
  useEffect(() => {
    const init = async () => {
      try {
        const [emps, tps] = await Promise.all([
          EmployeeService.getEmployees(),
          EventService.getTipos(),
        ]);
        setEmpleados(emps || []);
        setTipos(tps || []);
      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
        toast.error("No se pudieron cargar los empleados");
      }
    };
    init();
  }, []);

  /* ----- Carga mensual de eventos (con cache para evitar refetches) ----- */
  const fetchEventos = useCallback(async (force = false) => {
    if (!selectedEmployee) return;
    const anio = currentDate.getFullYear();
    const mes = currentDate.getMonth() + 1;
    const key = `${selectedEmployee.cedula}-${anio}-${mes}`;

    if (!force && monthCache.current[key]) {
      setEvents(monthCache.current[key]);
      setEventsPage(1);
      return;
    }

    setLoadingEvents(true);
    try {
      const data = (await EventService.getMensual(selectedEmployee.cedula, anio, mes)) || [];
      monthCache.current[key] = data;
      setEvents(data);
      setEventsPage(1);
    } catch (error) {
      console.error("Error cargando eventos:", error);
      toast.error("No se pudieron cargar los eventos del mes");
    } finally {
      setLoadingEvents(false);
    }
  }, [selectedEmployee, currentDate]);

  useEffect(() => {
    fetchEventos();
  }, [fetchEventos]);

  // Auto-calcular vacaciones cuando el tipo es vacaciones, hay empleado y fecha_inicio
  useEffect(() => {
    if (formData.tipo_evento !== "vacaciones" || !selectedEmployee || !formData.fecha_inicio) {
      setVacCalculo(null);
      return;
    }
    let cancelled = false;
    const calcular = async () => {
      setVacLoadingCalculo(true);
      try {
        const res = await axiosClient.get(`/eventos_empleados/vacaciones/calcular-dias`, {
          params: { cedula: selectedEmployee.cedula, fecha_inicio: formData.fecha_inicio }
        });
        const data = res.data;
        if (cancelled) return;
        setVacCalculo(data);
        setFormData((prev) => ({
          ...prev,
          dias_vacaciones: String(data.dias_vacaciones),
          dias_bono_vac: String(data.dias_bono_vac),
          monto_vacaciones_usd: String(data.monto_vacaciones_usd),
          monto_bono_vac_usd: String(data.monto_bono_vac_usd),
        }));
      } catch {
        if (!cancelled) toast.error("No se pudo calcular los días de vacaciones");
      } finally {
        if (!cancelled) setVacLoadingCalculo(false);
      }
    };
    calcular();
    return () => { cancelled = true; };
  }, [formData.tipo_evento, formData.fecha_inicio, selectedEmployee]);

  // Tras una mutación (crear/editar/borrar) invalidamos todo el cache y recargamos
  const invalidarYRecargar = () => {
    monthCache.current = {};
    fetchEventos(true);
  };

  /* ----- Construcción del calendario ----- */
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = [];

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = firstDayOfMonth; i > 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonthLastDay - i + 1), isOffMonth: true });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isOffMonth: false });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isOffMonth: true });
    }
    return days;
  }, [currentDate]);

  // Mapa fecha(YYYY-MM-DD) -> eventos que la tocan
  const eventsByDay = useMemo(() => {
    const map = {};
    const add = (dateStr, ev) => {
      (map[dateStr] = map[dateStr] || []).push(ev);
    };
    for (const ev of events) {
      const esRango = (ev.tipo_evento === "reposo" || ev.tipo_evento === "vacaciones")
                      && ev.fecha_inicio && ev.fecha_fin;
      if (esRango) {
        let d = new Date(`${ev.fecha_inicio.slice(0, 10)}T00:00:00`);
        const end = new Date(`${ev.fecha_fin.slice(0, 10)}T00:00:00`);
        while (d <= end) {
          add(fmt(d), ev);
          d.setDate(d.getDate() + 1);
        }
      } else if (ev.fecha) {
        add(ev.fecha.slice(0, 10), ev);
      }
    }
    return map;
  }, [events]);

  // Paginación de la lista de eventos del mes (4 por página)
  const totalEventPages = Math.ceil(events.length / EVENTS_PER_PAGE);
  useEffect(() => {
    if (eventsPage > totalEventPages) setEventsPage(totalEventPages || 1);
  }, [totalEventPages, eventsPage]);
  const pagedEvents = events.slice((eventsPage - 1) * EVENTS_PER_PAGE, eventsPage * EVENTS_PER_PAGE);

  const navigate = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const monthName = currentDate.toLocaleString("es-ES", { month: "long", year: "numeric" });

  /* ----- Picker de empleado ----- */
  const filteredEmpleados = empleados.filter((e) => {
    if (pickerSearch === "") return true;
    const q = pickerSearch.toLowerCase();
    return (
      `${e.nombre} ${e.apellido}`.toLowerCase().includes(q) ||
      String(e.cedula).toLowerCase().includes(q)
    );
  });

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setIsPickerOpen(false);
    setPickerSearch("");
  };

  /* ----- Registro / edición de evento ----- */
  const resetForm = () => {
    setFormData({ tipo_evento: "", fecha: "", fecha_inicio: "", fecha_fin: "", cantidad: "", observacion: "", dias_vacaciones: "", dias_bono_vac: "", monto_vacaciones_usd: "", monto_bono_vac_usd: "" });
    setVacCalculo(null);
  };

  const handleOpenCreate = () => {
    setEventToEdit(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ev) => {
    setEventToEdit(ev);
    setFormData({
      tipo_evento: ev.tipo_evento,
      fecha: ev.fecha ? ev.fecha.slice(0, 10) : "",
      fecha_inicio: ev.fecha_inicio ? ev.fecha_inicio.slice(0, 10) : "",
      fecha_fin: ev.fecha_fin ? ev.fecha_fin.slice(0, 10) : "",
      cantidad: ev.cantidad != null ? String(ev.cantidad) : "",
      observacion: ev.observacion || "",
      dias_vacaciones: ev.dias_vacaciones != null ? String(ev.dias_vacaciones) : "",
      dias_bono_vac: ev.dias_bono_vac != null ? String(ev.dias_bono_vac) : "",
      monto_vacaciones_usd: ev.monto_vacaciones_usd != null ? String(ev.monto_vacaciones_usd) : "",
      monto_bono_vac_usd: ev.monto_bono_vac_usd != null ? String(ev.monto_bono_vac_usd) : "",
    });
    setIsModalOpen(true);
  };

  const validar = () => {
    const t = formData.tipo_evento;
    if (!t) {
      toast.error("Seleccione el tipo de evento");
      return false;
    }
    if (t === "inasistencia") {
      if (!formData.fecha) {
        toast.error("La inasistencia requiere una fecha");
        return false;
      }
    } else if (t === "horas no laboradas") {
      if (!formData.fecha) {
        toast.error("Indique la fecha de las horas no laboradas");
        return false;
      }
      if (!formData.cantidad || Number(formData.cantidad) <= 0) {
        toast.error("Indique una cantidad de horas válida");
        return false;
      }
    } else if (t === "reposo") {
      if (!formData.fecha_inicio || !formData.fecha_fin) {
        toast.error("El reposo requiere fecha de inicio y fin");
        return false;
      }
      if (formData.fecha_fin < formData.fecha_inicio) {
        toast.error("La fecha fin no puede ser anterior a la de inicio");
        return false;
      }
    } else if (t === "vacaciones") {
      if (!formData.fecha_inicio || !formData.fecha_fin) {
        toast.error("Las vacaciones requieren fecha de inicio y fin");
        return false;
      }
      if (formData.fecha_fin < formData.fecha_inicio) {
        toast.error("La fecha fin no puede ser anterior a la de inicio");
        return false;
      }
      if (!formData.dias_vacaciones || Number(formData.dias_vacaciones) <= 0) {
        toast.error("Se requieren los días de vacaciones calculados");
        return false;
      }
    }
    return true;
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) {
      toast.error("Primero seleccione un empleado");
      return;
    }
    if (!validar()) return;

    const t = formData.tipo_evento;
    const esRango = t === "reposo" || t === "vacaciones";
    const payload = {
      empleado_cedula: selectedEmployee.cedula,
      tipo_evento: t,
      fecha: esRango ? null : formData.fecha || null,
      fecha_inicio: esRango ? formData.fecha_inicio : null,
      fecha_fin: esRango ? formData.fecha_fin : null,
      cantidad: t === "horas no laboradas" ? parseInt(formData.cantidad, 10) : null,
      observacion: formData.observacion || null,
      ...(t === "vacaciones" && {
        dias_vacaciones: parseInt(formData.dias_vacaciones, 10) || null,
        dias_bono_vac: parseInt(formData.dias_bono_vac, 10) || null,
        monto_vacaciones_usd: parseFloat(formData.monto_vacaciones_usd) || null,
        monto_bono_vac_usd: parseFloat(formData.monto_bono_vac_usd) || null,
      }),
    };

    setSaving(true);
    try {
      if (eventToEdit) {
        await EventService.actualizar(eventToEdit.id, payload);
        toast.success("Evento actualizado exitosamente");
      } else {
        await EventService.crear(payload);
        toast.success("Evento registrado exitosamente");
      }
      setIsModalOpen(false);
      setEventToEdit(null);
      resetForm();
      invalidarYRecargar();
    } catch (error) {
      console.error("Error guardando evento:", error);
      toast.error(error.response?.data?.detail || "No se pudo guardar el evento");
    } finally {
      setSaving(false);
    }
  };

  /* ----- Borrado de evento ----- */
  const handleOpenDelete = (ev) => {
    setEventToDelete(ev);
    document.getElementById("delete_event_modal")?.showModal();
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await EventService.eliminar(eventToDelete.id);
      document.getElementById("delete_event_modal")?.close();
      setEventToDelete(null);
      toast.success("Evento eliminado exitosamente");
      invalidarYRecargar();
    } catch (error) {
      console.error("Error eliminando evento:", error);
      toast.error(error.response?.data?.detail || "No se pudo eliminar el evento");
    }
  };

  const tipo = formData.tipo_evento;

  // Tipos de evento visibles según el tipo de empleado:
  // - por hora: solo "horas no laboradas" y "vacaciones"
  // - por día:  todos menos "horas no laboradas"
  const tiposVisibles = useMemo(() => {
    const base = selectedEmployee?.es_por_hora
      ? tipos.filter((t) => t === "horas no laboradas" || t === "vacaciones")
      : tipos.filter((t) => t !== "horas no laboradas");
    // Al editar, conservar el tipo del evento aunque ya no aplique al empleado
    if (eventToEdit?.tipo_evento && !base.includes(eventToEdit.tipo_evento)) {
      return [...base, eventToEdit.tipo_evento];
    }
    return base;
  }, [tipos, selectedEmployee, eventToEdit]);

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold text-on-surface tracking-tight">Eventos de Empleados</h2>
              <p className="text-on-surface-variant mt-1">
                {selectedEmployee
                  ? `Mostrando eventos de ${selectedEmployee.nombre} ${selectedEmployee.apellido}`
                  : "Seleccione un empleado para ver sus eventos."}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/employees">
                <button className="btn btn-outline btn-error">Volver</button>
              </Link>
              <button
                onClick={() => setIsPickerOpen(true)}
                className="btn btn-outline btn-primary"
              >
                <FaUserPen /> {selectedEmployee ? "Cambiar empleado" : "Seleccionar empleado"}
              </button>
              <Can permission={PERMISSIONS.EMPLEADOS_EDITAR}>
                <button
                  onClick={handleOpenCreate}
                  disabled={!selectedEmployee}
                  className="bg-primary text-primary-content px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-surface-tint transition-all shadow-lg active:scale-95 disabled:opacity-40"
                >
                  <FaPlus /> Registrar Evento
                </button>
              </Can>
            </div>
          </div>

          {!selectedEmployee ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-4 bg-white border border-outline-variant/50 rounded-2xl">
              <FaCalendarDay className="text-5xl text-primary/40" />
              <p className="text-on-surface-variant">Aún no has seleccionado un empleado.</p>
              <button onClick={() => setIsPickerOpen(true)} className="btn btn-primary">
                Seleccionar empleado
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Calendario */}
              <div className="xl:col-span-2 bg-white border border-outline-variant/50 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-secondary-container flex flex-wrap justify-between items-center bg-surface-container-low/30 gap-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold text-on-surface capitalize">{monthName}</h3>
                    <div className="flex gap-1">
                      <button onClick={() => navigate(-1)} className="btn btn-primary btn-outline btn-sm"><FaChevronLeft /></button>
                      <button onClick={() => navigate(1)} className="btn btn-primary btn-outline btn-sm"><FaChevronRight /></button>
                    </div>
                  </div>
                  {loadingEvents && <span className="loading loading-spinner loading-sm text-primary" />}
                </div>

                <div className="flex-1 flex flex-col p-4 bg-surface-bright">
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"].map((d) => (
                      <div key={d} className="text-center text-[10px] font-bold text-on-surface-variant tracking-widest">{d}</div>
                    ))}
                  </div>
                  <div className="flex-1 grid grid-cols-7 gap-2 grid-rows-6">
                    {calendarDays.map((dayObj, i) => {
                      const dateStr = fmt(dayObj.date);
                      const dayEvents = eventsByDay[dateStr] || [];
                      const isToday = fmt(new Date()) === dateStr;
                      return (
                        <CalendarCell
                          key={i}
                          day={dayObj.date.getDate()}
                          isOffMonth={dayObj.isOffMonth}
                          isToday={isToday}
                          events={dayEvents}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Lista de eventos del mes (con acciones y paginación) */}
              <div className="bg-white border border-outline-variant/50 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
                <div className="p-6 border-b border-secondary-container flex items-center gap-2">
                  <FaCalendarDay className="text-primary" />
                  <h3 className="font-bold text-lg text-on-surface">Eventos del mes</h3>
                  <span className="ml-auto text-xs text-on-surface-variant">{events.length} en total</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                  {events.length === 0 ? (
                    <p className="text-on-surface-variant text-sm text-center py-8">
                      No hay eventos registrados este mes.
                    </p>
                  ) : (
                    pagedEvents.map((ev) => (
                      <div key={ev.id} className="p-3 border border-secondary-container rounded-xl bg-surface relative">
                        {/* Dropdown de acciones (esquina) */}
                        <Can permission={PERMISSIONS.EMPLEADOS_EDITAR}>
                          <div className="absolute top-2 right-2">
                            <button
                              className="btn btn-outline btn-primary"
                              popoverTarget={`popover-ev-${ev.id}`}
                              style={{ anchorName: `--anchor-ev-${ev.id}` }}
                            >
                              <HiDotsVertical className="text-2xl"/>
                            </button>
                            <ul
                              className="dropdown menu rounded-box bg-surface-container-lowest shadow-md w-32"
                              popover="auto"
                              id={`popover-ev-${ev.id}`}
                              style={{ positionAnchor: `--anchor-ev-${ev.id}`, positionArea: "bottom span-left" }}
                            >
                              <li className="hover:bg-warning hover:text-white rounded-md">
                                <button type="button" onClick={() => { document.getElementById(`popover-ev-${ev.id}`)?.hidePopover?.(); handleOpenEdit(ev); }}>Editar</button>
                              </li>
                              <li className="hover:bg-error hover:text-white rounded-md">
                                <button type="button" onClick={() => { document.getElementById(`popover-ev-${ev.id}`)?.hidePopover?.(); handleOpenDelete(ev); }}>Eliminar</button>
                              </li>
                            </ul>
                          </div>
                        </Can>

                        <div className="flex justify-between items-start gap-2 pr-6">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${EVENT_STYLES[ev.tipo_evento] || "bg-secondary-container"}`}>
                            {ev.tipo_evento}
                          </span>
                          {ev.tipo_evento === "horas no laboradas" && ev.cantidad != null && (
                            <span className="text-xs font-bold text-warning-content whitespace-nowrap">{ev.cantidad} h</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-on-surface mt-2">
                          {(ev.tipo_evento === "reposo" || ev.tipo_evento === "vacaciones")
                            ? `${formatoFecha(ev.fecha_inicio)} → ${formatoFecha(ev.fecha_fin)}`
                            : formatoFecha(ev.fecha)}
                        </p>
                        {ev.tipo_evento === "vacaciones" && ev.dias_vacaciones && (
                          <div className="mt-1 text-xs text-on-surface-variant grid grid-cols-2 gap-1">
                            <span>Vacaciones: {ev.dias_vacaciones} días · ${Number(ev.monto_vacaciones_usd || 0).toFixed(2)}</span>
                            <span>Bono vac.: {ev.dias_bono_vac} días · ${Number(ev.monto_bono_vac_usd || 0).toFixed(2)}</span>
                          </div>
                        )}
                        {ev.observacion && (
                          <p className="text-xs text-on-surface-variant mt-1">{ev.observacion}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Paginación de la lista */}
                {events.length > 0 && (
                  <div className="p-3 border-t border-secondary-container flex items-center justify-between bg-surface-container-low/30">
                    <span className="text-xs text-on-surface-variant">
                      {(eventsPage - 1) * EVENTS_PER_PAGE + 1}–{Math.min(eventsPage * EVENTS_PER_PAGE, events.length)} de {events.length}
                    </span>
                    <div className="join">
                      <button
                        className="join-item btn btn-xs"
                        disabled={eventsPage === 1}
                        onClick={() => setEventsPage((p) => p - 1)}
                      >
                        <FaChevronLeft />
                      </button>
                      <button className="join-item btn btn-xs btn-primary">{eventsPage} de {totalEventPages || 1}</button>
                      <button
                        className="join-item btn btn-xs"
                        disabled={eventsPage >= totalEventPages || totalEventPages === 0}
                        onClick={() => setEventsPage((p) => p + 1)}
                      >
                        <FaChevronRight />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ---------- Modal: seleccionar empleado ---------- */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-secondary-container flex justify-between items-center bg-surface-container-low/30">
              <h2 className="text-xl font-bold text-on-surface">Seleccionar empleado</h2>
              {selectedEmployee && (
                <button onClick={() => setIsPickerOpen(false)} className="text-on-surface-variant hover:bg-surface-container p-2 rounded-full">
                  <FaXmark className="text-lg" />
                </button>
              )}
            </div>
            <div className="p-6 flex flex-col gap-4 overflow-hidden">
              <label className="input input-bordered flex items-center gap-2">
                <FaMagnifyingGlass className="text-on-surface-variant" />
                <input
                  type="search"
                  className="grow"
                  placeholder="Buscar por nombre o cédula..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                />
              </label>
              <div className="overflow-y-auto max-h-[50vh]">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Cédula</th>
                      <th>Correo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmpleados.length === 0 ? (
                      <tr><td colSpan="3" className="text-center text-on-surface-variant py-6">Sin resultados</td></tr>
                    ) : (
                      filteredEmpleados.map((emp) => (
                        <tr
                          key={emp.cedula}
                          className="hover:bg-primary/5 cursor-pointer"
                          onClick={() => handleSelectEmployee(emp)}
                        >
                          <td className="font-medium">{emp.nombre} {emp.apellido}</td>
                          <td>V{emp.cedula}</td>
                          <td className="text-sm opacity-70">{emp.email}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Modal: registrar / editar evento ---------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-secondary-container flex justify-between items-center bg-surface-container-low/30">
              <h2 className="text-xl font-bold text-on-surface">{eventToEdit ? "Editar Evento" : "Registrar Evento"}</h2>
              <button onClick={() => { setIsModalOpen(false); setEventToEdit(null); }} className="text-on-surface-variant hover:bg-surface-container p-2 rounded-full">
                <FaXmark className="text-lg" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-sm text-on-surface-variant mb-4">
                Empleado: <span className="font-bold text-on-surface">{selectedEmployee?.nombre} {selectedEmployee?.apellido}</span>
              </p>
              <form id="event-form" onSubmit={handleSaveEvent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tipo de evento (desde el enum del backend) */}
                <div className="form-control md:col-span-2">
                  <label className="label"><span className="label-text font-bold text-on-surface-variant">Tipo de Evento</span></label>
                  <select
                    className="select select-bordered w-full rounded-xl"
                    value={formData.tipo_evento}
                    onChange={(e) => setFormData({ ...formData, tipo_evento: e.target.value })}
                    required
                  >
                    <option value="" disabled>Seleccione un tipo...</option>
                    {tiposVisibles.map((t) => (
                      <option key={t} value={t} className="capitalize">{t}</option>
                    ))}
                  </select>
                </div>

                {/* Campos condicionales según el tipo */}
                {(tipo === "inasistencia" || tipo === "horas no laboradas") && (
                  <div className="form-control">
                    <label className="label"><span className="label-text font-bold text-on-surface-variant">Fecha</span></label>
                    <input
                      type="date"
                      className="input input-bordered w-full rounded-xl"
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    />
                  </div>
                )}

                {tipo === "horas no laboradas" && (
                  <div className="form-control">
                    <label className="label"><span className="label-text font-bold text-on-surface-variant">Cantidad de horas</span></label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="input input-bordered w-full rounded-xl"
                      value={formData.cantidad}
                      onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                    />
                  </div>
                )}

                {(tipo === "reposo" || tipo === "vacaciones") && (
                  <>
                    <div className="form-control">
                      <label className="label"><span className="label-text font-bold text-on-surface-variant">Fecha inicio</span></label>
                      <input
                        type="date"
                        className="input input-bordered w-full rounded-xl"
                        value={formData.fecha_inicio}
                        onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                      />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text font-bold text-on-surface-variant">Fecha fin</span></label>
                      <input
                        type="date"
                        className="input input-bordered w-full rounded-xl"
                        value={formData.fecha_fin}
                        onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {tipo === "vacaciones" && (
                  <div className="md:col-span-2">
                    {vacLoadingCalculo && (
                      <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-2">
                        <span className="loading loading-spinner loading-xs" /> Calculando beneficios vacacionales...
                      </div>
                    )}
                    {vacCalculo && !vacLoadingCalculo && (
                      <div className="bg-success/10 border border-success/30 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-on-surface text-sm">Beneficios Vacacionales (LOTTT)</h4>
                          <span className="text-xs text-on-surface-variant">{vacCalculo.anios_servicio} años de servicio</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-surface-container rounded-lg p-2">
                            <p className="text-xs text-on-surface-variant">Salario Integral/Día</p>
                            <p className="font-bold">${Number(vacCalculo.sid_usd).toFixed(4)}</p>
                            {vacCalculo.sid_bs && <p className="text-xs text-on-surface-variant">Bs. {Number(vacCalculo.sid_bs).toFixed(2)}</p>}
                          </div>
                          <div className="bg-surface-container rounded-lg p-2">
                            <p className="text-xs text-on-surface-variant">Tasa utilizada</p>
                            <p className="font-bold">{vacCalculo.tasa_bs ? `${Number(vacCalculo.tasa_bs).toFixed(2)} Bs/USD` : "No disponible"}</p>
                            <p className="text-xs text-on-surface-variant capitalize">{vacCalculo.tasa_fuente}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-surface-container rounded-lg p-2">
                            <div className="flex flex-col gap-2 items-start">
                              <p className="text-xs text-on-surface-variant">Días de vacaciones pagados</p>
                              <button type="button" className="text-xs text-primary underline" onClick={() => { setDiasEditInput(formData.dias_vacaciones); setShowEditDiasModal(true); }}>
                                Modificar
                              </button>
                            </div>
                            <p className="font-bold">{formData.dias_vacaciones} días</p>
                            <p className="text-xs text-on-surface-variant">${Number(formData.monto_vacaciones_usd).toFixed(2)} USD</p>
                            {vacCalculo.monto_vacaciones_bs && <p className="text-xs text-on-surface-variant">Bs. {Number(vacCalculo.monto_vacaciones_bs * (parseInt(formData.dias_vacaciones) / vacCalculo.dias_vacaciones)).toFixed(2)}</p>}
                          </div>
                          <div className="bg-surface-container rounded-lg p-2">
                            <p className="text-xs text-on-surface-variant">Días bono vacacional</p>
                            <p className="font-bold">{formData.dias_bono_vac} días</p>
                            <p className="text-xs text-on-surface-variant">${Number(formData.monto_bono_vac_usd).toFixed(2)} USD</p>
                            {vacCalculo.monto_bono_vac_bs && <p className="text-xs text-on-surface-variant">Bs. {Number(vacCalculo.monto_bono_vac_bs).toFixed(2)}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                    {!vacCalculo && !vacLoadingCalculo && formData.fecha_inicio && (
                      <div className="alert alert-warning text-xs py-2">Selecciona ambas fechas para calcular los beneficios.</div>
                    )}
                    {!formData.fecha_inicio && (
                      <div className="alert alert-info text-xs py-2">Ingresa la fecha de inicio para calcular los días de vacaciones automáticamente.</div>
                    )}
                  </div>
                )}

                {/* Observación */}
                {tipo && (
                  <div className="form-control md:col-span-2">
                    <label className="label">
                      <span className="label-text font-bold text-on-surface-variant">
                        Observación {tipo === "inasistencia" ? "(opcional)" : ""}
                      </span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered w-full h-24 rounded-xl"
                      placeholder="Comentarios sobre este evento..."
                      value={formData.observacion}
                      onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
                    />
                  </div>
                )}
              </form>
            </div>

            <div className="px-6 py-4 border-t border-secondary-container bg-surface-container-low/30 flex justify-end gap-3">
              <button onClick={() => { setIsModalOpen(false); setEventToEdit(null); }} className="btn btn-ghost rounded-xl font-bold px-6">Cancelar</button>
              <button type="submit" form="event-form" disabled={saving} className="btn btn-primary rounded-xl font-bold px-8 shadow-md">
                {saving ? <span className="loading loading-spinner loading-xs" /> : null}
                {eventToEdit ? "Guardar cambios" : "Guardar Evento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Modal: editar días contractuales de vacaciones ---------- */}
      {showEditDiasModal && (
        <div className="fixed inset-0 z-60 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-secondary-container">
              <h2 className="text-lg font-bold text-on-surface">Modificar días de vacaciones</h2>
              <p className="text-sm text-on-surface-variant mt-1">
                El mínimo legal según LOTTT es <strong>{vacCalculo?.dias_vacaciones ?? "—"} días</strong>. Puedes aumentar este valor según el contrato colectivo.
              </p>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-bold">Días de vacaciones contractuales</span></label>
                <input
                  type="number"
                  min={vacCalculo?.dias_vacaciones ?? 1}
                  step="1"
                  className="input input-bordered w-full rounded-xl"
                  value={diasEditInput}
                  onChange={(e) => setDiasEditInput(e.target.value)}
                />
              </div>
              {vacCalculo && diasEditInput && (
                <p className="text-sm text-on-surface-variant">
                  Nuevo monto estimado: <strong>${(Number(diasEditInput) * Number(vacCalculo.sid_usd)).toFixed(2)} USD</strong>
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-secondary-container flex justify-end gap-3">
              <button className="btn btn-ghost" onClick={() => setShowEditDiasModal(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const dias = parseInt(diasEditInput, 10);
                  if (!dias || dias <= 0) { toast.error("Ingrese un número válido"); return; }
                  const nuevoMonto = vacCalculo ? (dias * Number(vacCalculo.sid_usd)) : parseFloat(formData.monto_vacaciones_usd);
                  setFormData((prev) => ({ ...prev, dias_vacaciones: String(dias), monto_vacaciones_usd: String(nuevoMonto.toFixed(4)) }));
                  setShowEditDiasModal(false);
                  toast.success("Días de vacaciones actualizados");
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Modal: confirmar borrado ---------- */}
      <dialog id="delete_event_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg text-error">Confirmar eliminación</h3>
          <p className="py-4">
            ¿Eliminar este evento de tipo <strong>{eventToDelete?.tipo_evento}</strong>?
            <br />
            <span className="text-sm opacity-60">Esta acción no se puede deshacer.</span>
          </p>
          <div className="modal-action">
            <button className="btn" onClick={() => { document.getElementById("delete_event_modal")?.close(); setEventToDelete(null); }}>Cancelar</button>
            <button className="btn btn-error" onClick={handleConfirmDelete}>Eliminar</button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
