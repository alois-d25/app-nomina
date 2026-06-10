from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db

from crud.usuario_crud import crud_usuario
from crud.auditoria_crud import crud_auditoria
from routers.factory import create_crud_router
from utils.auth import get_current_payload
from schemas.usuario_schema import UsuarioCreate, UsuarioResponse, UsuarioUpdate, UsuarioDetalleResponse

# 1. Creamos el router principal
router = APIRouter(tags=["Usuarios"])

# 2. Definimos nuestras rutas personalizadas PRIMERO
@router.get("/vista/detalles", response_model=List[UsuarioDetalleResponse], dependencies=[Depends(get_current_payload)])
def obtener_usuarios_detalles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_usuario.get_usuarios_con_detalles(db, skip=skip, limit=limit)

@router.get("/sesiones/activas", dependencies=[Depends(get_current_payload)])
def contar_sesiones_activas(db: Session = Depends(get_db)):
    return {"sesiones_activas": crud_auditoria.contar_sesiones_activas(db)}

# 3. Creamos el router automático de la fábrica
crud_router = create_crud_router(
    schema_create=UsuarioCreate,
    schema_update=UsuarioUpdate,
    schema_response=UsuarioResponse,
    crud_service=crud_usuario,
    id_name="id",
    permissions={"create": "usuarios:crear", "update": "usuarios:editar", "delete": "usuarios:eliminar"},
)

# 4. Incluimos las rutas automáticas al router principal
router.include_router(crud_router)