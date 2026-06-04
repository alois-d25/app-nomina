from sqlalchemy import Column, Integer, Numeric, Text, ForeignKey, PrimaryKeyConstraint

from models.base_model import Base
from utils.mixins import AuditMixin


class LiquidacionesPrestaciones(Base, AuditMixin):
    __tablename__ = 'liquidaciones_prestaciones'
    __table_args__ = (
        PrimaryKeyConstraint('liquidacion_id', 'prestacion_id', name='pk_liquidaciones_prestaciones'),
    )

    liquidacion_id = Column(Integer, ForeignKey('liquidaciones.id', ondelete='CASCADE'), nullable=False)
    prestacion_id = Column(Integer, ForeignKey('prestaciones.id', ondelete='CASCADE'), nullable=False)
    cantidad_dias = Column(Numeric(7, 2), nullable=False)  # Days applied
    salario_integral_dia = Column(Numeric(14, 2), nullable=False)
    monto_total_bs = Column(Numeric(14, 2), nullable=False)
    monto_total_usd = Column(Numeric(14, 2), nullable=False)
    observacion = Column(Text, nullable=True)
