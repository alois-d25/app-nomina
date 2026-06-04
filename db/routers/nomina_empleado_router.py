from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from crud.nomina_empleado_crud import crud_nomina_empleado
from schemas.nomina_empleado_schema import (
    NominaEmpleadoCreate,
    NominaEmpleadoResponse,
    NominaEmpleadoUpdate,
)
from utils.auth import get_current_payload, require_permission

router = APIRouter(tags=["Nomina Empleados"], dependencies=[Depends(get_current_payload)])


def get_object_or_404(db: Session, nomina_id: int, empleado_cedula: str):
    obj = crud_nomina_empleado.get(db, id=(nomina_id, empleado_cedula))
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recurso con nomina_id {nomina_id} y empleado_cedula {empleado_cedula} no encontrado",
        )
    return obj


@router.post("/", response_model=NominaEmpleadoResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("nominas:crear"))])
def create(obj_in: NominaEmpleadoCreate, db: Session = Depends(get_db)):
    return crud_nomina_empleado.create(db, obj_in=obj_in)


@router.get("/", response_model=list[NominaEmpleadoResponse])
def read_all(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_nomina_empleado.get_all(db, skip=skip, limit=limit)


@router.get("/{nomina_id}/{empleado_cedula}", response_model=NominaEmpleadoResponse)
def read_one(nomina_id: int, empleado_cedula: str, db: Session = Depends(get_db)):
    return get_object_or_404(db, nomina_id, empleado_cedula)


@router.put("/{nomina_id}/{empleado_cedula}", response_model=NominaEmpleadoResponse, dependencies=[Depends(require_permission("nominas:editar"))])
def update(
    nomina_id: int,
    empleado_cedula: str,
    obj_in: NominaEmpleadoUpdate,
    db: Session = Depends(get_db),
):
    db_obj = get_object_or_404(db, nomina_id, empleado_cedula)
    return crud_nomina_empleado.update(db, db_obj=db_obj, obj_in=obj_in)


@router.delete("/{nomina_id}/{empleado_cedula}", response_model=NominaEmpleadoResponse, dependencies=[Depends(require_permission("nominas:eliminar"))])
def remove(nomina_id: int, empleado_cedula: str, db: Session = Depends(get_db)):
    get_object_or_404(db, nomina_id, empleado_cedula)
    return crud_nomina_empleado.remove(db, id=(nomina_id, empleado_cedula))
