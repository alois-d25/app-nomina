from crud.niveles_escalafon import crud_nivelesEscalafon
from routers.factory import create_crud_router
from schemas.niveles_escalafon_schema import NivelesEscalafonCreate, NivelesEscalafonResponse, NivelesEscalafonUpdate


router = create_crud_router(
    schema_create=NivelesEscalafonCreate,
    schema_update=NivelesEscalafonUpdate,
    schema_response=NivelesEscalafonResponse,
    crud_service=crud_nivelesEscalafon,
    tags=["Niveles Escalafon"],
    id_name='id',
    permissions={"create": "nominas:crear", "update": "nominas:editar", "delete": "nominas:eliminar"},
)