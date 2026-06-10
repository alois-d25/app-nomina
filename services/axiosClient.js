import axios from "axios";

// Nota: En Next.js las variables NEXT_PUBLIC se cargan automáticamente.
// No es necesario llamar a dotenv.config() en archivos del lado del cliente.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "";

const axiosClient = axios.create({
  baseURL: API_URL + "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Send cookies with every request
  timeout: 10000, // 10 segundos de timeout
});

// Interceptor de petición: adjunta el token JWT desde localStorage (Authorization: Bearer)
axiosClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor para manejar errores globalmente (ej. redirigir si el token expiró)
axiosClient.interceptors.response.use(
  (response) => {
    // Si la respuesta es exitosa (2xx), simplemente la dejamos pasar
    return response;
  },
  (error) => {
    // Aquí centralizas tus console.error antiguos
    const errorData = error.response?.data || error.message;
    console.error("API Error:", errorData);

    // Opcional: Aquí puedes meter lógica global (ej. si es 401 desloguear al usuario)

    // Es CRUCIAL rechazar la promesa para que el flujo sepa que hubo un fallo
    return Promise.reject(error);
  },
);
export default axiosClient;
