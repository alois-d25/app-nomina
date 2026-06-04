import axiosClient from "./axiosClient";

const resource = "/eventos_empleados";

export const EventService = {
  // Tipos de evento desde el enum del modelo (BD)
  getTipos: async () => {
    const response = await axiosClient.get(`${resource}/tipos`);
    return response.data;
  },

  // Eventos de un empleado para un mes/año concreto
  getMensual: async (cedula, anio, mes) => {
    const response = await axiosClient.get(`${resource}/empleado/${cedula}/mensual`, {
      params: { anio, mes },
    });
    return response.data;
  },

  // Crear un nuevo evento
  crear: async (payload) => {
    const response = await axiosClient.post(`${resource}/`, payload);
    return response.data;
  },

  // Editar un evento existente
  actualizar: async (id, payload) => {
    const response = await axiosClient.put(`${resource}/${id}`, payload);
    return response.data;
  },

  // Eliminar un evento
  eliminar: async (id) => {
    const response = await axiosClient.delete(`${resource}/${id}`);
    return response.data;
  },
};
