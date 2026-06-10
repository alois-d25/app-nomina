import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import NominaEmpleadoDetalle from "./NominaEmpleadoDetalle";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchDetalle(nominaId, cedula) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    const res = await fetch(
      `${API_URL}/api/nominas/${nominaId}/empleado/${cedula}/detalle`,
      {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function NominaEmpleadoDetallePage({ params }) {
  const { nominaId, cedula } = await params;

  const detalle = await fetchDetalle(nominaId, cedula);

  if (!detalle) {
    console.error("No detalle found for nomina:", nominaId, "employee:", cedula);
    notFound();
  }

  return (
    <main className="flex-1 p-gutter md:p-margin-page max-w-container-max mx-auto w-full flex flex-col gap-stack-lg">
      <NominaEmpleadoDetalle detalle={detalle} employee={{ cedula, nombre: detalle.empleado_cedula }} />
    </main>
  );
}
