# Conectamos las rutas
from fastapi import APIRouter

from routers import (
    empleado_router,
    niveles_escalafon_router,
    reglas_escalafon_router,
    titulos_academicos_router,
    usuario_router,
    nomina_empleado_router,
    bono_router,
    bono_relaciones_router,
    deduccion_router,
    deduccion_relaciones_router,
    nominas_router,
    tasa_dolar_router,
    roles_permisos_router,
    auth_router,
    cestaticket_router,
    auditoria_router,
    liquidaciones_router,
    evento_empleado_router
)

router = APIRouter()


router.include_router(empleado_router.router, prefix="/empleados", tags=["Empleados"])
router.include_router(usuario_router.router, prefix='/usuarios', tags=["Usuarios"])
router.include_router(niveles_escalafon_router.router, prefix='/niveles_escalafon', tags=["Niveles Escalafon"])
router.include_router(reglas_escalafon_router.router, prefix='/reglas_escalafon', tags=["Reglas Escalafon"])
router.include_router(titulos_academicos_router.router, prefix='/titulos_academicos', tags=["Titulos academicos"])
router.include_router(nominas_router.router,prefix='/nominas')
router.include_router(nomina_empleado_router.router, prefix='/nomina_empleados', tags=["Nomina Empleados"])
router.include_router(bono_router.router, prefix='/bonos', tags=["Bonos"])
router.include_router(bono_relaciones_router.router, prefix='/bonos_relaciones', tags=["Bonos Relaciones"])
router.include_router(deduccion_router.router, prefix='/deducciones', tags=["Deducciones"])
router.include_router(deduccion_relaciones_router.router, prefix='/deducciones_relaciones', tags=["Deducciones Relaciones"])
router.include_router(tasa_dolar_router.router, prefix='/tasa_dolar', tags=["Tasa Dolar"])
router.include_router(cestaticket_router.router, prefix='/cestaticket', tags=["Cestaticket"])
router.include_router(liquidaciones_router.router, prefix='/liquidaciones', tags=["Liquidaciones"])
router.include_router(auth_router.router, tags=["Login"])
router.include_router(auth_router.router, tags=["Login"])
router.include_router(auditoria_router.router, prefix='/auditorias', tags=["Auditorias"])
router.include_router(roles_permisos_router.router, prefix='/roles', tags=["Autorizacion"])
router.include_router(evento_empleado_router.router, prefix='/eventos_empleados', tags=["Eventos Empleados"])
