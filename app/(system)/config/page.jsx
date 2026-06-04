import React from "react";
import { FaReceipt, FaUniversity } from "react-icons/fa";
import { FaEnvelope, FaPalette } from "react-icons/fa6";
const SettingsCard = ({
  title,
  icon,
  children,
  footer,
  className = "",
  action = "POST",
}) => (
  <section
    className={`card bg-surface-container-lowest shadow-sm border border-base-300 ${className}`}
  >
    <form action={action}>
      <div className="card-body p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-base-200 pb-4">
          <span className="material-symbols-outlined text-xl">{icon}</span>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <div className="flex-1">{children}</div>
        {footer && (
          <div className="card-actions justify-end mt-6">{footer}</div>
        )}
      </div>
    </form>
  </section>
);

const FormField = ({
  label,
  type = "text",
  defaultValue,
  prefix,
  colSpan = "",
}) => (
  <div className={`form-control w-full ${colSpan}`}>
    <label className="label">
      <span className="label-text font-semibold opacity-70">{label}</span>
    </label>
    <div className={prefix ? "join" : ""}>
      {prefix && (
        <span className="join-item bg-base-200 border border-base-300 flex items-center px-3 text-sm opacity-60">
          {prefix}
        </span>
      )}
      <input
        type={type}
        defaultValue={defaultValue}
        className={`input input-bordered w-full ${prefix ? "join-item" : ""}`}
      />
    </div>
  </div>
);

const ToggleField = ({ label, defaultChecked }) => (
  <div className="form-control">
    <label className="label cursor-pointer hover:bg-base-200 rounded-lg px-2 transition-colors flex justify-between">
      <span className="label-text">{label}</span>
      <input
        type="checkbox"
        className="toggle toggle-primary"
        defaultChecked={defaultChecked}
      />
    </label>
  </div>
);

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Configuración</h2>
        <p className="opacity-60 text-base">
          Gestione los detalles de la institución, los parámetros de nómina y
          las configuraciones del sistema.
        </p>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* University Details */}
        <SettingsCard
          title="Detalles de la Universidad"
          icon={<FaUniversity />}
          className="md:col-span-8"
          footer={
            <button className="btn btn-primary" type="submit">
              Guardar Detalles
            </button>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Nombre de la Institución"
              defaultValue="Universidad Central"
            />
            <FormField
              label="RIF / Identificación Fiscal"
              defaultValue="J-12345678-9"
            />
            <FormField
              label="Dirección Principal"
              defaultValue="Av. Principal, Edificio Rectorado, Piso 3"
              colSpan="sm:col-span-2"
            />
          </div>
        </SettingsCard>

        {/* Theme Selector */}
        <SettingsCard
          title="Tema Visual"
          icon={<FaPalette />}
          className="md:col-span-4"
        >
          <div className="flex flex-col gap-2">
            <div className="form-control ">
              <label className="label cursor-pointer border border-base-300 rounded-lg p-3 hover:bg-base-200 min-w-full flex justify-between">
                <span className="label-text ">
                  Modo Claro (Por defecto)
                </span>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="theme"
                    className="radio radio-primary radio-sm"
                  />
                </div>
              </label>
            </div>
            <div className="form-control ">
              <label className="label cursor-pointer border border-base-300 rounded-lg p-3 hover:bg-base-200 min-w-full flex justify-between">
                <span className="label-text">Modo Oscuro</span>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="theme"
                    className="radio radio-primary radio-sm"
                  />
                </div>
              </label>
            </div>
            <div className="form-control ">
              <label className="label cursor-pointer border border-base-300 rounded-lg p-3 hover:bg-base-200 min-w-full flex justify-between">
                <span className="label-text">Preferencia del Sistema</span>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="theme"
                    className="radio radio-primary radio-sm"
                  />
                </div>
              </label>
            </div>
          </div>
        </SettingsCard>

        {/* Mail & Notifications */}
        <SettingsCard
          title="Correo y Notificaciones"
          icon={<FaEnvelope />}
          className="md:col-span-6"
          footer={
            <button className="btn btn-primary" type="submit">Guardar Detalles</button>
          }
        >
          <div className="space-y-6">
            {/* Mail Config */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Servidor SMTP" defaultValue="smtp.unipay.edu" />
              <FormField label="Puerto" defaultValue="587" />
            </div>

            {/* System Notifications */}
            <div className="divider text-xs opacity-40">
              ALERTAS DEL SISTEMA
            </div>
            <div className="space-y-1">
              <ToggleField
                label="Alertas de Aprobación de Nómina"
                defaultChecked
              />
              <ToggleField
                label="Avisos de Mantenimiento del Sistema"
                defaultChecked
              />
              <ToggleField label="Resúmenes Diarios de Auditoría" />
            </div>
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}
