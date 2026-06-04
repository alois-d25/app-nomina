from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db

from crud.empleado_crud import crud_empleado
from routers.factory import create_crud_router
from utils.auth import get_current_payload
from schemas.empleado_schema import EmpleadoCreate, EmpleadoResponse, EmpleadoUpdate, EmpleadoSinUsuarioResponse

router = APIRouter(tags=["Empleados"])

# Ruta personalizada PRIMERO
@router.get("/filtro/sin-usuario", response_model=List[EmpleadoSinUsuarioResponse], dependencies=[Depends(get_current_payload)])
def obtener_empleados_sin_usuario(db: Session = Depends(get_db)):
    return crud_empleado.get_empleados_sin_usuario(db)

crud_router = create_crud_router(
    schema_create=EmpleadoCreate,
    schema_update=EmpleadoUpdate,
    schema_response=EmpleadoResponse,
    crud_service=crud_empleado,
    id_name="cedula",
    permissions={"create": "empleados:crear", "update": "empleados:editar", "delete": "empleados:eliminar"},
)

router.include_router(crud_router)