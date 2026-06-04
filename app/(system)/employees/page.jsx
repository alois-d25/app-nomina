'use client';
import { useState, useEffect, useCallback } from "react";
import axiosClient from "@/services/axiosClient";
import EmployeesView from "./employeesView";

const EmployeesPage = () => {
    const [employeesData, setEmployeesData] = useState([]);
    const [escalafonesData, setEscalafonesData] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const [empleadosRes, escalafonesRes] = await Promise.all([
                axiosClient.get(`/empleados/`),
                axiosClient.get(`/niveles_escalafon/`),
            ]);
            setEmployeesData(empleadosRes.data || []);
            setEscalafonesData(escalafonesRes.data || []);
        } catch (error) {
            console.error("Error al obtener los datos de la API:", error?.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <span className="loading loading-spinner loading-lg text-primary" />
            </div>
        );
    }

    return (
        <EmployeesView
            employeesData={employeesData}
            escalafonesData={escalafonesData}
            onReload={load}
        />
    );
};

export default EmployeesPage;
