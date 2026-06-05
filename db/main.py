import os
from dotenv import load_dotenv
from fastapi import FastAPI, Request 
import uvicorn
from routers.router import router
from fastapi.middleware.cors import CORSMiddleware

from utils.context import current_user_id, current_user_ip
from utils.security import decode_access_token
from utils.auth import get_bearer_token
# ----------------------------

load_dotenv()
port = int(os.getenv("PUBLIC_PORT", 8000))

from database import engine
from models.base_model import Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Backend")

# Seed default deducciones on startup
@app.on_event("startup")
async def seed_on_startup():
    try:
        from seeders.seed_all import run_all
        from database import SessionLocal
        from models.niveles_escalafon_model import NivelesEscalafon

        _db = SessionLocal()
        try:
            is_empty = _db.query(NivelesEscalafon).first() is None
        finally:
            _db.close()

        if is_empty:
            run_all()
            print("✓ seed_all completed")
        else:
            print("✓ seed_all skipped (tables already populated)")
    except Exception as e:
        print(f"⚠ Error in seed_all: {e}")

    try:
        from database import SessionLocal
        from routers.deduccion_router import seed_default_deducciones

        db = SessionLocal()
        try:
            seed_default_deducciones(db=db)
            print("✓ Default deducciones seeded successfully")
        finally:
            db.close()
    except Exception as e:
        print(f"⚠ Error seeding deducciones: {e}")

@app.middleware("http")
async def audit_middleware(request: Request, call_next):
    # 1. Obtener IP
    client_ip = request.client.host if request.client else None
    current_user_ip.set(client_ip)
    
    # 2. Obtener Usuario desde el header Authorization
    token = get_bearer_token(request)
    if token:
        try:
            payload = decode_access_token(token)
            if payload and payload.get("sub"):
                current_user_id.set(int(payload.get("sub")))
            else:
                current_user_id.set(None)
        except:
            current_user_id.set(None)
    else:
        current_user_id.set(None)

    response = await call_next(request)
    return response

default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://0.0.0.0:3000",
]

# Permite agregar orígenes extra via variable de entorno (separados por coma)
extra_origins = os.getenv("CORS_ORIGINS", "")
origins = default_origins + [o.strip() for o in extra_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       
    allow_credentials=True,      
    allow_methods=["*"],         
    allow_headers=["*"],         
)

app.include_router(router=router, prefix="/api")

if __name__ == "__main__":
    uvicorn.run("main:app", port=port, reload=True)