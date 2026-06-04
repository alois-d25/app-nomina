from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List
from models.auditoria_model import AccionAuditoria

class AuditoriaBase(BaseModel):
    tabla_afectada: str
    registro_id: str
    accion: AccionAuditoria
    valor_anterior: Optional[str] = None
    valor_nuevo: Optional[str] = None
    ip_usuario: Optional[str] = None
    observacion: Optional[str] = None

class AuditoriaCreate(AuditoriaBase):
    usuario_id: Optional[int] = None

class AuditoriaUpdate(BaseModel):
    # Por seguridad, en auditoría solo permitimos editar la observación
    observacion: Optional[str] = None

class AuditoriaResponse(AuditoriaBase):
    id: int
    usuario_id: Optional[int] = None
    fecha: datetime

    model_config = ConfigDict(from_attributes=True)

class AuditoriaDetalleResponse(BaseModel):
    id: int
    fecha: datetime
    accion: AccionAuditoria
    tabla_afectada: str
    usuario_nombre: str

    model_config = ConfigDict(from_attributes=True)

class AuditoriaPagedResponse(BaseModel):
    data: List[AuditoriaDetalleResponse]
    total: int