from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, List, Type, Dict
from database import get_db
from utils.auth import require_permission, get_current_payload


def create_crud_router(
    schema_create: Type,
    schema_update: Type,
    schema_response: Type,
    crud_service: Any,
    id_name: str = "id",  # <--- Aquí definimos si buscamos por 'id' o 'cedula'
    tags: List[str] = None,
    permissions: Dict[str, str] = None,  # claves: read, create, update, delete
):
    router = APIRouter(tags=tags)
    permissions = permissions or {}

    # Construye la lista de dependencias de autorización para una acción.
    # - Si hay permiso definido, exige ese permiso (que ya valida la sesión).
    # - Si no, al menos exige estar autenticado.
    def deps(accion: str):
        perm = permissions.get(accion)
        if perm:
            return [Depends(require_permission(perm))]
        return [Depends(get_current_payload)]

    # Helper para buscar y validar existencia
    def get_object_or_404(db: Session, key_value: Any):
        obj = crud_service.get(db, id=key_value)
        if not obj:
            raise HTTPException(
                status_code=404,
                detail=f"Recurso con {id_name} {key_value} no encontrado"
            )
        return obj

    @router.post("/", response_model=schema_response, status_code=status.HTTP_201_CREATED, dependencies=deps("create"))
    def create(obj_in: schema_create, db: Session = Depends(get_db)):
        return crud_service.create(db, obj_in=obj_in)

    @router.get("/", response_model=List[schema_response], dependencies=deps("read"))
    def read_all(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
        return crud_service.get_all(db, skip=skip, limit=limit)

    # El path usa {key_name} dinámico
    @router.get("/{item_id}", response_model=schema_response, dependencies=deps("read"))
    def read_one(item_id: str, db: Session = Depends(get_db)):
        return get_object_or_404(db, item_id)

    @router.put("/{item_id}", response_model=schema_response, dependencies=deps("update"))
    def update(item_id: str, obj_in: schema_update, db: Session = Depends(get_db)):
        db_obj = get_object_or_404(db, item_id)
        return crud_service.update(db, db_obj=db_obj, obj_in=obj_in)

    @router.delete("/{item_id}", response_model=schema_response, dependencies=deps("delete"))
    def remove(item_id: str, db: Session = Depends(get_db)):
        get_object_or_404(db, item_id)
        return crud_service.remove(db, id=item_id)

    return router
