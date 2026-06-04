'use client';
import { useState, useEffect } from "react";
import axiosClient from "@/services/axiosClient";
import SalaryRules from "./salaryRulesView";

const SalaryRulesPage = () => {
    const [rulesData, setRulesData] = useState([]);
    const [titulosData, setTitulosData] = useState([]);
    const [escalafonesData, setEscalafonesData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [rulesRes, titulosRes, escalafonesRes] = await Promise.all([
                    axiosClient.get(`/reglas_escalafon/vista/detalles`),
                    axiosClient.get(`/titulos_academicos`),
                    axiosClient.get(`/niveles_escalafon`),
                ]);
                setRulesData(rulesRes.data || []);
                setTitulosData(titulosRes.data || []);
                setEscalafonesData(escalafonesRes.data || []);
            } catch (error) {
                console.error("Error al obtener los datos de la API:", error?.message);
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

    return (
        <SalaryRules
            rulesData={rulesData}
            titulos={titulosData}
            escalafones={escalafonesData}
        />
    );
};

export default SalaryRulesPage;
