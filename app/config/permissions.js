// Configuración central de permisos del sistema.
// Los nombres deben coincidir exactamente con los registrados en la BD (tabla `permisos`).

export const PERMISSIONS = {
  // Usuarios
  USUARIOS_CREAR: 'usuarios:crear',
  USUARIOS_VER: 'usuarios:ver',
  USUARIOS_EDITAR: 'usuarios:editar',
  USUARIOS_ELIMINAR: 'usuarios:eliminar',
  // Empleados
  EMPLEADOS_CREAR: 'empleados:crear',
  EMPLEADOS_VER: 'empleados:ver',
  EMPLEADOS_EDITAR: 'empleados:editar',
  EMPLEADOS_ELIMINAR: 'empleados:eliminar',
  // Nóminas (incluye bonos, deducciones, liquidaciones y tasa, que afectan la nómina)
  NOMINAS_CREAR: 'nominas:crear',
  NOMINAS_VER: 'nominas:ver',
  NOMINAS_EDITAR: 'nominas:editar',
  NOMINAS_ELIMINAR: 'nominas:eliminar',
  // Roles y seguridad
  ROLES_GESTIONAR: 'roles:gestionar',
};

// Permiso requerido para ACCEDER a cada módulo/ruta.
// Si una ruta no aparece aquí, basta con estar autenticado (ej: dashboard/inicio).
const ROUTE_PERMISSIONS = [
  { prefix: '/users', permission: PERMISSIONS.USUARIOS_VER },
  { prefix: '/employees', permission: PERMISSIONS.EMPLEADOS_VER },
  { prefix: '/nomina', permission: PERMISSIONS.NOMINAS_VER },
  { prefix: '/salaryRules', permission: PERMISSIONS.NOMINAS_VER },
  { prefix: '/bonus', permission: PERMISSIONS.NOMINAS_VER },
  { prefix: '/deductions', permission: PERMISSIONS.NOMINAS_VER },
  { prefix: '/liquidations', permission: PERMISSIONS.NOMINAS_VER },
  { prefix: '/liquidaciones', permission: PERMISSIONS.NOMINAS_VER },
  { prefix: '/exchange', permission: PERMISSIONS.NOMINAS_EDITAR },
  // Auditorías y configuración: solo quien gestiona roles/seguridad (Administrador general)
  { prefix: '/audits', permission: PERMISSIONS.ROLES_GESTIONAR },
  { prefix: '/config', permission: PERMISSIONS.ROLES_GESTIONAR },
];

// Devuelve el permiso necesario para la ruta dada (o null si no requiere ninguno).
// Usa la coincidencia de prefijo más larga para soportar subrutas dinámicas.
export function getRequiredPermission(pathname) {
  if (!pathname) return null;
  const match = ROUTE_PERMISSIONS
    .filter((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match ? match.permission : null;
}
