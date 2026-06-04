from sqlalchemy import Column, Date, Integer, String, Numeric, Boolean, Text, Enum, ForeignKey, ForeignKeyConstraint, JSON

from models.base_model import Base
from utils.mixins import AuditMixin

class Bono(Base, AuditMixin):
    __tablename__ = 'bonos'

    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100))
    monto = Column(Numeric(14, 2), nullable=False)
    es_porcentaje = Column(Boolean, nullable=False)
    descripcion = Column(Text,nullable=True)
    observacion = Column(Text, nullable=True)
    tipo_pago = Column(Enum('unico', 'quincenal', 'mensual', name='tipo_pago_enum'), nullable=False)
    fecha = Column(Date, nullable=True)

class BonoEmpleado(Base, AuditMixin):
    __tablename__ = 'bono_empleado'
    empleado_cedula = Column(String(20), primary_key=True)
    bono_id = Column(Integer, ForeignKey('bonos.id', ondelete='CASCADE'), primary_key=True)

    __table_args__ = (
        ForeignKeyConstraint(
            [ 'empleado_cedula'],
            ['empleados.cedula'],
            ondelete='CASCADE'
        ),
    )
