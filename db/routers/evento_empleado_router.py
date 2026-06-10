from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from database import get_db

from crud.evento_empleado_crud import crud_evento_empleado, calcular_dias_vacaciones_lottt
from crud.nominas_crud import _calcular_salario_integral
from routers.factory import create_crud_router
from routers.tasa_dolar_router import _fetch_bcv_valor
from crud.tasa_dolar_crud import crud_tasa_dolar
from utils.auth import get_current_payload
from models.evento_empleado_model import TipoEvento
from models.empleado_model import Empleado
from schemas.evento_empleado_schema import (
    EventoEmpleadoCreate,
    EventoEmpleadoResponse,
    EventoEmpleadoUpdate,
)

# Todo el módulo requiere sesión; las escrituras además exigen empleados:editar (ver factory)
router = APIRouter(tags=["Eventos Empleados"], dependencies=[Depends(get_current_payload)])


# Tipos de evento disponibles (alimenta el select del frontend desde el enum del modelo)
@router.get("/tipos", response_model=List[str])
def obtener_tipos_evento():
    return [e.value for e in TipoEvento]


@router.get("/vacaciones/calcular-dias")
async def calcular_dias_vacaciones(
    cedula: str = Query(..., description="Cédula del empleado"),
    fecha_inicio: str = Query(..., description="Fecha de inicio de vacaciones YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    """
    Calcula los días de vacaciones y bono vacacional según LOTTT basándose en
    los años de servicio del empleado al momento de iniciar las vacaciones.
    También retorna el Salario Integral Diario (SID) en USD y en Bs.
    """
    empleado = db.query(Empleado).filter_by(cedula=cedula).first()
    if not empleado:
        raise HTTPException(status_code=404, detail=f"Empleado {cedula} no encontrado")

    try:
        fecha_inicio_dt = date.fromisoformat(fecha_inicio)
    except ValueError:
        raise HTTPException(status_code=400, detail="fecha_inicio debe ser YYYY-MM-DD")

    anios_servicio = (fecha_inicio_dt - empleado.fecha_ingreso).days / 365.0
    if anios_servicio < 0:
        raise HTTPException(status_code=400, detail="La fecha de inicio es anterior a la fecha de ingreso")

    dias_info = calcular_dias_vacaciones_lottt(anios_servicio)

    salario_base_usd = float(empleado.salario_base)
    salario_integral_mensual = _calcular_salario_integral(salario_base_usd)
    sid_usd = salario_integral_mensual / 30.0
    sdb_usd = salario_base_usd / 30.0

    monto_vacaciones_usd = dias_info["dias_vacaciones"] * sid_usd
    monto_bono_vac_usd   = dias_info["dias_bono_vac"]   * sdb_usd

    # Tasa vigente para mostrar conversión en Bs al frontend
    tasa_personalizada = crud_tasa_dolar.get_tasa_personalizada_vigente(db)
    if tasa_personalizada is not None:
        tasa_bs = tasa_personalizada
        tasa_fuente = "usuario"
    else:
        try:
            tasa_bs = await _fetch_bcv_valor()
            tasa_fuente = "api"
        except Exception:
            tasa_bs = None
            tasa_fuente = "no_disponible"

    return {
        **dias_info,
        "salario_base_usd": round(salario_base_usd, 4),
        "sid_usd": round(sid_usd, 4),
        "sid_bs": round(sid_usd * tasa_bs, 2) if tasa_bs else None,
        "monto_vacaciones_usd": round(monto_vacaciones_usd, 4),
        "monto_vacaciones_bs": round(monto_vacaciones_usd * tasa_bs, 2) if tasa_bs else None,
        "monto_bono_vac_usd": round(monto_bono_vac_usd, 4),
        "monto_bono_vac_bs": round(monto_bono_vac_usd * tasa_bs, 2) if tasa_bs else None,
        "tasa_bs": tasa_bs,
        "tasa_fuente": tasa_fuente,
    }


# Eventos de un empleado para un mes/año específico (consulta mensual del calendario)
@router.get("/empleado/{cedula}/mensual", response_model=List[EventoEmpleadoResponse])
def obtener_eventos_mensuales(cedula: str, anio: int, mes: int, db: Session = Depends(get_db)):
    return crud_evento_empleado.get_mensual(db, cedula, anio, mes)


# Todos los eventos de un empleado
@router.get("/empleado/{cedula}", response_model=List[EventoEmpleadoResponse])
def obtener_eventos_por_empleado(cedula: str, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_evento_empleado.get_by_empleado(db, cedula, skip=skip, limit=limit)

# Rutas CRUD automáticas (crear, listar, obtener, editar, eliminar)
crud_router = create_crud_router(
    schema_create=EventoEmpleadoCreate,
    schema_update=EventoEmpleadoUpdate,
    schema_response=EventoEmpleadoResponse,
    crud_service=crud_evento_empleado,
    id_name="id",
    permissions={"create": "empleados:editar", "update": "empleados:editar", "delete": "empleados:editar"},
)

router.include_router(crud_router)
