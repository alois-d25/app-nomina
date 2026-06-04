from pydantic import BaseModel, ConfigDict

class PermisoResponse(BaseModel):
    id: int
    nombre: str
    
    model_config = ConfigDict(from_attributes=True)

class RolResponse(BaseModel):
    id: int
    nombre: str
    descripcion: str | None = None
    
    model_config = ConfigDict(from_attributes=True)