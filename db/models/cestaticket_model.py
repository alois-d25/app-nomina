from sqlalchemy import Column, Integer, String, Numeric, Text, Date, ForeignKey

from models.base_model import Base
from utils.mixins import AuditMixin


class Cestaticket(Base, AuditMixin):
    __tablename__ = 'cestaticket'

    id = Column(Integer, primary_key=True, autoincrement=True)
    empleado_cedula = Column(String(20), ForeignKey('empleados.cedula', ondelete='CASCADE'), nullable=False)
    monto = Column(Numeric(14, 2), nullable=False)


class CestaticketMes(Base, AuditMixin):
    __tablename__ = 'cestaticket_mes'

    id = Column(Integer, primary_key=True, autoincrement=True)
    cestaticket_id = Column(Integer, ForeignKey('cestaticket.id', ondelete='CASCADE'), nullable=False)
    fecha = Column(Date, nullable=False)
    observacion = Column(Text, nullable=True)
    monto_final = Column(Numeric(14,2))
