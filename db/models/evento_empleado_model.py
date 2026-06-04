import enum
from sqlalchemy import Column, Integer, String, Date, Enum, Text, ForeignKey
from models.base_model import Base
from utils.mixins import AuditMixin


class TipoEvento(str, enum.Enum):
    inasistencia = "inasistencia"
    horas_no_laboradas = "horas no laboradas"
    reposo = "reposo"


class EventoEmpleado(Base, AuditMixin):
    __tablename__ = 'eventos_empleados'

    id = Column(Integer, autoincrement=True, primary_key=True, index=True)

    # Fecha simple: la usan 'inasistencia' y 'horas no laboradas'
    fecha = Column(Date, nullable=True)

    # Rango: lo usa 'reposo'
    fecha_inicio = Column(Date, nullable=True)
    fecha_fin = Column(Date, nullable=True)

    # values_callable hace que el ENUM en la BD guarde los valores legibles
    # (ej: 'horas no laboradas') en lugar de los nombres de los miembros.
    tipo_evento = Column(
        Enum(TipoEvento, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False
    )

    empleado_cedula = Column(
        String(20),
        ForeignKey('empleados.cedula', ondelete='CASCADE', onupdate='CASCADE'),
        nullable=False
    )

    # Días u horas no laboradas (entero)
    cantidad = Column(Integer, nullable=True)
    observacion = Column(Text, nullable=True)
