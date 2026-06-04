'use client';
import { useAuth } from '@/app/context/auth_context';

/**
 * Renderiza `children` solo si el usuario tiene el/los permiso(s) indicado(s).
 *
 * @param {string|string[]} permission  Permiso o lista de permisos requeridos.
 * @param {boolean} anyOf  Si es true, basta con tener AL MENOS uno de los permisos.
 *                          Por defecto (false) se exigen TODOS.
 * @param {React.ReactNode} fallback  Qué renderizar si no tiene permiso (por defecto nada).
 */
export default function Can({ permission, anyOf = false, fallback = null, children }) {
  const { hasPermission, loading } = useAuth();

  if (loading) return null;

  const perms = Array.isArray(permission) ? permission : [permission];
  const allowed = anyOf ? perms.some((p) => hasPermission(p)) : perms.every((p) => hasPermission(p));

  return allowed ? children : fallback;
}
