from sqlalchemy.orm import Session
from crud.base_crud import CRUDBase
from models.reglas_escalafon_model import ReglasEscalafon
from models.niveles_escalafon_model import NivelesEscalafon
from models.titulos_academicos_model import TitulosAcademicos
from schemas.reglas_escalafon_schema import ReglasEscalafonCreate, ReglasEscalafonUpdate

class CRUDReglasEscalafon(CRUDBase[ReglasEscalafon, ReglasEscalafonCreate, ReglasEscalafonUpdate]):
    def get_reglas_con_detalles(self, db: Session, skip: int = 0, limit: int = 100):
        resultados = db.query(
            self.model.id,
            self.model.anios_min,
            self.model.anios_max,
            self.model.salario_base,
            self.model.activa,
            self.model.nivel_escalafon_id,
            self.model.titulo_academico_id,
            NivelesEscalafon.nombre.label("nivel_escalafon_nombre"),
            TitulosAcademicos.nombre.label("titulo_academico_nombre")
        ).join(
            NivelesEscalafon, self.model.nivel_escalafon_id == NivelesEscalafon.id
        ).join(
            TitulosAcademicos, self.model.titulo_academico_id == TitulosAcademicos.id
        ).offset(skip).limit(limit).all()
        
        return [
            {
                "id": r.id,
                "anios_min": r.anios_min,
                "anios_max": r.anios_max,
                "salario_base": r.salario_base,
                "activa": r.activa,
                "nivel_escalafon_id": r.nivel_escalafon_id,
                "titulo_academico_id": r.titulo_academico_id,
                "nivel_escalafon_nombre": r.nivel_escalafon_nombre,
                "titulo_academico_nombre": r.titulo_academico_nombre
            }
            for r in resultados
        ]

crud_reglas_escalafon = CRUDReglasEscalafon(ReglasEscalafon)