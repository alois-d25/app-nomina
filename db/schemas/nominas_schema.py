from datetime import date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict

class NominasBase(BaseModel):
    fecha_pago: date
    tasa_dolar: Decimal | None = None
    aprobada: bool = False

class NominasCreate(NominasBase):
    pass

class NominasUpdate(BaseModel):
    fecha_pago: date | None = None
    tasa_dolar: Decimal | None = None
    aprobada: bool | None = None

class NominasResponse(NominasBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
