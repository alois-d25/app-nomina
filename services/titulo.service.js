import axiosClient from "./axiosClient";

const resource = "/titulos_academicos";

export const TituloService = {
  // Lista todos los títulos académicos registrados
  getTitulos: async () => {
    const response = await axiosClient.get(`${resource}`);
    return response.data;
  },

  // Crear un nuevo título académico
  crear: async (payload) => {
    const response = await axiosClient.post(`${resource}/`, payload);
    return response.data;
  },

  // Editar un título académico existente
  actualizar: async (id, payload) => {
    const response = await axiosClient.put(`${resource}/${id}`, payload);
    return response.data;
  },

  // Eliminar un título académico
  eliminar: async (id) => {
    const response = await axiosClient.delete(`${resource}/${id}`);
    return response.data;
  },
};
