from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from crud.deduccion_crud import crud_deduccion_empleado
from schemas.deduccion_schema import (
    DeduccionEmpleadoCreate,
    DeduccionEmpleadoResponse,
    DeduccionEmpleadoDetalleResponse,
    NominaDeduccionCreate,
    NominaDeduccionResponse
)
from utils.auth import get_current_payload, require_permission

router = APIRouter(tags=["Deducciones Relaciones"], dependencies=[Depends(get_current_payload)])

# --- Endpoints para DeduccionEmpleado ---

def get_deduccion_empleado_or_404(db: Session, deduccion_id: int, empleado_cedula: str):
    obj = crud_deduccion_empleado.get(db, id=(empleado_cedula, deduccion_id))
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relación Deducción-Empleado no encontrada",
        )
    return obj

@router.get("/empleados", response_model=List[DeduccionEmpleadoDetalleResponse])
def read_all_deducciones_empleados(db: Session = Depends(get_db)):
    from models.deduccion_model import Deduccion, DeduccionEmpleado
    from models.empleado_model import Empleado

    resultados = db.query(
        DeduccionEmpleado.empleado_cedula,
        Empleado.nombre,
        Empleado.apellido,
        Deduccion.id.label("deduccion_id"),
        Deduccion.nombre.label("deduccion_nombre"),
        Deduccion.monto,
        Deduccion.tipo_pago,
        Deduccion.descripcion,
        Deduccion.es_porcentaje,
    ).join(Deduccion, DeduccionEmpleado.deduccion_id == Deduccion.id
    ).join(Empleado, DeduccionEmpleado.empleado_cedula == Empleado.cedula
    ).all()

    return [
        {
            "empleado_cedula": r.empleado_cedula,
            "empleado_nombre": f"{r.nombre} {r.apellido}",
            "deduccion_id": r.deduccion_id,
            "deduccion_nombre": str(r.deduccion_nombre),
            "monto": r.monto,
            "tipo_pago": r.tipo_pago,
            "descripcion": r.descripcion,
            "es_porcentaje": r.es_porcentaje,
        }
        for r in resultados
    ]

@router.post("/empleados", response_model=DeduccionEmpleadoResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("nominas:crear"))])
def create_deduccion_empleado(obj_in: DeduccionEmpleadoCreate, db: Session = Depends(get_db)):
    return crud_deduccion_empleado.create(db, obj_in=obj_in)

@router.get("/empleados/{deduccion_id}/{empleado_cedula}", response_model=DeduccionEmpleadoResponse)
def read_deduccion_empleado(deduccion_id: int, empleado_cedula: str, db: Session = Depends(get_db)):
    return get_deduccion_empleado_or_404(db, deduccion_id, empleado_cedula)

@router.delete("/empleados/{deduccion_id}/{empleado_cedula}", response_model=DeduccionEmpleadoResponse, dependencies=[Depends(require_permission("nominas:eliminar"))])
def remove_deduccion_empleado(deduccion_id: int, empleado_cedula: str, db: Session = Depends(get_db)):
    get_deduccion_empleado_or_404(db, deduccion_id, empleado_cedula)
    return crud_deduccion_empleado.remove(db, id=(empleado_cedula, deduccion_id))


def get_nomina_deduccion_or_404(db: Session, nomina_id: int, deduccion_id: int):
    obj = crud_nomina_deduccion.get(db, id=(nomina_id, deduccion_id))
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relación Nomina-Deducción no encontrada",
        )
    return obj

@router.post("/nominas", response_model=NominaDeduccionResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("nominas:crear"))])
def create_nomina_deduccion(obj_in: NominaDeduccionCreate, db: Session = Depends(get_db)):
    return crud_nomina_deduccion.create(db, obj_in=obj_in)

@router.get("/nominas/{nomina_id}/{deduccion_id}", response_model=NominaDeduccionResponse)
def read_nomina_deduccion(nomina_id: int, deduccion_id: int, db: Session = Depends(get_db)):
    return get_nomina_deduccion_or_404(db, nomina_id, deduccion_id)