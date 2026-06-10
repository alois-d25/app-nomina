// context/AuthContext.jsx
'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

// Interceptor global: adjunta el token de localStorage en cada petición de axios.
// (Cubre tanto el `axios` global usado en las vistas como cualquier llamada directa.)
if (typeof window !== "undefined") {
  axios.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const permissions = user?.permisos || [];

  const refreshSession = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      localStorage.removeItem('user');
      return null;
    }
    try {
      const response = await axios.get(`${API_BASE}/api/login/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const currentUser = response.data?.user || null;
      setUser(currentUser);
      if (currentUser) {
        localStorage.setItem('user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('user');
      }
      return currentUser;
    } catch {
      // token inválido o expirado: limpiamos la sesión
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const initializeSession = async () => {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem('user');
        }
      }

      await refreshSession();
      if (mounted) setLoading(false);
    };

    initializeSession();

    // Sincroniza sesión entre pestañas (token o user)
    const handleStorage = (event) => {
      if (event.key === 'user') {
        if (!event.newValue) {
          setUser(null);
          return;
        }
        try {
          setUser(JSON.parse(event.newValue));
        } catch {
          setUser(null);
        }
      }
      if (event.key === 'token' && !event.newValue) {
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      mounted = false;
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshSession]);

  // login recibe los datos del usuario y el token (JWT) para guardarlos en localStorage
  const login = (userData, token) => {
    if (token) localStorage.setItem('token', token);
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const hasPermission = useCallback((permission) => {
    return permissions.includes(permission);
  }, [permissions]);

  const logout = useCallback(async () => {
    try {
      await axios.post(`${API_BASE}/api/login/logout`, {});
    } catch {
      // Aunque falle el backend, limpiamos el estado local para evitar sesión fantasma.
    }
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/login';
  }, []);

  const contextValue = useMemo(() => ({
    user,
    permissions,
    hasPermission,
    login,
    logout,
    loading,
    refreshSession,
  }), [user, permissions, hasPermission, logout, loading, refreshSession]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
