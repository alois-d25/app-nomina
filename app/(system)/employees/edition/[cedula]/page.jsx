// app/employees/edition/[cedula]/page.jsx
'use client';
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import axiosClient from "@/services/axiosClient";
import EditEmployeeForm from "./editionForm";

export default function EditEmployeePage() {
  const params = useParams();
  const cedula = params?.cedula;

  const [employeeData, setEmployeeData] = useState(null);
  const [titulos, setTitulos] = useState([]);
  const [escalafones, setEscalafones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cedula) return;
    const load = async () => {
      try {
        const [empRes, titulosRes, escalafonesRes] = await Promise.all([
          axiosClient.get(`/empleados/${cedula}`),
          axiosClient.get(`/titulos_academicos`),
          axiosClient.get(`/niveles_escalafon`),
        ]);
        setEmployeeData(empRes.data);
        setTitulos(titulosRes.data || []);
        setEscalafones(escalafonesRes.data || []);
      } catch (error) {
        console.error("Error al obtener los datos para edición:", error?.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [cedula]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-error">Empleado no encontrado</h2>
        <p>No se pudo cargar la información del empleado con cédula {cedula}.</p>
      </div>
    );
  }

  return (
    <EditEmployeeForm
      employeeData={employeeData}
      titulos={titulos}
      escalafones={escalafones}
    />
  );
}
