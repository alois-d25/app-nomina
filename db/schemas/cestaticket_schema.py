from pydantic import BaseModel
from typing import Optional


class CestaticketBase(BaseModel):
    empleado_cedula: str
    monto: float


class CestaticketCreate(CestaticketBase):
    pass


class CestaticketUpdate(BaseModel):
    monto: Optional[float] = None


class CestaticketResponse(CestaticketBase):
    id: int

    class Config:
        from_attributes = True
