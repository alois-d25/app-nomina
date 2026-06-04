from pydantic import BaseModel, ConfigDict, Field
from datetime import date
from decimal import Decimal
from models.tasa_dolar_model import TipoTasa, FuenteTasa

class TasaDolarBase(BaseModel):
    tipo: TipoTasa
    valor: Decimal = Field(..., max_digits=14, decimal_places=2)
    fecha: date
    fuente: FuenteTasa
    usuario_id: int | None = None

class TasaDolarCreate(TasaDolarBase):
    pass

class TasaDolarUpdate(BaseModel):
    tipo: TipoTasa | None = None
    valor: Decimal | None = Field(None, max_digits=14, decimal_places=2)
    fecha: date | None = None
    fuente: FuenteTasa | None = None
    usuario_id: int | None = None

class TasaDolarResponse(TasaDolarBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
    
class TasaDolarHistorialResponse(BaseModel):
    id: int
    tipo: TipoTasa
    valor: Decimal = Field(max_digits=14, decimal_places=2)
    fecha: date
    fuente: FuenteTasa
    usuario_id: int | None = None
    # Nuevos campos que traeremos del JOIN
    empleado_nombre: str | None = None
    empleado_apellido: str | None = None

    model_config = ConfigDict(from_attributes=True)