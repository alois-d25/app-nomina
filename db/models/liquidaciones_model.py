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
    anios_totales = Column(Numeric(5, 2), nullable=False)
    tasa_dolar = Column(Numeric(14, 2), nullable=False)
    estado = Column(Enum(EstadoLiquidacion), nullable=False, default=EstadoLiquidacion.borrador)
    causa_egreso = Column(Enum(CausaEgreso), nullable=False)
    observacion = Column(Text, nullable=True)

    # Datos base del cálculo
    salario_integral_dia = Column(Numeric(14, 2), nullable=True)
    escenario_aplicado = Column(String(1), nullable=True)   # "A" o "B"

    # Prestaciones sociales (Art. 142 LOTTT)
    escenario_a_bs = Column(Numeric(14, 2), nullable=True)
    escenario_b_bs = Column(Numeric(14, 2), nullable=True)
    prestaciones_bs = Column(Numeric(14, 2), nullable=True)  # MAX(A, B)

    # Conceptos fraccionados
    vacaciones_fracc_bs = Column(Numeric(14, 2), nullable=True)
    bono_vac_fracc_bs = Column(Numeric(14, 2), nullable=True)
    utilidades_fracc_bs = Column(Numeric(14, 2), nullable=True)
    salarios_pendientes_bs = Column(Numeric(14, 2), nullable=True)
    intereses_bs = Column(Numeric(14, 2), nullable=True)

    # Deducciones
    saldo_deudor_bs = Column(Numeric(14, 2), nullable=True, default=0)

    # Totales finales
    monto_total_bs = Column(Numeric(14, 2), nullable=False, default=0)   # bruto
    monto_total_usd = Column(Numeric(14, 2), nullable=False, default=0)
    monto_neto_bs = Column(Numeric(14, 2), nullable=True)                # neto a pagar
    monto_neto_usd = Column(Numeric(14, 2), nullable=True)
