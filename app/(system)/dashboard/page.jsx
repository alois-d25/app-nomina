'use client';
import { useState, useEffect } from "react";
import axiosClient from "@/services/axiosClient";
import DashboardPage from "./dashboardPage";

const EMPTY = {
    total_empleados: 0,
    empleados_activos: 0,
    gastos_mensuales_bs: 0,
    tasa_actual: null,
    tasa_tipo: null,
    ultimas_nominas: [],
    grafica_gastos: [],
};

const Dashboard = () => {
    const [resumen, setResumen] = useState(EMPTY);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const response = await axiosClient.get(`/nominas/dashboard/resumen`);
                setResumen(response.data || EMPTY);
            } catch (error) {
                console.error("Error al obtener el resumen del dashboard:", error?.message);
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

    return <DashboardPage resumen={resumen} />;
};

export default Dashboard;
