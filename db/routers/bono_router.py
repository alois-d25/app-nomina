from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from crud.bono_crud import crud_bono
from crud.nominas_crud import recalculate_nomina_if_pending
from schemas.bono_schema import BonoCreate, BonoResponse, BonoUpdate
from models.bono_model import BonoEmpleado
from database import get_db
from utils.auth import get_current_payload, require_permission

router = APIRouter(tags=["Bonos"], dependencies=[Depends(get_current_payload)])


@router.post("/", response_model=BonoResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("nominas:crear"))])
def create_bono(bono_data: BonoCreate, db: Session = Depends(get_db)):
    """Create a bono and recalculate any pending nominas for that period."""
    from models.bono_model import Bono

    lista_empleados = bono_data.lista_empleados

    # Create bono directly with the data, excluding lista_empleados
    bono_dict = bono_data.model_dump(exclude={"lista_empleados"})
    bono = Bono(**bono_dict)
    db.add(bono)
    db.commit()
    db.refresh(bono)

    # Create employee relationships
    if lista_empleados:
        for cedula in lista_empleados:
            bono_emp = BonoEmpleado(empleado_cedula=cedula, bono_id=bono.id)
            db.add(bono_emp)
        db.commit()

    # Recalculate pending nominas
    if bono.tipo_pago:
        recalculate_nomina_if_pending(bono.id, is_bono=True, tipo_pago=bono.tipo_pago)

    return bono


@router.get("/", response_model=List[BonoResponse])
def read_all_bonos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_bono.get_all(db, skip=skip, limit=limit)


@router.get("/{bono_id}", response_model=BonoResponse)
def read_bono(bono_id: int, db: Session = Depends(get_db)):
    bono = crud_bono.get(db, id=bono_id)
    if not bono:
        raise HTTPException(status_code=404, detail="Bono not found")
    return bono


@router.put("/{bono_id}", response_model=BonoResponse, dependencies=[Depends(require_permission("nominas:editar"))])
def update_bono(bono_id: int, bono_data: BonoUpdate, db: Session = Depends(get_db)):
    bono = crud_bono.get(db, id=bono_id)
    if not bono:
        raise HTTPException(status_code=404, detail="Bono not found")
    return crud_bono.update(db, db_obj=bono, obj_in=bono_data)


@router.delete("/{bono_id}", response_model=BonoResponse, dependencies=[Depends(require_permission("nominas:eliminar"))])
def delete_bono(bono_id: int, db: Session = Depends(get_db)):
    bono = crud_bono.get(db, id=bono_id)
    if not bono:
        raise HTTPException(status_code=404, detail="Bono not found")
    return crud_bono.remove(db, id=bono_id)
