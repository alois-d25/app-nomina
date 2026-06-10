from models.base_model import Base
from sqlalchemy import Column, Integer, String

from utils.mixins import AuditMixin


class NivelesEscalafon(Base, AuditMixin):
    __tablename__ = 'niveles_escalafon'

    id = Column(Integer, autoincrement=True,  primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    descripcion = Column(String(255))
