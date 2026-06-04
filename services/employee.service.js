import axiosClient from "./axiosClient";
const resource = "/empleados";
export const EmployeeService = {
  getEmployees: async () => {
    const response = await axiosClient.get(`${resource}`);
    return response.data;
  },
};
