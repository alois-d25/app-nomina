import axiosClient from "./axiosClient";

const resource = "tasa_dolar";

export const ExchangeRateService = {
  getCurrentBCVPrice: async () => {
    const response = await axiosClient.get(`/${resource}/actual`); 
    return response.data;
  },

  getCurrentUSDTPrice: async () => {
    const response = await axiosClient.get(`/${resource}/usdt`); 
    return response.data;
  },

  getHistory: async () => {
    const response = await axiosClient.get(`/${resource}/historial`);
    return response.data;
  },

  saveExchangeRate: async (payload) => {
    const response = await axiosClient.post(`/${resource}/`, payload);
    if (!response) throw new Error("No se obtuvo respuesta del servidor");
    return response.data;
  }
};
