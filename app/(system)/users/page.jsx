'use client';
import { useState, useEffect } from "react";
import axiosClient from "@/services/axiosClient";
import UsersView from "./usersView";

const UsersPage = () => {
    const [usersData, setUsersData] = useState([]);
    const [employeesData, setEmployeesData] = useState([]);
    const [userRoles, setUserRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [usuariosRes, empleadosRes, rolesRes] = await Promise.all([
                    axiosClient.get(`/usuarios/vista/detalles`),
                    axiosClient.get(`/empleados/filtro/sin-usuario`),
                    axiosClient.get(`/roles`),
                ]);
                setUsersData(usuariosRes.data || []);
                setEmployeesData(empleadosRes.data || []);
                setUserRoles(rolesRes.data || []);
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
        />
    );
};

export default UsersPage;
