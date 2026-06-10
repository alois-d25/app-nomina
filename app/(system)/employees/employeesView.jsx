"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaUserPlus,
  FaMagnifyingGlass,
  FaFilter,
  FaCalendarPlus,
} from "react-icons/fa6";
import { HiDotsVertical } from "react-icons/hi";
import axios from "axios";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import Can from "@/components/Can";
import { PERMISSIONS } from "@/app/config/permissions";

/**
 * Componente para mostrar el estado del empleado
 */
function StatusBadge({ status }) {
  if (status === "activo") {
    return <span className="badge badge-primary badge-soft badge-sm md:badge-md">Activo</span>;
  }
  if (status === "inactivo") {
    return <span className="badge badge-error badge-soft badge-sm md:badge-md">Inactivo</span>;
  }
  return (
    <span className="badge badge-warning badge-soft badge-sm md:badge-md whitespace-nowrap">
      En Permiso
    </span>
  );
}

/**
 * Devuelve la etiqueta legible del estado del empleado (misma lógica que StatusBadge).
 */
function getEstadoLabel(estado) {
  if (estado === "activo") return "Activo";
  if (estado === "inactivo") return "Inactivo";
  return "En Permiso";
}

const itemsPerPage = 5;

export default function EmployeesView({employeesData, escalafonesData, onReload }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [employeeToView, setEmployeeToView] = useState(null);

  const router = useRouter();

  const filteredEmployees = employeesData.filter((emp) => {
    const matchesSearch =
      searchQuery === "" ||
      `${emp.nombre} ${emp.apellido}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.cedula.toString().includes(searchQuery);

    const matchesStatus =
      statusFilter === "" ||
      emp.estado.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  // Reajusta la página si queda fuera de rango (ej: tras borrar el último de la página)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages || 1);
    }
  }, [totalPages, currentPage]);

  const currentEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatSalary = (salary) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(salary);
  };

  const getEscalafonNombre = (nivelId) =>
    escalafonesData.find((e) => e.id === nivelId)?.nombre || "No asignado";

  const handleExportPDF = async () => {
    if (filteredEmployees.length === 0) {
      toast.info("No hay empleados para exportar");
      return;
    }

    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      const fecha = new Date().toLocaleDateString("es-VE");

      // Título del reporte (estilo del Excel de nómina)
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Listado de Empleados", 14, 18);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generado: ${fecha}`, 14, 25);

      const head = [
        ["Empleado", "Cédula", "Ingreso", "Nivel escalafón", "Salario Base", "Estado"],
      ];

      const body = filteredEmployees.map((employee) => [
        `${employee.nombre} ${employee.apellido}\n${employee.email}`,
        `V${employee.cedula}`,
        employee.fecha_ingreso,
        getEscalafonNombre(employee.nivel_escalafon_id),
        formatSalary(employee.salario_base),
        getEstadoLabel(employee.estado),
      ]);

      autoTable(doc, {
        head,
        body,
        startY: 30,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: {
          fillColor: [54, 96, 146],
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
        },
      });

      doc.save(`listado-empleados-${new Date().toISOString().slice(0, 10)}.pdf`);

      toast.success("Listado exportado correctamente");
    } catch (error) {
      console.error("Error al exportar el listado:", error);
      toast.error("No se pudo exportar el listado de empleados");
    }
  };

  const handleDelete = async () => {
    if (!employeeToDelete) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      await axios.delete(`${API_URL}/api/empleados/${employeeToDelete.cedula}`);

      await onReload?.();

      toast.success("Empleado eliminado exitosamente");
    } catch (error) {
      console.error("Error al eliminar empleado:", error);
      const errorMsg = error.response?.data?.detail || "No se pudo eliminar el empleado. Es posible que tenga registros asociados.";
      toast.error(errorMsg);
    } finally {
      document.getElementById("delete_employee_modal")?.close();
      setEmployeeToDelete(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col   ">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-base-content my-5">
            Empleados
          </h2>
          <p className="text-sm text-base-content/70 mt-1">
            Gestione el personal institucional, académico y de servicios.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-warning" onClick={handleExportPDF}>
            <FaDownload></FaDownload>
            Exportar
          </button>
          <Can permission={PERMISSIONS.EMPLEADOS_EDITAR}>
            <Link href="/employees/events" className="btn btn-outline btn-primary">
              <FaCalendarPlus />
              Registrar eventos
            </Link>
          </Can>
          <Can permission={PERMISSIONS.EMPLEADOS_CREAR}>
            <Link href="/employees/register" className="btn btn-primary">
              <FaUserPlus />
              Agregar Empleado
            </Link>
          </Can>
        </div>
      </div>

      {/* Main Card */}
      <div className="card bg-surface-container-lowest rounded-md shadow-xl">
        {/* Filters & Toolbar */}
        <div className="card-body p-4 bg-surface-container-lowest rounded-md">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="form-control w-full lg:w-96">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, cédula o correo..."
                  className="input input-bordered w-full pl-10"
                />
                <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />

              </div>
            </div>
            <div className="flex  items-center gap-2 w-full lg:w-auto flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select w-45 focus-within:outline-1 focus-within:outline-outline-variant focus-within:ring-0 bg-surface-container-lowest border-outline-variant"
              >
                <option value="" className="hover:bg-primary hover:text-on-primary whitespace-nowrap">Todos los Estados</option>
                <option value="activo" className="hover:bg-primary hover:text-on-primary whitespace-nowrap">Activo</option>
                <option value="permiso" className="hover:bg-primary hover:text-on-primary whitespace-nowrap" >En Permiso</option>
                <option value="inactivo" className="hover:bg-primary hover:text-on-primary whitespace-nowrap">Inactivo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {currentEmployees.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-base-content/50">
                {employeesData.length === 0
                  ? "No hay empleados registrados. Agregue uno nuevo para comenzar."
                  : "No se encontraron empleados que coincidan con los filtros."}
              </p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr className="bg-base-200">
                  <th>Empleado</th>
                  <th className="hidden sm:table-cell">Cédula</th>
                  <th className="hidden sm:table-cell">Ingreso</th>
                  <th className="hidden sm:table-cell">Nivel escalafón</th>
                  <th className="hidden sm:table-cell">Salario Base</th>
                  <th>Estado</th>
                  <th className="">
                    Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentEmployees.map((employee) => (
                <tr key={employee.cedula} className="hover">
                  <td>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-bold">
                          {employee.nombre} {employee.apellido}
                        </div>
                        <div className="text-sm opacity-50">
                          {employee.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell">V{employee.cedula}</td>
                  <td className="hidden md:table-cell">{employee.fecha_ingreso}</td>
                  <td className="hidden sm:table-cell">{getEscalafonNombre(employee.nivel_escalafon_id)}</td>
                  <td className="font-mono hidden sm:table-cell">
                    {formatSalary(employee.salario_base)}
                  </td>
                  <td><StatusBadge status={employee.estado} /></td>
                  <td>
                    <button className="btn btn-ghost btn-primary" popoverTarget={`popover-${employee.cedula}`} style={{ anchorName: `--anchor-${employee.cedula}` }}>
                        <HiDotsVertical className="text-xl"/>
                    </button>
                    <ul
                      className="dropdown menu rounded-box bg-base-100 shadow-sm"
                      popover="auto"
                      id={`popover-${employee.cedula}`}
                      style={{ positionAnchor: `--anchor-${employee.cedula}`, positionArea: "bottom" }}
                    >
                      <li className="hover:bg-primary hover:text-on-primary rounded-md">
                        <button 
                          type="button"
                          onClick={() => {
                            setEmployeeToView(employee); // Guardamos la data del empleado seleccionado
                            document.getElementById(`popover-${employee.cedula}`)?.hidePopover?.(); // Cerramos el menú
                            document.getElementById("view_employee_modal")?.showModal(); // Abrimos el modal
                          }}
                        >
                          Ver datos
                        </button>
                      </li>

                      <Can permission={PERMISSIONS.EMPLEADOS_EDITAR}>
                        <li className="hover:bg-warning hover:text-warning-content rounded-md">
                          <Link href={`/employees/edition/${employee.cedula}`}>Editar</Link>
                        </li>
                      </Can>

                      <Can permission={PERMISSIONS.EMPLEADOS_ELIMINAR}>
                        <li className="hover:bg-error hover:text-white rounded-md">
                          <button
                            type="button"
                            onClick={() => {
                              setEmployeeToDelete(employee);
                              document.getElementById(`popover-${employee.cedula}`)?.hidePopover?.();
                              document.getElementById("delete_employee_modal")?.showModal();
                            }}
                          >
                            Eliminar
                          </button>
                        </li>
                      </Can>
                    </ul>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
            )}
        </div>

        {/* Pagination */}
        <div className="card-body p-4 bg-base-200/50 border-t border-base-300">
          <div className="flex items-center justify-between">
            <div className="text-sm text-base-content/70">
              Mostrando {filteredEmployees.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} de{" "}
              {filteredEmployees.length} registros
            </div>
            <div className="join">
              <button 
                className="join-item btn btn-sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                <FaChevronLeft />
              </button>
              <button className="join-item btn btn-sm btn-primary">{currentPage} de {totalPages || 1}</button>
              <button
                className="join-item btn btn-sm"
                disabled={currentPage >= totalPages || totalPages === 0}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
        </div>
      </div>
      <dialog id="delete_employee_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg text-error">Confirmar Eliminación</h3>
          <p className="py-4">
            ¿Está seguro que desea eliminar al empleado{" "}
            <strong>{employeeToDelete?.nombre} {employeeToDelete?.apellido}</strong>{" "}
            (C.I. {employeeToDelete?.cedula})?
          </p>
          <p className="text-sm text-base-content/70">
            Esta acción no se puede deshacer.
          </p>
          <div className="modal-action">
            <button 
              className="btn" 
              onClick={() => {
                document.getElementById("delete_employee_modal")?.close();
                setEmployeeToDelete(null);
              }}
            >
              Cancelar
            </button>
            <button className="btn btn-error" onClick={handleDelete}>
              Eliminar
            </button>
          </div>
        </div>
      </dialog>
      {/* --- MODAL PARA VER DATOS DEL EMPLEADO --- */}
      <dialog id="view_employee_modal" className="modal">
        <div className="modal-box w-11/12 max-w-2xl">
          <h3 className="font-bold text-xl text-primary mb-6 border-b border-base-300 pb-2">
            Detalle del Empleado
          </h3>
          
          {employeeToView && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-base-content/60">Nombre Completo</p>
                <p className="text-lg">{employeeToView.nombre} {employeeToView.apellido}</p>
              </div>
              
              <div>
                <p className="text-sm font-semibold text-base-content/60">Cédula de Identidad</p>
                <p className="text-lg">V-{employeeToView.cedula}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-base-content/60">Correo Institucional</p>
                <p className="text-lg">{employeeToView.email}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-base-content/60">Estado Laboral</p>
                <div className="mt-1">
                  <StatusBadge status={employeeToView.estado} />
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-base-content/60">Fecha de Ingreso</p>
                <p className="text-lg">{employeeToView.fecha_ingreso}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-base-content/60">Salario Base</p>
                <p className="text-lg font-mono">{formatSalary(employeeToView.salario_base)}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-base-content/60">Nivel de Escalafón</p>
                <p className="text-lg">
                  {getEscalafonNombre(employeeToView.nivel_escalafon_id)}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-base-content/60">Años de Experiencia</p>
                <p className="text-lg">{employeeToView.anios_experiencia} años</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-base-content/60">Teléfono</p>
                <p className="text-lg">{employeeToView.telefono || "No registrado"}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-base-content/60">Número de Cuenta</p>
                <p className="text-lg">{employeeToView.numero_cuenta || "No registrado"}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-base-content/60">Tipo de Jornada</p>
                <p className="text-lg">{employeeToView.es_por_hora ? "Por horas" : "Por días"}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-base-content/60">Jornada Semanal</p>
                <p className="text-lg">
                  {employeeToView.es_por_hora
                    ? (employeeToView.horas_trabajadas_semana != null
                        ? `${employeeToView.horas_trabajadas_semana} h/semana`
                        : "No registrado")
                    : (employeeToView.dias_trabajados_semana != null
                        ? `${employeeToView.dias_trabajados_semana} días/semana`
                        : "No registrado")}
                </p>
              </div>
            </div>
          )}
          
          <div className="modal-action mt-8 border-t border-base-300 pt-4">
            <button 
              className="btn btn-error" 
              onClick={() => {
                document.getElementById("view_employee_modal")?.close();
                setEmployeeToView(null);
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
        
        {/* Permite cerrar el modal haciendo clic afuera */}
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setEmployeeToView(null)}>cerrar</button>
        </form>
      </dialog>
    </div>
  );
}
