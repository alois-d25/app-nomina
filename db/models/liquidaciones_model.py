import enum
from sqlalchemy import Column, Integer, String, Numeric, Enum, Text, Date, ForeignKey

from models.base_model import Base
from utils.mixins import AuditMixin


class EstadoLiquidacion(enum.Enum):
    borrador = "Borrador"
    pendiente = "Pendiente"
    aprobada = "Aprobada"
    completada = "Completada"


class CausaEgreso(enum.Enum):
    renuncia = "Renuncia"
    despido = "Despido"
    fin_contrato = "Fin de Contrato"
    jubilacion = "Jubilacion"


class Liquidaciones(Base, AuditMixin):
    __tablename__ = 'liquidaciones'

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    empleado_cedula = Column(String(20), ForeignKey('empleados.cedula', ondelete='CASCADE'), nullable=False, index=True)
    fecha_egreso = Column(Date, nullable=False)
    anios_totales = Column(Numeric(5, 2), nullable=False)  # Years of service
    monto_total_bs = Column(Numeric(14, 2), nullable=False)
    monto_total_usd = Column(Numeric(14, 2), nullable=False)
    tasa_dolar = Column(Numeric(14, 2), nullable=False)  # Rate used for conversion
    estado = Column(Enum(EstadoLiquidacion), nullable=False, default=EstadoLiquidacion.borrador)
    causa_egreso = Column(Enum(CausaEgreso), nullable=False)
    observacion = Column(Text, nullable=True)
