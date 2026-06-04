import { notFound } from "next/navigation";
import EmployeeNominaHistory from "./EmployeeNominaHistory";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchEmployee(cedula) {
  try {
    const res = await fetch(`${API_URL}/api/empleados/${cedula}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchNominaHistory(cedula) {
  try {
    const res = await fetch(
      `${API_URL}/api/nominas/empleado/${cedula}/historial?limit=10`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function EmployeeNominaPage({ params }) {
  const { cedula } = await params;

  const [employee, nominaHistory] = await Promise.all([
    fetchEmployee(cedula),
    fetchNominaHistory(cedula),
  ]);

  if (!employee) notFound();

  return (
    <main className="flex-1 p-gutter md:p-margin-page max-w-container-max mx-auto w-full flex flex-col gap-stack-lg">
      <EmployeeNominaHistory employee={employee} nominaHistory={nominaHistory} />
    </main>
  );
}
