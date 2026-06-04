from crud.titulos_academicos_crud import crud_titulos_academicos
from routers.factory import create_crud_router
from schemas.titulos_academicos_schema import TitulosAcademicosCreate, TitulosAcademicosResponse, TitulosAcademicosUpdate


router = create_crud_router(
    schema_create= TitulosAcademicosCreate,
    schema_update= TitulosAcademicosUpdate,
    schema_response= TitulosAcademicosResponse,
    crud_service= crud_titulos_academicos,
    tags=["Titulos academicos"],
    id_name='id',
    permissions={"create": "nominas:crear", "update": "nominas:editar", "delete": "nominas:eliminar"},
)