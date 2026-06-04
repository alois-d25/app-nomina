from sqlalchemy import Column, Integer, column
from models.base_model import Base
from utils.mixins import AuditMixin
from sqlalchemy import String


class TitulosAcademicos(Base, AuditMixin):
    __tablename__='titulos_academicos'
    
    id= Column(Integer, autoincrement=True, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    descripcion = Column(String(255))