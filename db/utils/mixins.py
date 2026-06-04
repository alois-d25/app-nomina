from sqlalchemy import Column, DateTime
from sqlalchemy.sql import func
from sqlalchemy import event, inspect
from models.auditoria_model import Auditoria, AccionAuditoria
import json
from utils.context import current_user_id, current_user_ip
#aqui iria todo lo que se comparte entre modelos
class AuditMixin:
    """Mixin para inyectar timestamps de auditoría de forma automática."""
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    # onupdate cambia auto al editar un registro en la BD
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
def create_audit_record(mapper, connection, target, accion: AccionAuditoria):
    user_id = current_user_id.get()
    ip = current_user_ip.get()
    
    state = inspect(target)
    tabla = mapper.local_table.name
    registro_id = str(state.identity[0]) if state.identity else "Pendiente"

    valor_anterior = {}
    valor_nuevo = {}

    if accion == AccionAuditoria.UPDATE:
        for attr in state.attrs:
            history = attr.history
            if history.has_changes():
                # Obtenemos los valores descartando relaciones complejas (solo columnas)
                valor_anterior[attr.key] = history.deleted[0] if history.deleted else None
                valor_nuevo[attr.key] = history.added[0] if history.added else None
    elif accion == AccionAuditoria.INSERT:
        for attr in state.attrs:
            valor_nuevo[attr.key] = attr.value
    elif accion == AccionAuditoria.DELETE:
        for attr in state.attrs:
            valor_anterior[attr.key] = attr.value

    # Insertamos directamente en la tabla de auditorías usando la conexión actual
    connection.execute(
        Auditoria.__table__.insert().values(
            usuario_id=user_id,
            tabla_afectada=tabla,
            registro_id=registro_id,
            accion=accion,
            valor_anterior=json.dumps(valor_anterior, default=str) if valor_anterior else None,
            valor_nuevo=json.dumps(valor_nuevo, default=str) if valor_nuevo else None,
            ip_usuario=ip
        )
    )

# Conectamos los eventos a todos los modelos que hereden de AuditMixin
@event.listens_for(AuditMixin, 'after_insert', propagate=True)
def receive_after_insert(mapper, connection, target):
    create_audit_record(mapper, connection, target, AccionAuditoria.INSERT)

@event.listens_for(AuditMixin, 'after_update', propagate=True)
def receive_after_update(mapper, connection, target):
    create_audit_record(mapper, connection, target, AccionAuditoria.UPDATE)

@event.listens_for(AuditMixin, 'after_delete', propagate=True)
def receive_after_delete(mapper, connection, target):
    create_audit_record(mapper, connection, target, AccionAuditoria.DELETE)
    