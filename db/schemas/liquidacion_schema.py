from pydantic import BaseModel, ConfigDict
from datetime import date
from decimal import Decimal
from typing import Optional


class LiquidacionBase(BaseModel):
    empleado_cedula: str
    fecha_egreso: date
    causa_egreso: str


class LiquidacionCreate(LiquidacionBase):
    anios_totales: int
    monto_total_bs: Decimal
    monto_total_usd: Decimal


class LiquidacionUpdate(BaseModel):
    estado: Optional[str] = None
    monto_total_bs: Optional[Decimal] = None
    monto_total_usd: Optional[Decimal] = None


class LiquidacionResponse(LiquidacionBase):
    id: int
    anios_totales: int
    monto_total_bs: Decimal
    monto_total_usd: Decimal
    estado: str
    model_config = ConfigDict(from_attributes=True)


class LiquidacionDraftResponse(BaseModel):
    empleado_cedula: str
    fecha_egreso: date
    anios_totales: int
    monto_total_bs: Decimal
    monto_total_usd: Decimal
    causa_egreso: str
    breakdown: dict = {}  # Contains details like salario_base, vacaciones, prestamos, etc
    model_config = ConfigDict(from_attributes=True)
