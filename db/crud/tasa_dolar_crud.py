from crud.base_crud import CRUDBase
from models.tasa_dolar_model import TasaDolar
from schemas.tasa_dolar_schema import TasaDolarCreate, TasaDolarUpdate

class CRUDTasaDolar(CRUDBase[TasaDolar, TasaDolarCreate, TasaDolarUpdate]):
    pass

crud_tasa_dolar = CRUDTasaDolar(TasaDolar)