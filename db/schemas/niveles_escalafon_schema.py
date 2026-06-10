from typing import Optional
from pydantic import BaseModel, ConfigDict


class NivelesEscalafonBase (BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class NivelesEscalafonCreate (NivelesEscalafonBase):
    pass

class NivelesEscalafonUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None

class NivelesEscalafonResponse(NivelesEscalafonBase):
    id: int

    model_config = ConfigDict(from_attributes=True)