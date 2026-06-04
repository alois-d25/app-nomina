'use client';
import { useState, useEffect } from "react";
import axiosClient from "@/services/axiosClient";
import NominaHistoryView from "./historyView";

const NominaHistoryPage = () => {
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const response = await axiosClient.get(`/nominas/historial/completo`);
                setHistorial(response.data || []);
            } catch (error) {
                console.error("Error al obtener el historial de nóminas:", error?.message);
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

    return <NominaHistoryView historial={historial} />;
};

export default NominaHistoryPage;
