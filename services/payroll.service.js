import axiosClient from "./axiosClient";

const resource = "nominas";

export const NominaService = {
  // 1. CREATE (Post a new payroll)
  createPayroll: async (payrollData) => {
    try {
      // POST request to /nominas with the payload data
      const response = await axiosClient.post(`/${resource}`, payrollData);
      return response.data;
    } catch (error) {
      console.error(
        `Error creating ${resource}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  },

  // 2. READ ALL (Get a list of all payrolls)
  getPayrolls: async () => {
    try {
      // GET request to /nominas
      const response = await axiosClient.get(`/${resource}`);
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching ${resource}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  },

  // 3. READ ONE (Get a specific payroll by its ID)
  getPayrollById: async (id) => {
    try {
      // GET request to /nominas/123
      const response = await axiosClient.get(`/${resource}/${id}`);
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching ${resource} with ID ${id}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  },

  getEmployeesPayrollInfo: async (id) => {
    try {
      // Traemos todos los empleados de la nómina de una vez; la búsqueda,
      // el filtro y la paginación se hacen del lado del cliente.
      const response = await axiosClient.get(
        `/${resource}/${id}/detalle-empleados?skip=0&limit=100000`,
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching ${resource} with ID ${id}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  },

  getPayrollPeriod: async (period) => {
    try {
      if (!period?.month || !period?.year || !period?.quincena) {
        console.warn("getPayrollPeriod: Parámetros incompletos", period);
        return null;
      }
      const response = await axiosClient.get(
        `/${resource}/buscar/periodo?mes=${period.month}&anio=${period.year}&quincena=${period.quincena}`,
      );
      return response.data.nomina;
    } catch (error) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  createPayrollEvent: async (eventData, employeeIds, eventType) => {
    try {
      const endpoint = eventType === 'bono' ? '/bonos' : '/deducciones';
      const payload = {
        nombre: eventData.nombre,
        monto: parseFloat(eventData.monto),
        es_porcentaje: eventData.es_porcentaje,
        descripcion: eventData.descripcion || "",
        observacion: eventData.observacion || null,
        tipo_pago: eventData.tipo_pago,
        fecha: eventData.fecha || null,
        lista_empleados: employeeIds,
      };
      const response = await axiosClient.post(endpoint, payload);
      return response.data;
    } catch (error) {
      console.error(
        `Error creating payroll event:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  },

  createPrestamo: async ({ empleado_cedula, monto_total, descripcion, fecha }) => {
    try {
      const response = await axiosClient.post('/deducciones/prestamo', {
        empleado_cedula,
        monto_total: parseFloat(monto_total),
        descripcion: descripcion || "",
        fecha: fecha || null,
      });
      return response.data;
    } catch (error) {
      console.error(
        `Error creating prestamo:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  },

  createNomina: async (fechaPago) => {
    try {
      const response = await axiosClient.post(`/${resource}/crear`, {
        fecha_pago: fechaPago,
      });
      return response.data;
    } catch (error) {
      console.error(
        `Error creating nomina:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  },

  // // 4. UPDATE (Modify an existing payroll by its ID)
  // updatePayroll: async (id, updatedData) => {
  //   try {
  //     // PUT request to /nominas/123 with the updated payload data
  //     const response = await axiosClient.put(`/${resource}/${id}`, updatedData);
  //     return response.data;
  //   } catch (error) {
  //     console.error(
  //       `Error updating ${resource} with ID ${id}:`,
  //       error.response?.data || error.message,
  //     );
  //     throw error;
  //   }
  // },

  // // 5. DELETE (Remove a payroll by its ID)
  // deletePayroll: async (id) => {
  //   try {
  //     // DELETE request to /nominas/123
  //     const response = await axiosClient.delete(`/${resource}/${id}`);
  //     return response.data; // Usually returns a success message or the deleted object
  //   } catch (error) {
  //     console.error(
  //       `Error deleting ${resource} with ID ${id}:`,
  //       error.response?.data || error.message,
  //     );
  //     throw error;
  //   }
  // },
};
