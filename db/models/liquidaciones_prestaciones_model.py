from sqlalchemy import Column, Integer, String, Numeric, Text, ForeignKey

from models.base_model import Base
from utils.mixins import AuditMixin


class LiquidacionesPrestaciones(Base, AuditMixin):
    __tablename__ = 'liquidaciones_prestaciones'

    id = Column(Integer, primary_key=True, autoincrement=True)
    liquidacion_id = Column(Integer, ForeignKey('liquidaciones.id', ondelete='CASCADE'), nullable=False, index=True)
    prestacion_id = Column(Integer, nullable=True)   # referencia opcional, sin FK para evitar dependencia de carga
    concepto = Column(String(50), nullable=True)
    # Valores: prestaciones_sociales, vacaciones_fraccionadas, bono_vac_fraccionado,
    #          utilidades_fraccionadas, salarios_pendientes, intereses, saldo_deudor
    cantidad_dias = Column(Numeric(7, 2), nullable=True)
    salario_integral_dia = Column(Numeric(14, 2), nullable=True)
    monto_total_bs = Column(Numeric(14, 2), nullable=False)
    monto_total_usd = Column(Numeric(14, 2), nullable=False)
    es_deduccion = Column(Integer, nullable=False, default=0)  # 0=ingreso, 1=deducción
    observacion = Column(Text, nullable=True)
