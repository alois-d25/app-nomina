from crud.base_crud import CRUDBase
from models.cestaticket_model import Cestaticket
from schemas.cestaticket_schema import CestaticketCreate, CestaticketUpdate


crud_cestaticket = CRUDBase[Cestaticket, CestaticketCreate, CestaticketUpdate](Cestaticket)
