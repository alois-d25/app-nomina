from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class ReglasEscalafonBase(BaseModel):
    anios_min: int
    anios_max: int
    salario_base: Decimal = Field(..., max_digits=14, decimal_places=2)
    activa: bool = True
    nivel_escalafon_id: int
    titulo_academico_id: int
    
    @model_validator(mode='after')
    def validar_rango_anios(self):
        if self.anios_max <= self.anios_min:
            raise ValueError('Los años máximos deben ser estrictamente mayores a los años mínimos.')
        return self
    
class ReglasEscalafonCreate(ReglasEscalafonBase):
    pass
    
class ReglasEscalafonUpdate(BaseModel):
    anios_min: int | None = None
    anios_max: int | None = None
    salario_base: Decimal | None = Field(..., max_digits=14, decimal_places=2)
    activa: bool | None = None
    nivel_escalafon_id: int | None = None
    titulo_academico_id: int | None = None
    
class ReglasEscalafonResponse(ReglasEscalafonBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
    
class ReglasEscalafonDetalleResponse(ReglasEscalafonResponse):
    nivel_escalafon_nombre: str
    titulo_academico_nombre: str

    model_config = ConfigDict(from_attributes=True)