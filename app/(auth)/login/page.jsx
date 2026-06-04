'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { MdAccountBalance, MdMail, MdLock, MdArrowForward } from 'react-icons/md';
import axios from 'axios';
import { useAuth } from '@/app/context/auth_context';

// Componente para el Logo y Nombre de la Marca
const BrandLogo = () => (
  <div className="absolute top-8 left-8 sm:left-12 md:left-16 flex items-center gap-2">
    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-sm">
      <MdAccountBalance className="text-xl" />
    </div>
    <span className="font-headline-md text-headline-md text-on-surface">UniPay Admin</span>
  </div>
);

// Componente para los campos de entrada con ícono
const InputField = ({ label, id, type, placeholder, icon: Icon, name, value, onChange }) => (
  <div>
    <label className="block font-label-md text-label-md text-on-surface mb-2" htmlFor={id}>
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
        <Icon className="text-xl" />
      </div>
      <input
        className="block w-full pl-10 pr-3 py-2.5 border border-outline-variant rounded-DEFAULT bg-surface text-on-surface font-body-md text-body-md focus:ring-1 focus:ring-primary focus:border-primary transition-colors placeholder:text-on-surface-variant/50 hover:border-outline"
        id={id}
        name={name}
        placeholder={placeholder}
        required
        type={type}
        value={value}
        onChange={onChange}
      />
    </div>
  </div>
);

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();

  // Si ya hay sesión iniciada, no mostramos el login: vamos al inicio
  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  // Estados para manejar el formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE}/api/login/login`,
        { email, password },
        { withCredentials: true }
      );

      // Guardamos el token (JWT) y la data del usuario en localStorage
      const user = response.data?.user;
      const token = response.data?.token;

      if (user && token) {
        // Set the token cookie on the frontend domain
        try {
          await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
        } catch (cookieErr) {
          console.warn('Error setting frontend cookie:', cookieErr);
        }

        login(user, token);
        router.push('/');
      } else {
        setError('No se recibieron datos del usuario');
        setIsLoading(false);
      }

    } catch (err) {
      console.error('Login error:', err);
      if (err.response?.status === 401) {
        setError('Correo o contraseña incorrectos');
      } else {
        setError('Error al conectar con el servidor');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-screen">
      {/* Lado Izquierdo: Contenedor del Formulario */}
      <div className="w-full lg:w-[480px] xl:w-[560px] bg-surface-container-lowest flex flex-col justify-center px-8 sm:px-12 md:px-16 relative z-10 shadow-[0_0_40px_rgba(0,0,0,0.05)] border-r border-secondary-container/30">
        
        <BrandLogo />

        {/* Encabezado */}
        <div className="mb-stack-lg mt-16">
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-stack-sm">
            Bienvenido de nuevo
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Ingrese sus credenciales para acceder al panel de administración financiera institucional.
          </p>
        </div>

        {/* Formulario de Inicio de Sesión */}
        <form onSubmit={handleLogin} className="flex flex-col gap-stack-md">
          {error && (
            <div className="bg-error/10 text-error p-3 rounded-md text-sm text-center">
              {error}
            </div>
          )}

          <div>
             <InputField
              label="Correo Electrónico"
              id="email"
              name="email"
              type="email"
              placeholder="admin@universidad.edu"
              icon={MdMail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <InputField
              label="Contraseña"
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              icon={MdLock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            disabled={isLoading}
            className="w-full bg-primary text-on-primary font-medium py-3 px-4 rounded-DEFAULT flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all duration-200" 
            type="submit"
          >
            {isLoading ? <span>Verificando...</span> : <span>Iniciar Sesión</span>}
            {!isLoading && <MdArrowForward className="text-2xl" />}
          </button>
        </form>

        {/* Texto sutil del pie de página */}
        <div className="mt-12 text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant/70">
            Conexión segura encriptada. Sistema de uso exclusivo para personal autorizado.
          </p>
        </div>
      </div>

      {/* Lado Derecho: Área de Ilustración */}
      <div className="hidden lg:flex flex-1 relative bg-surface-variant items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-surface-container-high to-surface-container-highest"></div>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#737a61 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <img alt="Finanzas institucionales" className="w-full h-full object-cover mix-blend-overlay opacity-80" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-g2QsULyZLJvB_N8TngS8HQyiUvt04aO0HaVpSSGi31hWR2jPpUif-pZq0G7G8mcrZpxIKAUp7a3x9Cx5_PR3i97tjqxFKHV3-k2iqXI1N3sF2n_s1JkoZR9z-pnOyoVQsdSJPQv_y1Jt42JQvAdr-xTcBFF3yAOO55BIY5DlXWKZ9I8wOctMEMEDY45p0EQmHkHlUMFenGvPPMg--cNMm9_rS7G_9i3qQNTDfnW7NO-VS8blbGPdssL4kNem07jtv3a-GMT-G4c"/>
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent"></div>
      </div>
    </div>
  );
}