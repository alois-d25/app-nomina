'use client';
import { useState, useEffect } from "react";
import axiosClient from "@/services/axiosClient";
import UsersView from "./usersView";

const UsersPage = () => {
    const [usersData, setUsersData] = useState([]);
    const [employeesData, setEmployeesData] = useState([]);
    const [userRoles, setUserRoles] = useState([]);
    const [activeSessions, setActiveSessions] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [usuariosRes, empleadosRes, rolesRes, sesionesRes] = await Promise.all([
                    axiosClient.get(`/usuarios/vista/detalles`),
                    axiosClient.get(`/empleados/filtro/sin-usuario`),
                    axiosClient.get(`/roles`),
                    axiosClient.get(`/usuarios/sesiones/activas`),
                ]);
                setUsersData(usuariosRes.data || []);
                setEmployeesData(empleadosRes.data || []);
                setUserRoles(rolesRes.data || []);
                setActiveSessions(sesionesRes.data?.sesiones_activas ?? 0);
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
        <UsersView
            usersData={usersData}
            employeesData={employeesData}
            userRoles={userRoles}
            activeSessions={activeSessions}
        />
    );
};

export default UsersPage;
