from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db

from crud.evento_empleado_crud import crud_evento_empleado
from routers.factory import create_crud_router
from utils.auth import get_current_payload
from models.evento_empleado_model import TipoEvento
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
