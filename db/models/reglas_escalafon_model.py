from decimal import Decimal
from models.base_model import Base
from utils.mixins import AuditMixin
from sqlalchemy import Boolean, Column, ForeignKey, Integer, Numeric


class ReglasEscalafon(Base, AuditMixin):
    __tablename__ = 'reglas_escalafon'
    
    id = Column(Integer, autoincrement=True,  primary_key=True, index=True)
    anios_min = Column(Integer)
    anios_max = Column(Integer)
    salario_base = Column(Numeric(14, 2), nullable=False)
    activa = Column(Boolean, nullable=False, default=True)
    nivel_escalafon_id = Column(
        Integer, 
        ForeignKey('niveles_escalafon.id', ondelete='RESTRICT', onupdate='CASCADE'), 
        nullable=False
    )
    titulo_academico_id = Column(
        Integer, 
        ForeignKey('titulos_academicos.id', ondelete='RESTRICT', onupdate='CASCADE'), 
        nullable=False
    )