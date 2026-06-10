from sqlalchemy import Column, Date, Integer, String, Numeric, Boolean, Text, Enum as SQLEnum, ForeignKey, ForeignKeyConstraint, JSON
import enum

from models.base_model import Base
from utils.mixins import AuditMixin



class FormulaCalculo(str, enum.Enum):
    """
    Defines how to calculate the deduction amount.
    manual → uses stored monto + es_porcentaje (existing behavior)
    ivss   → salario_base * 12 / 52 * 0.04 * 4
    spf    → salario_base * 12 / 52 * 0.005 * 4
    lph    → salario_base * 0.01
    faov   → salario_integral * 0.01  (integral = base + alicuotas utilidades + bono vacacional)
    prestamo → uses stored monto (pre-calculated monthly installment)
    """
    manual = "manual"
    ivss   = "ivss"
    spf    = "spf"
    lph    = "lph"
    faov   = "faov"
    prestamo = "prestamo"


class Deduccion(Base, AuditMixin):
    __tablename__ = 'deducciones'
    __table_args__ = (
    )

    id = Column(Integer, primary_key=True, autoincrement=True)

    nombre = Column(String(100), nullable=False)
    monto = Column(Numeric(14, 2), nullable=False, default=0)
    es_porcentaje = Column(Boolean, nullable=False, default=False)
    formula_calculo = Column(SQLEnum(FormulaCalculo), nullable=False, default=FormulaCalculo.manual)
    descripcion = Column(Text, nullable=True)
    observacion = Column(Text, nullable=True)
    tipo_pago = Column(SQLEnum('unico', 'quincenal', 'mensual', name='tipo_pago_enum'), nullable=False)
    fecha = Column(Date, nullable=True)
    fecha_fin = Column(Date, nullable=True)

class DeduccionEmpleado(Base, AuditMixin):
    __tablename__ = 'deduccion_empleado'
    empleado_cedula = Column(String(20), primary_key=True)
    deduccion_id = Column(Integer, ForeignKey('deducciones.id', ondelete='CASCADE'), primary_key=True)

    __table_args__ = (
        ForeignKeyConstraint(
            ['empleado_cedula'],
            ['empleados.cedula'],
            ondelete='CASCADE'
        ),
    )
