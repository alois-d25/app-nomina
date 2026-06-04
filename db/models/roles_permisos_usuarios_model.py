from sqlalchemy.orm import relationship
from models.base_model import Base
from utils.mixins import AuditMixin
from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy import Column

class Rol(Base, AuditMixin):
    __tablename__ = 'roles'

    id = Column(Integer, autoincrement=True,  primary_key=True, index=True)
    nombre = Column(String(50), nullable=False, unique=True)
    descripcion = Column(String(50))
    
    rol_permisos = relationship("RolPermiso", back_populates="rol", cascade="all, delete-orphan")

class Permiso(Base, AuditMixin):
    __tablename__ = 'permisos'

    id = Column(Integer, autoincrement=True,  primary_key=True, index=True)
    nombre = Column(String(50), nullable=False, unique=True)
    
    permiso_roles = relationship("RolPermiso", back_populates="permiso", cascade="all, delete-orphan")

class RolPermiso(Base, AuditMixin):
    __tablename__ = "rol_x_permiso"
    
    id = Column(Integer, autoincrement=True, primary_key=True, index=True)
    rol_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    permiso_id = Column(Integer, ForeignKey("permisos.id", ondelete="CASCADE"), nullable=False)
    
    # relaciones
    rol = relationship("Rol", back_populates="rol_permisos")
    permiso = relationship("Permiso", back_populates="permiso_roles")