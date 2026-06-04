from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from models.base_model import Base 
from utils.mixins import AuditMixin


class Usuario(Base, AuditMixin):
    __tablename__ = 'usuarios'
    
    id = Column(Integer, autoincrement=True, primary_key=True, index=True)
    email = Column(String(150), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    empleado_cedula = Column(
        String(20),
        ForeignKey('empleados.cedula',ondelete='RESTRICT', onupdate='CASCADE'), 
        nullable=False,
        unique=True
    )
    activo = Column(Boolean, default=True, nullable= False)
    rol_id = Column(
        Integer, 
        ForeignKey('roles.id', ondelete='RESTRICT', onupdate='CASCADE'), 
        nullable=False
    )