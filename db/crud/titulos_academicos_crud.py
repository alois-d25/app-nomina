from typing import Any
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from crud.base_crud import CRUDBase
from models.titulos_academicos_model import TitulosAcademicos
from schemas.titulos_academicos_schema import TitulosAcademicosCreate, TitulosAcademicosUpdate


class CRUDTitulosAcademicos(CRUDBase[TitulosAcademicos, TitulosAcademicosCreate, TitulosAcademicosUpdate]):
    def remove(self, db: Session, *, id: Any) -> TitulosAcademicos:
        # Un título puede estar referenciado por reglas de escalafón o empleados (FK RESTRICT).
        # Capturamos el error de integridad y devolvemos un 409 con mensaje claro.
        try:
            return super().remove(db, id=id)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail="No se puede eliminar: el título está en uso por reglas o empleados.",
            )


crud_titulos_academicos = CRUDTitulosAcademicos(TitulosAcademicos)
