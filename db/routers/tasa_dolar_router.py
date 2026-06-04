import os
from fastapi import APIRouter, HTTPException, Depends
import httpx
from sqlalchemy.orm import Session
from database import get_db

from crud.tasa_dolar_crud import crud_tasa_dolar
from schemas.tasa_dolar_schema import TasaDolarCreate, TasaDolarResponse, TasaDolarUpdate
from routers.factory import create_crud_router
from models.tasa_dolar_model import TasaDolar
from models.usuario_model import Usuario
from models.empleado_model import Empleado
from schemas.tasa_dolar_schema import TasaDolarHistorialResponse
from utils.auth import get_current_payload


router = APIRouter(dependencies=[Depends(get_current_payload)]);

@router.get("/actual", tags=["Tasa Dolar"])
async def get_tasa_dolar():
    url = os.getenv("DOLAR_API_URL")
    
    async with httpx.AsyncClient() as client: 
        try:
            dolarResponse = await client.get(url, follow_redirects=True) 
            dolarResponse.raise_for_status()
            response =  dolarResponse.json()["current"]
            response["message"] = "succesfully rquested price"
            return response
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=500, detail=f"API Error: {exc}")
        
@router.get("/usdt", tags=["Tasa Dolar"])
async def get_tasa_usdt(): 
    url = os.getenv('USDT_API_URL')
    api_key = os.getenv("DOLARVZLA_API_KEY")
    
    headers = {
        'x-dolarvzla-key':api_key
    }

    async with httpx.AsyncClient() as client: 
        try:
            response = await client.get(url, headers=headers, follow_redirects=True) 
            response.raise_for_status()
            data = response.json()
            current_data = data.get("current", {})
            
            return {
                "tipo": "USDT",
                "valor": current_data,
                "fuente": "api",
                "message": "Tasa USDT obtenida exitosamente"
            }
            
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=500, detail=f"Error de conexión con DolarVZLA: {exc}")

# --- HISTORIAL COMPLETO ---
@router.get("/historial", response_model=list[TasaDolarHistorialResponse], tags=["Tasa Dolar"])
def get_historial_completo(db: Session = Depends(get_db)):
    tasas = db.query(
        TasaDolar.id,
        TasaDolar.tipo,
        TasaDolar.valor,
        TasaDolar.fecha,
        TasaDolar.fuente,
        TasaDolar.usuario_id,
        Empleado.nombre.label("empleado_nombre"),
        Empleado.apellido.label("empleado_apellido")
    ).outerjoin(
        Usuario, TasaDolar.usuario_id == Usuario.id
    ).outerjoin(
        Empleado, Usuario.empleado_cedula == Empleado.cedula
    ).order_by(TasaDolar.fecha.desc(), TasaDolar.id.desc()).all()
    
    return tasas



crud_router = create_crud_router(
    schema_create=TasaDolarCreate,
    schema_update=TasaDolarUpdate,
    schema_response=TasaDolarResponse,
    crud_service=crud_tasa_dolar,
    id_name="id",
    permissions={"create": "nominas:editar", "update": "nominas:editar", "delete": "nominas:editar"},
)

router.include_router(crud_router)