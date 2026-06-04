from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from decimal import Decimal

from database import get_db
from crud.liquidacion_crud import crud_liquidacion
from schemas.liquidacion_schema import (
    LiquidacionCreate,
    LiquidacionResponse,
    LiquidacionUpdate,
    LiquidacionDraftResponse
)
from models.liquidacion_model import Liquidacion
from utils.auth import get_current_payload, require_permission

router = APIRouter(tags=["Liquidaciones"], dependencies=[Depends(get_current_payload)])


@router.post("/", response_model=LiquidacionResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("nominas:crear"))])
def create_liquidacion(liquidacion_data: LiquidacionCreate, db: Session = Depends(get_db)):
    """Create a new liquidacion"""
    return crud_liquidacion.create(db, obj_in=liquidacion_data)


@router.get("/", response_model=List[LiquidacionResponse])
def read_all_liquidaciones(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all liquidaciones"""
    return crud_liquidacion.get_all(db, skip=skip, limit=limit)


@router.get("/{liquidacion_id}", response_model=LiquidacionResponse)
def read_liquidacion(liquidacion_id: int, db: Session = Depends(get_db)):
    """Get a specific liquidacion"""
    liquidacion = crud_liquidacion.get(db, id=liquidacion_id)
    if not liquidacion:
        raise HTTPException(status_code=404, detail="Liquidacion not found")
    return liquidacion


@router.put("/{liquidacion_id}", response_model=LiquidacionResponse, dependencies=[Depends(require_permission("nominas:editar"))])
def update_liquidacion(
    liquidacion_id: int,
    liquidacion_data: LiquidacionUpdate,
    db: Session = Depends(get_db)
):
    """Update a liquidacion"""
    liquidacion = crud_liquidacion.get(db, id=liquidacion_id)
    if not liquidacion:
        raise HTTPException(status_code=404, detail="Liquidacion not found")
    return crud_liquidacion.update(db, db_obj=liquidacion, obj_in=liquidacion_data)


@router.delete("/{liquidacion_id}", response_model=LiquidacionResponse, dependencies=[Depends(require_permission("nominas:eliminar"))])
def delete_liquidacion(liquidacion_id: int, db: Session = Depends(get_db)):
    """Delete a liquidacion"""
    liquidacion = crud_liquidacion.get(db, id=liquidacion_id)
    if not liquidacion:
        raise HTTPException(status_code=404, detail="Liquidacion not found")
    return crud_liquidacion.remove(db, id=liquidacion_id)


@router.post("/{liquidacion_id}/approve", response_model=LiquidacionResponse, dependencies=[Depends(require_permission("nominas:editar"))])
def approve_liquidacion(liquidacion_id: int, db: Session = Depends(get_db)):
    """Approve a liquidacion and mark employee as inactive"""
    result = crud_liquidacion.approve_liquidacion(db, liquidacion_id)
    if not result:
        raise HTTPException(status_code=404, detail="Liquidacion not found")
    return result


@router.get("/employee/{empleado_cedula}", response_model=LiquidacionResponse)
def get_liquidacion_by_employee(empleado_cedula: str, db: Session = Depends(get_db)):
    """Get liquidacion for a specific employee"""
    liquidacion = crud_liquidacion.get_by_empleado(db, empleado_cedula)
    if not liquidacion:
        raise HTTPException(status_code=404, detail="No liquidacion found for this employee")
    return liquidacion
