import enum
from sqlalchemy import Column, Date, Integer, String, Numeric, Enum, ForeignKey
from utils.mixins import AuditMixin
from models.base_model import Base


class EstadoLiquidacion(enum.Enum):
    Borrador = "Borrador"
    Pendiente = "Pendiente"
    Aprobada = "Aprobada"
    Completada = "Completada"


class CausaEgreso(enum.Enum):
    Renuncia = "Renuncia"
    Despido = "Despido"
    FinContrato = "Fin de Contrato"


class Liquidacion(Base, AuditMixin):
    __tablename__ = 'liquidaciones'

    id = Column(Integer, primary_key=True, autoincrement=True)
    empleado_cedula = Column(
        String(20),
        ForeignKey('empleados.cedula', ondelete='CASCADE', onupdate='CASCADE'),
        nullable=False,
        index=True
    )
    fecha_egreso = Column(Date, nullable=False)
    anios_totales = Column(Integer, nullable=False)
    monto_total_bs = Column(Numeric(14, 2), nullable=False)
    monto_total_usd = Column(Numeric(14, 2), nullable=False)
    estado = Column(Enum(EstadoLiquidacion), nullable=False, default=EstadoLiquidacion.Borrador)
    causa_egreso = Column(Enum(CausaEgreso), nullable=False)
