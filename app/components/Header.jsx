"use client";

import { useState } from "react";

/**
 * Componente de encabezado con búsqueda y perfil de usuario
 */
export default function Header({ title = "UniPay Admin" }) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-base-300 bg-base-200/80 px-6 backdrop-blur-md h-16">
      {/* Left - Title */}
      <div className="flex-1 flex items-center gap-4">
        <div className="text-xl font-bold text-base-content">{title}</div>
      </div>

      {/* Center - Search */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-full max-w-md hidden md:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar empleados, nóminas..."
            className="input input-bordered w-full pl-10"
          />
        </div>
      </div>

      {/* Right - Actions & Profile */}
      <div className="flex-1 flex items-center justify-end gap-2">
        <button className="btn btn-ghost btn-circle">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="btn btn-ghost btn-circle">
          <span className="material-symbols-outlined">help_outline</span>
        </button>
        <div className="avatar ml-2">
          <div className="w-8 rounded-full ring ring-primary ring-offset-base-100 ring-offset-1">
            <img
              alt="Perfil del Administrador"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtanOqsaiWSrcOcedeTO977z9BVfH5h9kDeGATKyG7E_o0KpdzGXxEq1aK49K-XCIBmGVDS18R3j1Q0Uz59ZKfUwMXUWA4Z_M3fYZHNJ-5zz5tGmgZaQ_bazFiQKdiSQr7U8mb8xtQIgIBd5WkDFYwn0RqfRnoBXrvyOWM2oiFOY8XVmA9GeRb0SnVEEl64IWjpu9fxLXf9ogarDPnRMu6YQ5wRgSTX9zh00gvbW40ulEWbqF12np8YvtQ10pMTlhdKOXd1LseDD0"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
