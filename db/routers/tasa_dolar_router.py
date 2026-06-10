import os
from fastapi import APIRouter, HTTPException, Depends
import httpx
from sqlalchemy.orm import Session
from database import get_db

from crud.tasa_dolar_crud import crud_tasa_dolar
from schemas.tasa_dolar_schema import TasaDolarCreate, TasaDolarResponse, TasaDolarUpdate
from routers.factory import create_crud_router
from models.tasa_dolar_model import TasaDolar, FuenteTasa
from models.usuario_model import Usuario
from models.empleado_model import Empleado
from schemas.tasa_dolar_schema import TasaDolarHistorialResponse
from utils.auth import get_current_payload


router = APIRouter(dependencies=[Depends(get_current_payload)])


async def _fetch_bcv_valor() -> float:
    """Consulta la API externa BCV y retorna el valor numérico de la tasa."""
    url = os.getenv("DOLAR_API_URL")
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, follow_redirects=True)
        resp.raise_for_status()
        data = resp.json().get("current", {})
        # El campo puede variar según el proveedor; probamos las claves comunes
        for key in ("price", "rate", "value", "bcv"):
            if key in data:
                return float(data[key])
        # Fallback: primer valor numérico del dict
        for v in data.values():
            try:
                return float(v)
            except (TypeError, ValueError):
                continue
    raise ValueError("No se pudo extraer el valor numérico de la respuesta de la API BCV")


@router.get("/actual", tags=["Tasa Dolar"])
async def get_tasa_dolar_actual(db: Session = Depends(get_db)):
    """
    Retorna la tasa de dólar vigente:
    - Si el último registro en BD tiene fuente='usuario' → usar ese valor (no llama a la API).
    - Si no hay registros o el último es fuente='api' → consultar la API BCV en tiempo real.
    """
    tasa_personalizada = crud_tasa_dolar.get_tasa_personalizada_vigente(db)

    if tasa_personalizada is not None:
        ultimo = crud_tasa_dolar.get_ultimo_registro(db)
        return {
            "valor": tasa_personalizada,
            "fuente": "usuario",
            "tipo": ultimo.tipo.value if ultimo else "PERSONALIZADO",
            "message": "Tasa personalizada vigente"
        }

    try:
        valor_api = await _fetch_bcv_valor()
        return {
            "valor": valor_api,
            "fuente": "api",
            "tipo": "BCV",
            "message": "Tasa BCV obtenida de la API"
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al obtener tasa BCV: {exc}")
        
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