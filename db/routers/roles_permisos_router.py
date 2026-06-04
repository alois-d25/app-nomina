from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db

from crud import roles_permisos_crud
from schemas.roles_permisos_schema import PermisoResponse, RolResponse
from utils.auth import get_current_payload

# Datos de referencia (lista de roles/permisos) — requieren sesión iniciada
router = APIRouter(tags=["Roles y Permisos"], dependencies=[Depends(get_current_payload)])

@router.get("/", response_model=List[RolResponse])
def listar_roles(db: Session = Depends(get_db)):
    return roles_permisos_crud.get_all_roles(db)

@router.get("/roles/{rol_id}", response_model=RolResponse)
def obtener_rol(rol_id: int, db: Session = Depends(get_db)):
    rol = roles_permisos_crud.get_rol_by_id(db, rol_id=rol_id)
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return rol

@router.get("/permisos", response_model=List[PermisoResponse])
def listar_permisos(db: Session = Depends(get_db)):
    return roles_permisos_crud.get_all_permisos(db)