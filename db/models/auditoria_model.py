import enum
from sqlalchemy import Column, Integer, String, Text, Enum, DateTime, ForeignKey
from sqlalchemy.sql import func
from models.base_model import Base

class AccionAuditoria(enum.Enum):
    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"

class Auditoria(Base):
    __tablename__ = 'auditorias'

    id = Column(Integer, autoincrement=True, primary_key=True, index=True)
    
    usuario_id = Column(
        Integer, 
        ForeignKey('usuarios.id', ondelete='SET NULL'), 
        nullable=True
    )
    
    tabla_afectada = Column(String(100), nullable=False)
    registro_id = Column(String(100), nullable=False)
    accion = Column(Enum(AccionAuditoria), nullable=False)
    
    valor_anterior = Column(Text, nullable=True)
    valor_nuevo = Column(Text, nullable=True)
    
    fecha = Column(DateTime, server_default=func.now(), nullable=False)
    ip_usuario = Column(String(45), nullable=True)
    observacion = Column(Text, nullable=True)