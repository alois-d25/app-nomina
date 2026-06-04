'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MdLock } from 'react-icons/md';
import { useAuth } from '@/app/context/auth_context';
import { getRequiredPermission } from '@/app/config/permissions';

/**
 * Bloquea el acceso a una vista completa si el usuario no tiene el permiso
 * requerido para la ruta actual. Mientras carga la sesión muestra un spinner.
 * Si no hay sesión iniciada, redirige al login.
 */
export default function RouteGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hasPermission, loading } = useAuth();

  const required = getRequiredPermission(pathname);

  // Sin sesión (o token inválido tras validar /me) → al login
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (required && !hasPermission(required)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <span className="bg-error/10 text-error rounded-full p-5">
          <MdLock className="text-5xl" />
        </span>
        <div>
          <h2 className="text-2xl font-bold">Acceso restringido</h2>
          <p className="text-on-surface-variant mt-1">
            No tienes permisos para acceder a este módulo.
          </p>
        </div>
        <Link href="/" className="btn btn-primary">Volver al inicio</Link>
      </div>
    );
  }

  return children;
}
