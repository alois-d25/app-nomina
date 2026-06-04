import enum
from sqlalchemy import Column, Integer, String, Numeric, Enum, Text

from models.base_model import Base
from utils.mixins import AuditMixin


class TipoPrestacion(enum.Enum):
    garantia = "garantia"
    antiguedad = "antiguedad"
    vacaciones = "vacaciones"
    liquidacion = "liquidacion"


class Prestaciones(Base, AuditMixin):
    __tablename__ = 'prestaciones'

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    nombre = Column(String(150), nullable=False)  # e.g., "Prestación de Garantía"
    descripcion = Column(Text, nullable=True)
    tipo = Column(Enum(TipoPrestacion), nullable=False)
    dias_base = Column(Integer, nullable=False)  # 15 for garantía, 15 for vacaciones
    incremento_por_anio = Column(Numeric(5, 2), nullable=True)  # 2 for antiguedad, 1 for vacaciones
    max_dias = Column(Integer, nullable=True)  # 40 for vacaciones; null = unlimited
    frecuencia = Column(String(50), nullable=True)  # "trimestral", "anual", "al_egreso"
