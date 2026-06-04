from pydantic import BaseModel, EmailStr, ConfigDict, Field
from datetime import date
from decimal import Decimal
# Importamos el Enum que creaste en tu modelo para validar las opciones estrictas
from models.empleado_model import EstadoEmpleado 

class EmpleadoBase(BaseModel):
    email: EmailStr
    nombre: str
    apellido: str
    anios_experiencia: int = Field(..., ge=0)
    estado: EstadoEmpleado
    nivel_escalafon_id: int
    titulo_academico_id: int
    fecha_ingreso: date
    salario_base: Decimal = Field(..., max_digits=14, decimal_places=2)
    telefono: str | None = None
    numero_cuenta: str | None = None
    dias_trabajados_semana: int | None = None
    horas_trabajadas_semana: int | None = None

class EmpleadoCreate(EmpleadoBase):
    cedula: str

class EmpleadoUpdate(BaseModel):
    # todos los campos son opcionales en el PUT/PATCH por si solo editas un dato
    email: EmailStr | None = None
    nombre: str | None = None
    apellido: str | None = None
    anios_experiencia: int | None = Field(None, ge=0)
    estado: EstadoEmpleado
    fecha_ingreso: date | None = None
    nivel_escalafon_id: int | None = None
    titulo_academico_id: int | None = None
    salario_base: Decimal | None = Field(None, max_digits=14, decimal_places=2)
    telefono: str | None = None
    numero_cuenta: str | None = None
    dias_trabajados_semana: int | None = None
    horas_trabajadas_semana: int | None = None

class EmpleadoResponse(EmpleadoBase):
    cedula: str
    
    # Permite que Pydantic lea la clase SQLAlchemy Empleado
    model_config = ConfigDict(from_attributes=True)
    
class EmpleadoSinUsuarioResponse(BaseModel):
    cedula: str
    nombre: str
    apellido: str
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)