#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════╗"
echo "║     nominas-app — Contenedor Unificado           ║"
echo "╚══════════════════════════════════════════════════╝"

# ── 1. Esperar a que MySQL esté disponible ───────────────────
echo "⏳ Esperando conexión con MySQL ($DB_HOST:$DB_PORT)..."

MAX_RETRIES=30
RETRY_COUNT=0

cd /workspace/db

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

echo "✅ Conectado a MySQL."

# ── 2. Ejecutar seeders de Python ────────────────────────────
echo "🌱 Ejecutando seeders..."
python seeders/seed_all.py 2>&1 || {
    echo "⚠️  Los seeders se ejecutarán al arrancar FastAPI (startup event)."
}

# ── 3. Arrancar FastAPI en segundo plano ─────────────────────
echo "🚀 Levantando FastAPI en puerto 8000..."
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1 &

# ── 4. Arrancar Next.js en primer plano ──────────────────────
echo "🌐 Levantando Next.js en puerto 3000..."
cd /workspace

# Next.js standalone necesita las carpetas static y public junto al server.js
# Copiarlas si no existen (solo la primera vez)
if [ ! -d ".next/standalone/public" ]; then
    cp -r public .next/standalone/ 2>/dev/null || true
fi
if [ ! -d ".next/standalone/.next/static" ]; then
    mkdir -p .next/standalone/.next
    cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
fi

cd .next/standalone
exec node server.js
