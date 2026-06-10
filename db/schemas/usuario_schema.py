from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from datetime import datetime

class UsuarioBase(BaseModel):
    email: EmailStr
    password: str
    empleado_cedula: str
    activo: bool = True
    rol_id: int

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("La contraseña debe tener al menos 6 caracteres")
        return v
    
class UsuarioCreate(UsuarioBase):
    pass
    
class UsuarioUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = None
    empleado_cedula: str | None = None
    activo: bool | None = None
    rol_id: int | None = None
    
class UsuarioResponse(BaseModel):
    id: int
    email: EmailStr
    empleado_cedula: str
    activo: bool
    rol_id: int

    model_config = ConfigDict(from_attributes=True)
    
class UsuarioDetalleResponse(BaseModel):
    id: int
    email: EmailStr
    activo: bool
    created_at: datetime | None = None
    empleado_nombre: str
    empleado_apellido: str
    empleado_cedula: str
    rol_id: int
    rol_nombre: str

    model_config = ConfigDict(from_attributes=True)