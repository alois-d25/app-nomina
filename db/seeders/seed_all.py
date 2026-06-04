"""
Seeder script — inserts required reference/lookup data and a default admin user.
Does NOT seed nominas, bonos, deducciones, or liquidaciones (created via API).

Run from the `db` folder with your virtualenv active:

    python -m seeders.seed_all [--force]
"""
from datetime import date, timedelta
from decimal import Decimal
import os, sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import SessionLocal, engine
from sqlalchemy import select, func

import argparse
parser = argparse.ArgumentParser()
parser.add_argument('--force', action='store_true', help='Re-seed even if table already has rows')
args, _ = parser.parse_known_args()
FORCE_SEED = args.force

from models.empleado_model import Empleado, EstadoEmpleado
from models.niveles_escalafon_model import NivelesEscalafon
from models.titulos_academicos_model import TitulosAcademicos
from models.reglas_escalafon_model import ReglasEscalafon
from models.usuario_model import Usuario
from models.roles_permisos_usuarios_model import Rol, Permiso, RolPermiso


def _count(session, model):
    try:
        return session.scalar(select(func.count()).select_from(model)) or 0
    except Exception:
        return session.query(model).count()


def ensure_at_least(session, model, create_func, n=10):
    count = _count(session, model)
    if not FORCE_SEED and count >= n:
        print(f"{model.__tablename__}: {count} rows, skipping")
        return
    to_create = n - count
    print(f"Seeding {to_create} rows into {model.__tablename__}")
    for i in range(to_create):
        session.add(create_func(count + i + 1))
    session.commit()


def seed_niveles(session):
    # (id, nombre, descripcion, es_por_hora)
    data = [
        (1, 'Directivo',       'Descripcion nivel 1', False),
        (2, 'Profesor x hora', 'Descripcion nivel 2', True),
        (3, 'Maestro',         'Descripcion nivel 3', False),
        (4, 'Administrativo',  'Descripcion nivel 4', False),
        (5, 'Servicio',        'Descripcion nivel 5', False),
    ]
    for id_val, nombre, desc, por_hora in data:
        existente = session.query(NivelesEscalafon).filter_by(id=id_val).first()
        if not existente:
            session.add(NivelesEscalafon(id=id_val, nombre=nombre, descripcion=desc, es_por_hora=por_hora))
        else:
            existente.es_por_hora = por_hora
    session.commit()
    print("Seeded niveles_escalafon")


def seed_titulos(session):
    ensure_at_least(
        session, TitulosAcademicos,
        lambda idx: TitulosAcademicos(nombre=f"Titulo {idx}", descripcion=f"Descripcion titulo {idx}")
    )


def seed_reglas(session):
    def make(idx):
        nivel_id = ((idx - 1) % _count(session, NivelesEscalafon)) + 1
        titulo_id = ((idx - 1) % _count(session, TitulosAcademicos)) + 1
        return ReglasEscalafon(
            anios_min=0, anios_max=5,
            salario_base=Decimal('1000.00') + idx,
            activa=True,
            nivel_escalafon_id=nivel_id,
            titulo_academico_id=titulo_id,
        )
    ensure_at_least(session, ReglasEscalafon, make)


def _nivel_es_por_hora(session, nivel_id):
    nivel = session.query(NivelesEscalafon).filter_by(id=nivel_id).first()
    return bool(nivel and nivel.es_por_hora)


def _jornada_por_nivel(session, nivel_id):
    """Devuelve (dias_trabajados_semana, horas_trabajados_semana) según el nivel."""
    if _nivel_es_por_hora(session, nivel_id):
        return None, 16   # profesor x hora: 16 horas/semana por defecto
    return 5, None        # resto: jornada de 5 días/semana


def seed_empleados(session):
    # Master employee linked to the admin user
    if not session.query(Empleado).filter_by(cedula='28932122').first():
        dias, horas = _jornada_por_nivel(session, 1)
        session.add(Empleado(
            cedula='28932122',
            email='prueba@gmail.com',
            nombre='Juan',
            apellido='Perez',
            anios_experiencia=3,
            estado=EstadoEmpleado.activo,
            nivel_escalafon_id=1,
            titulo_academico_id=1,
            fecha_ingreso=date(2026, 5, 29),
            salario_base=Decimal('400.00'),
            telefono='+1-555-0100',
            numero_cuenta='1234567890',
            dias_trabajados_semana=dias,
            horas_trabajadas_semana=horas,
        ))
        session.commit()
        print("Seeded master empleado (Juan Perez)")

    def make(idx):
        nivel_id = ((idx - 1) % max(1, _count(session, NivelesEscalafon))) + 1
        titulo_id = ((idx - 1) % max(1, _count(session, TitulosAcademicos))) + 1
        dias, horas = _jornada_por_nivel(session, nivel_id)
        return Empleado(
            cedula=f"V{idx:07d}",
            email=f"empleado{idx}@example.com",
            nombre=f"Carlos{idx}",
            apellido=f"Juez{idx}",
            anios_experiencia=idx % 10,
            estado=EstadoEmpleado.activo,
            nivel_escalafon_id=nivel_id,
            titulo_academico_id=titulo_id,
            fecha_ingreso=date.today() - timedelta(days=365 * (idx % 5)),
            salario_base=Decimal('100.00') + Decimal(idx),
            telefono=f'+1-555-{1000+idx:04d}',
            numero_cuenta=f'{10000000+idx:08d}',
            dias_trabajados_semana=dias,
            horas_trabajadas_semana=horas,
        )
    ensure_at_least(session, Empleado, make)


