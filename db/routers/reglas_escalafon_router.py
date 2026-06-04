from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db

from crud.reglas_escalafon_crud import crud_reglas_escalafon
from routers.factory import create_crud_router
from utils.auth import get_current_payload
from schemas.reglas_escalafon_schema import ReglasEscalafonCreate, ReglasEscalafonResponse, ReglasEscalafonUpdate, ReglasEscalafonDetalleResponse

router = APIRouter(tags=["Reglas Escalafon"])

@router.get("/vista/detalles", response_model=List[ReglasEscalafonDetalleResponse], dependencies=[Depends(get_current_payload)])
def obtener_reglas_detalles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_reglas_escalafon.get_reglas_con_detalles(db, skip=skip, limit=limit)

crud_router = create_crud_router(
    schema_create= ReglasEscalafonCreate,
    schema_update= ReglasEscalafonUpdate,
    schema_response= ReglasEscalafonResponse,
    crud_service= crud_reglas_escalafon,
    id_name='id',
    permissions={"create": "nominas:crear", "update": "nominas:editar", "delete": "nominas:eliminar"},
)

router.include_router(crud_router)