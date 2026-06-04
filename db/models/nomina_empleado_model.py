from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, PrimaryKeyConstraint

from models.base_model import Base
from utils.mixins import AuditMixin

class NominaEmpleado(Base, AuditMixin):
    __tablename__ = 'nomina_empleados'
    __table_args__ = (
        PrimaryKeyConstraint('nomina_id', 'empleado_cedula', name='pk_nomina_empleado'),
    )

    nomina_id = Column(Integer, ForeignKey('nominas.id', ondelete='CASCADE'), nullable=False)
    empleado_cedula = Column(String(20), ForeignKey('empleados.cedula', ondelete='CASCADE'), nullable=False)

    salario_base = Column(Numeric(14, 2))
    total_ingresos = Column(Numeric(14, 2))
    total_deducciones = Column(Numeric(14, 2))
    cestaticket_aplicado = Column(Numeric(14, 2), nullable=True, default=0)
    salario_final_bs = Column(Numeric(14, 2))
    salario_final_usd = Column(Numeric(14, 2))


class NominaEmpleadoBono(Base, AuditMixin):
    __tablename__ = 'nomina_empleado_bonos'
    __table_args__ = (
        PrimaryKeyConstraint('nomina_id', 'empleado_cedula', 'bono_id', name='pk_nomina_empleado_bono'),
    )

    nomina_id = Column(Integer, ForeignKey('nominas.id', ondelete='CASCADE'), nullable=False)
    empleado_cedula = Column(String(20), ForeignKey('empleados.cedula', ondelete='CASCADE'), nullable=False)
    bono_id = Column(Integer, ForeignKey('bonos.id', ondelete='CASCADE'), nullable=False)
    monto_aplicado = Column(Numeric(14, 2), nullable=False)


class NominaEmpleadoDeduccion(Base, AuditMixin):
    __tablename__ = 'nomina_empleado_deducciones'
    __table_args__ = (
        PrimaryKeyConstraint('nomina_id', 'empleado_cedula', 'deduccion_id', name='pk_nomina_empleado_deduccion'),
    )

    nomina_id = Column(Integer, ForeignKey('nominas.id', ondelete='CASCADE'), nullable=False)
    empleado_cedula = Column(String(20), ForeignKey('empleados.cedula', ondelete='CASCADE'), nullable=False)
    deduccion_id = Column(Integer, ForeignKey('deducciones.id', ondelete='CASCADE'), nullable=False)
    monto_aplicado = Column(Numeric(14, 2), nullable=False)