def seed_roles(session):
    data = [
        (1, 'Administrador general', 'Control total'),
        (2, 'Administrador',         'Control parcial'),
        (3, 'Asistente',             'Visualización y cálculos'),
    ]
    for id_val, nombre, desc in data:
        if not session.query(Rol).filter_by(id=id_val).first():
            session.add(Rol(id=id_val, nombre=nombre, descripcion=desc))
    session.commit()
    print("Seeded roles")


def seed_permisos(session):
    data = [
        (1, 'usuarios:crear'), (2, 'usuarios:ver'), (3, 'usuarios:editar'), (4, 'usuarios:eliminar'),
        (5, 'empleados:crear'), (6, 'empleados:ver'), (7, 'empleados:editar'), (8, 'empleados:eliminar'),
        (9, 'nominas:crear'), (10, 'nominas:ver'), (11, 'nominas:editar'), (12, 'nominas:eliminar'),
        (13, 'roles:gestionar'),
    ]
    for id_val, nombre in data:
        if not session.query(Permiso).filter_by(id=id_val).first():
            session.add(Permiso(id=id_val, nombre=nombre))
    session.commit()
    print("Seeded permisos")


def seed_rol_permisos(session):
    mappings = [
        # Administrador general — todo
        (1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(1,9),(1,10),(1,11),(1,12),(1,13),
        # Administrador — sin eliminar ni roles
        (2,1),(2,2),(2,3),(2,5),(2,6),(2,7),(2,9),(2,10),(2,11),
        # Asistente — solo ver / calcular
        (3,2),(3,6),(3,7),(3,9),(3,10),(3,11),
    ]
    for rol_id, permiso_id in mappings:
        if not session.query(RolPermiso).filter_by(rol_id=rol_id, permiso_id=permiso_id).first():
            session.add(RolPermiso(rol_id=rol_id, permiso_id=permiso_id))
    session.commit()
    print("Seeded rol_permisos")


def seed_usuarios(session):
    try:
        from utils.security import get_password_hash
        hashed_pwd = get_password_hash("prueba123")
    except ImportError:
        import bcrypt
        hashed_pwd = bcrypt.hashpw(b"prueba123", bcrypt.gensalt()).decode()

    if not session.query(Usuario).filter_by(email='prueba@gmail.com').first():
        session.add(Usuario(
            email='prueba@gmail.com',
            hashed_password=hashed_pwd,
            empleado_cedula='28932122',
            activo=True,
            rol_id=1,
        ))
        session.commit()
        print("Seeded admin user (prueba@gmail.com / prueba123)")

    if not FORCE_SEED and _count(session, Usuario) >= 10:
        print(f"usuarios: has enough rows, skipping extras")
        return

    rol_basico = session.query(Rol).filter_by(id=3).first()
    empleados = session.query(Empleado).filter(Empleado.cedula != '28932122').limit(10).all()
    for i, emp in enumerate(empleados, start=1):
        if not session.query(Usuario).filter_by(email=f"user{i}@example.com").first():
            session.add(Usuario(
                email=f"user{i}@example.com",
                hashed_password=hashed_pwd,
                empleado_cedula=emp.cedula,
                activo=True,
                rol_id=rol_basico.id if rol_basico else None,
            ))
    session.commit()
    print("Seeded extra usuarios")


def run_all():
    from models.base_model import Base
    Base.metadata.create_all(bind=engine)

    session = SessionLocal()
    try:
        seed_niveles(session)
        seed_titulos(session)
        seed_empleados(session)
        seed_reglas(session)
        seed_roles(session)
        seed_permisos(session)
        seed_rol_permisos(session)
        seed_usuarios(session)
    finally:
        session.close()


if __name__ == '__main__':
    run_all()
