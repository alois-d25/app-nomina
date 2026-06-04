from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from database import get_db

from crud.auditoria_crud import crud_auditoria
from routers.factory import create_crud_router
from utils.auth import require_permission
from schemas.auditoria_schema import (
    AuditoriaCreate, AuditoriaResponse, AuditoriaUpdate,
    AuditoriaPagedResponse
)

# Todo el módulo de auditorías requiere el permiso roles:gestionar (solo Administrador general)
router = APIRouter(tags=["Auditorias"], dependencies=[Depends(require_permission("roles:gestionar"))])

@router.get("/vista/detalles", response_model=AuditoriaPagedResponse)
def obtener_auditorias_detalles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    accion: Optional[str] = None,
    tabla: Optional[str] = None,
    db: Session = Depends(get_db)
):
    skip = (page - 1) * page_size
    data, total = crud_auditoria.get_auditorias_con_detalles(
        db,
        skip=skip,
        limit=page_size,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        accion=accion,
        tabla=tabla,
    )
    return {"data": data, "total": total}

crud_router = create_crud_router(
    schema_create=AuditoriaCreate,
    schema_update=AuditoriaUpdate,
    schema_response=AuditoriaResponse,
    crud_service=crud_auditoria,
    id_name="id"
)

router.include_router(crud_router)
