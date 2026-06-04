"""
Deterministic seeder that forces inserting 10 distinct records per table.
Usage (from nominas-app folder, venv active):

    python -m db.seeders.seed_force

This script uses explicit transactions (`session.begin()`), commits after each table,
and ensures relational integrity by inserting in dependency order.
"""
from datetime import date, timedelta
from decimal import Decimal
import os, sys
# ensure package imports work when running as module
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import SessionLocal, engine

from models.niveles_escalafon_model import NivelesEscalafon
from models.titulos_academicos_model import TitulosAcademicos
from models.empleado_model import Empleado, TipoEmpleado
from models.reglas_escalafon_model import ReglasEscalafon
from models.nominas_model import Nominas
from models.nomina_empleado_model import NominaEmpleado
from models.bono_model import Bono
from models.deduccion_model import Deduccion
from models.usuario_model import Usuario

Session = SessionLocal


def seed_niveles(session):
    objs = []
    for i in range(1, 11):
        objs.append(NivelesEscalafon(nombre=f"Nivel Seed {i}", descripcion=f"Nivel seed descripcion {i}"))
    session.add_all(objs)
    session.commit()
    print("Seeded niveles_escalafon: 10 rows")


def seed_titulos(session):
    objs = []
    for i in range(1, 11):
        objs.append(TitulosAcademicos(nombre=f"Titulo Seed {i}", descripcion=f"Titulo desc {i}"))
    session.add_all(objs)
    session.commit()
    print("Seeded titulos_academicos: 10 rows")


def seed_empleados(session):
    niveles = session.query(NivelesEscalafon).order_by(NivelesEscalafon.id).limit(10).all()
    titulos = session.query(TitulosAcademicos).order_by(TitulosAcademicos.id).limit(10).all()
    objs = []
    for i in range(1, 11):
        cedula = f"V{1000000 + i}"
        tipo = list(TipoEmpleado)[(i - 1) % len(list(TipoEmpleado))]
        nivel_id = niveles[(i - 1) % len(niveles)].id
        titulo_id = titulos[(i - 1) % len(titulos)].id
        objs.append(Empleado(
            cedula=cedula,
            email=f"seed.empleado{i}@example.com",
            nombre=f"SeedNombre{i}",
            apellido=f"SeedApellido{i}",
            anios_experiencia=i % 8,
            tipo_empleado=tipo,
            cargo=f"CargoSeed{i}",
            activo=True,
            nivel_escalafon_id=nivel_id,
            titulo_academico_id=titulo_id,
            fecha_ingreso=date.today() - timedelta(days=365 * (i % 5)),
            salario_base=Decimal('1200.00') + Decimal(i * 10)
        ))
    session.add_all(objs)
    session.commit()
    print("Seeded empleados: 10 rows")


def seed_reglas(session):
    niveles = session.query(NivelesEscalafon).order_by(NivelesEscalafon.id).all()
    titulos = session.query(TitulosAcademicos).order_by(TitulosAcademicos.id).all()
    objs = []
    for i in range(1, 11):
        objs.append(ReglasEscalafon(
            anios_mix=0,
            anios_max=5 + (i % 3),
            salario_base=Decimal('1000.00') + Decimal(i * 50),
            activa=bool(i % 2),
            nivel_escalafon_id=niveles[(i - 1) % len(niveles)].id,
            titulo_academico_id=titulos[(i - 1) % len(titulos)].id
        ))
    session.add_all(objs)
    session.commit()
    print("Seeded reglas_escalafon: 10 rows")


def seed_nominas(session):
    objs = []
    for i in range(1, 11):
        objs.append(Nominas(fecha_pago=date.today() - timedelta(days=30 * i), tasa_dolar=Decimal('1.00') + Decimal(i) * Decimal('0.02')))
    session.add_all(objs)
    session.commit()
    print("Seeded nominas: 10 rows")


def seed_nomina_empleados(session):
    nominas = session.query(Nominas).order_by(Nominas.id).limit(10).all()
    empleados = session.query(Empleado).order_by(Empleado.cedula).limit(10).all()
    objs = []
    for i in range(min(len(nominas), len(empleados))):
        nom = nominas[i]
        emp = empleados[i]
        objs.append(NominaEmpleado(
            nomina_id=nom.id,
            empleado_cedula=emp.cedula,
            salario_base=emp.salario_base,
            total_ingresos=emp.salario_base,
            total_deducciones=Decimal('0.00'),
            salario_final_bs=emp.salario_base,
            salario_final_usd=Decimal('0.00')
        ))
    session.add_all(objs)
    session.commit()
    print("Seeded nomina_empleados: created", len(objs))


def seed_bonos(session):
    nes = session.query(NominaEmpleado).limit(10).all()
    objs = []
    for i, ne in enumerate(nes, start=1):
        objs.append(Bono(
            nomina_id=ne.nomina_id,
            empleado_cedula=ne.empleado_cedula,
            nombre=f"BonoSeed{i}",
            monto=Decimal('50.00') + Decimal(i),
            es_porcentaje=False,
            descripcion=f"Bono seed {i}",
            observacion=None,
            tipo_pago='unico'
        ))
    session.add_all(objs)
    session.commit()
    print("Seeded bonos: created", len(objs))


def seed_deducciones(session):
    nes = session.query(NominaEmpleado).limit(10).all()
    objs = []
    for i, ne in enumerate(nes, start=1):
        objs.append(Deduccion(
            nomina_id=ne.nomina_id,
            empleado_cedula=ne.empleado_cedula,
            nombre=f"DeduccionSeed{i}",
            monto=Decimal('5.00') + Decimal(i),
            es_porcentaje=False,
            descripcion=f"Deduccion seed {i}",
            observacion=None,
            tipo_pago='unico'
        ))
    session.add_all(objs)
    session.commit()
    print("Seeded deducciones: created", len(objs))


def seed_usuarios(session):
    empleados = session.query(Empleado).order_by(Empleado.cedula).limit(10).all()
    objs = []
    for i, emp in enumerate(empleados, start=1):
        objs.append(Usuario(
            email=f"seed.user{i}@example.com",
            hashed_password=f"hashed_seed_pwd_{i}",
            empleado_cedula=emp.cedula,
            activo=True
        ))
    session.add_all(objs)
    session.commit()
    print("Seeded usuarios: created", len(objs))


def run_all():
    # ensure tables exist
    from models.base_model import Base
    Base.metadata.create_all(bind=engine)

    # Use a fresh session per seeding step to avoid nested transactions
    seed_steps = [
        seed_niveles,
        seed_titulos,
        seed_empleados,
        seed_reglas,
        seed_nominas,
        seed_nomina_empleados,
        seed_bonos,
        seed_deducciones,
        seed_usuarios,
    ]
    for step in seed_steps:
        with Session() as session:
            step(session)


if __name__ == '__main__':
    run_all()
