from models.base_model import Base
from sqlalchemy import Column, Integer, String, Boolean

from utils.mixins import AuditMixin


class NivelesEscalafon(Base, AuditMixin):
    __tablename__ = 'niveles_escalafon'

    id = Column(Integer, autoincrement=True,  primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    descripcion = Column(String(255))
    # True = el nivel se paga por hora (ej: profesor x hora). Define si la jornada
    # del empleado y los descuentos por eventos se manejan en horas o en días.
    es_por_hora = Column(Boolean, nullable=False, default=False)
