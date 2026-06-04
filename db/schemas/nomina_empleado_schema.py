from decimal import Decimal
from pydantic import BaseModel, ConfigDict

class NominaEmpleadoBase(BaseModel):
    salario_base: Decimal | None = None
    total_ingresos: Decimal | None = None
    total_deducciones: Decimal | None = None
    salario_final_bs: Decimal | None = None
    salario_final_usd: Decimal | None = None

class NominaEmpleadoCreate(NominaEmpleadoBase):
    nomina_id: int
    empleado_cedula: str

class NominaEmpleadoUpdate(BaseModel):
    salario_base: Decimal | None = None
    total_ingresos: Decimal | None = None
    total_deducciones: Decimal | None = None
    salario_final_bs: Decimal | None = None
    salario_final_usd: Decimal | None = None

class NominaEmpleadoResponse(NominaEmpleadoBase):
    nomina_id: int
    empleado_cedula: str

    model_config = ConfigDict(from_attributes=True)
