'use client';
import { useState, useEffect } from "react";
import axiosClient from "@/services/axiosClient";
import RegisterEmployeePage from "./registerForm";

export default function RegisterPage() {
  const [titulos, setTitulos] = useState([]);
  const [escalafones, setEscalafones] = useState([]);
  const [reglas, setReglas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [titulosRes, escalafonesRes, reglasRes] = await Promise.all([
          axiosClient.get(`/titulos_academicos`),
          axiosClient.get(`/niveles_escalafon`),
          axiosClient.get(`/reglas_escalafon/vista/detalles`),
        ]);
        setTitulos(Array.isArray(titulosRes.data) ? titulosRes.data : []);
        setEscalafones(Array.isArray(escalafonesRes.data) ? escalafonesRes.data : []);
        setReglas(Array.isArray(reglasRes.data) ? reglasRes.data : []);
      } catch (error) {
        console.error("Error al obtener los catálogos de la API:", error?.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return <RegisterEmployeePage titulos={titulos} escalafones={escalafones} reglas={reglas} />;
}
