import enum
from sqlalchemy import Column, Integer, Date, Numeric, Enum, ForeignKey
from models.base_model import Base
from utils.mixins import AuditMixin

class TipoTasa(enum.Enum):
    BCV = "BCV"
    PARALELO = "PARALELO"
    PERSONALIZADO = "PERSONALIZADO"

class FuenteTasa(enum.Enum):
    api = "api"
    usuario = "usuario"

class TasaDolar(Base, AuditMixin):
    __tablename__ = 'tasa_dolar'

    id = Column(Integer, autoincrement=True, primary_key=True, index=True)
    tipo = Column(Enum(TipoTasa), nullable=False)
    valor = Column(Numeric(14, 2), nullable=False)
    fecha = Column(Date, nullable=False)
    fuente = Column(Enum(FuenteTasa), nullable=False)
    
    usuario_id = Column(
        Integer,
        ForeignKey('usuarios.id', ondelete='SET NULL', onupdate='CASCADE'),
        nullable=True
    )