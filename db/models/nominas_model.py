from sqlalchemy import Column, Date, Integer, Numeric, Boolean

from models.base_model import Base
from utils.mixins import AuditMixin

class Nominas(Base, AuditMixin):
    __tablename__ = 'nominas'

    id = Column(Integer, autoincrement=True, primary_key=True, index=True)
    fecha_pago = Column(Date, nullable=False)
    tasa_dolar = Column(Numeric(14, 2))
    aprobada = Column(Boolean, nullable=False, default=False)