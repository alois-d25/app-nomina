from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from crud.bono_crud import crud_bono_empleado
from schemas.bono_schema import (
    BonoEmpleadoCreate,
    BonoEmpleadoResponse,
    BonoEmpleadoDetalleResponse,
)
from utils.auth import get_current_payload, require_permission

router = APIRouter(tags=["Bonos Relaciones"], dependencies=[Depends(get_current_payload)])

# --- Endpoints para BonoEmpleado ---

def get_bono_empleado_or_404(db: Session, bono_id: int, empleado_cedula: str):
    obj = crud_bono_empleado.get(db, id=(empleado_cedula, bono_id))
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relación Bono-Empleado no encontrada",
        )
    return obj

@router.get("/empleados", response_model=List[BonoEmpleadoDetalleResponse])
def read_all_bonos_empleados(db: Session = Depends(get_db)):
    from models.bono_model import Bono, BonoEmpleado
    from models.empleado_model import Empleado

    resultados = db.query(
        BonoEmpleado.empleado_cedula,
        Empleado.nombre,
        Empleado.apellido,
        Bono.id.label("bono_id"),
        Bono.nombre.label("bono_nombre"),
        Bono.monto,
        Bono.tipo_pago,
        Bono.descripcion,
        Bono.es_porcentaje,
    ).join(Bono, BonoEmpleado.bono_id == Bono.id
    ).join(Empleado, BonoEmpleado.empleado_cedula == Empleado.cedula
    ).all()

    return [
        {
            "empleado_cedula": r.empleado_cedula,
            "empleado_nombre": f"{r.nombre} {r.apellido}",
            "bono_id": r.bono_id,
            "bono_nombre": r.bono_nombre,
            "monto": r.monto,
            "tipo_pago": r.tipo_pago,
            "descripcion": r.descripcion,
            "es_porcentaje": r.es_porcentaje,
        }
        for r in resultados
    ]

@router.post("/empleados", response_model=BonoEmpleadoResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("nominas:crear"))])
def create_bono_empleado(obj_in: BonoEmpleadoCreate, db: Session = Depends(get_db)):
    return crud_bono_empleado.create(db, obj_in=obj_in)

@router.get("/empleados/{bono_id}/{empleado_cedula}", response_model=BonoEmpleadoResponse)
def read_bono_empleado(bono_id: int, empleado_cedula: str, db: Session = Depends(get_db)):
    return get_bono_empleado_or_404(db, bono_id, empleado_cedula)

@router.delete("/empleados/{bono_id}/{empleado_cedula}", response_model=BonoEmpleadoResponse, dependencies=[Depends(require_permission("nominas:eliminar"))])
def remove_bono_empleado(bono_id: int, empleado_cedula: str, db: Session = Depends(get_db)):
    get_bono_empleado_or_404(db, bono_id, empleado_cedula)
    return crud_bono_empleado.remove(db, id=(empleado_cedula, bono_id))


def get_nomina_bono_or_404(db: Session, nomina_id: int, bono_id: int):
    obj = crud_nomina_bono.get(db, id=(nomina_id, bono_id))
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relación Nomina-Bono no encontrada",
        )
    return obj

