from crud.base_crud import CRUDBase
from models.nomina_empleado_model import NominaEmpleado
from schemas.nomina_empleado_schema import NominaEmpleadoCreate, NominaEmpleadoUpdate

crud_nomina_empleado = CRUDBase[NominaEmpleado, NominaEmpleadoCreate, NominaEmpleadoUpdate](NominaEmpleado)
