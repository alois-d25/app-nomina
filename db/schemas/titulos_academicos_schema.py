from typing import Optional
from pydantic import BaseModel, ConfigDict


class TitulosAcademicosBase (BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    
class TitulosAcademicosCreate (TitulosAcademicosBase):
    pass
    
class TitulosAcademicosUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    
class TitulosAcademicosResponse(TitulosAcademicosBase):
    id: int

    model_config = ConfigDict(from_attributes=True)