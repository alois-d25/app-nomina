import enum
from sqlalchemy import Column, String, Integer, Boolean, Enum, Date, Numeric, ForeignKey
from utils.mixins import AuditMixin
from models.base_model import Base
    
class EstadoEmpleado(enum.Enum):
    activo = "activo"
    inactivo = "inactivo"
    permiso = "permiso"

class Empleado(Base, AuditMixin):
    __tablename__ = 'empleados'

    cedula = Column(String(20), primary_key=True, index=True)
    email = Column(String(150), nullable=False)
    nombre = Column(String(150), nullable=False)
    apellido = Column(String(150), nullable=False)
    anios_experiencia = Column(Integer, nullable=False)
    
    estado = Column(Enum(EstadoEmpleado), nullable=False)

    nivel_escalafon_id = Column(
        Integer, 
        ForeignKey('niveles_escalafon.id', ondelete='RESTRICT', onupdate='CASCADE'), 
        nullable=False
    )
    
    titulo_academico_id = Column(
        Integer, 
        ForeignKey('titulos_academicos.id', ondelete='RESTRICT', onupdate='CASCADE'), 
        nullable=False
    )

    # Sequelize.DATEONLY
    fecha_ingreso = Column(Date, nullable=False)

    # Sequelize.DECIMAL(14,2)
    salario_base = Column(Numeric(14, 2), nullable=False)

    telefono = Column(String(20), nullable=True)
    numero_cuenta = Column(String(50), nullable=True)

    # Tipo de jornada del empleado (ya no depende del nivel de escalafón):
    # - True  -> se paga por hora; usa horas_trabajadas_semana
    # - False -> se paga por día (Lun-Vie); usa dias_trabajados_semana
    es_por_hora = Column(Boolean, nullable=False, default=False)

    # Jornada según el tipo de empleado:
    # - por día  -> dias_trabajados_semana
    # - por hora -> horas_trabajadas_semana
    dias_trabajados_semana = Column(Integer, nullable=True)
    horas_trabajadas_semana = Column(Integer, nullable=True)