from routers.factory import create_crud_router
from crud.cestaticket_crud import crud_cestaticket
from schemas.cestaticket_schema import CestaticketCreate, CestaticketResponse, CestaticketUpdate

router = create_crud_router(
    schema_create=CestaticketCreate,
    schema_update=CestaticketUpdate,
    schema_response=CestaticketResponse,
    crud_service=crud_cestaticket,
    id_name="id",
    tags=["Cestaticket"],
    permissions={"create": "nominas:crear", "update": "nominas:editar", "delete": "nominas:eliminar"},
)
