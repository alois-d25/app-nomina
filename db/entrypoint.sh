#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════╗"
echo "║       Backend nominas-app — Iniciando...         ║"
echo "╚══════════════════════════════════════════════════╝"

# ── 1. Esperar a que MySQL esté disponible ───────────────────
echo "⏳ Esperando conexión con MySQL ($DB_HOST:$DB_PORT)..."

MAX_RETRIES=30
RETRY_COUNT=0

# Usamos Python + PyMySQL (ya instalados) para verificar la conexión
until python -c "
import pymysql, os, sys
try:
    conn = pymysql.connect(
        host=os.environ['DB_HOST'],
        port=int(os.environ.get('DB_PORT', 3306)),
        user=os.environ['DB_USERNAME'],
        password=os.environ['DB_PASSWORD'],
        database=os.environ['DB_NAME'],
        connect_timeout=3
    )
    conn.close()
    sys.exit(0)
except Exception as e:
    print(f'   → {e}', file=sys.stderr)
    sys.exit(1)
" 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ No se pudo conectar a MySQL después de $MAX_RETRIES intentos."
        exit 1
    fi
    echo "   Intento $RETRY_COUNT/$MAX_RETRIES — reintentando en 2s..."
    sleep 2
done

echo "✅ Conectado a la base de datos $DB_NAME en MySQL."

# ── 2. Ejecutar seeders de Python ────────────────────────────
echo "🌱 Ejecutando seeders de Python..."
python seeders/seed_all.py 2>&1 || {
    echo "⚠️  Los seeders se ejecutarán al arrancar FastAPI (startup event)."
}

# ── 4. Levantar FastAPI con Uvicorn ──────────────────────────
echo "🚀 Levantando FastAPI en puerto ${PUBLIC_PORT:-8000}..."
exec python -m uvicorn main:app \
    --host 0.0.0.0 \
    --port "${PUBLIC_PORT:-8000}" \
    --workers 1
