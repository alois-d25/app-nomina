# ============================================================
# Dockerfile Unificado — nominas-app
# Frontend (Next.js) + Backend (FastAPI) en un solo contenedor
# ============================================================
FROM python:3.11-slim

# ── 1. Instalar Node.js 20.x ────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# ── 2. Instalar dependencias de Python (backend) ────────────
COPY db/requirements.txt /workspace/db/requirements.txt
RUN pip install --no-cache-dir -r /workspace/db/requirements.txt

# ── 3. Copiar código del backend ────────────────────────────
COPY db/ /workspace/db/

# ── 4. Instalar dependencias de Node.js del frontend ────────
COPY package.json package-lock.json* /workspace/
RUN cd /workspace && npm ci

# ── 5. Copiar código fuente del frontend y compilar ─────────
COPY app/ /workspace/app/
COPY public/ /workspace/public/
COPY next.config.mjs postcss.config.mjs jsconfig.json /workspace/
COPY services/ /workspace/services/

# Variable de entorno para el build de Next.js (proxy interno)
ENV NEXT_PUBLIC_API_URL=""
ENV NEXT_TELEMETRY_DISABLED=1

RUN cd /workspace && npm run build

# ── 6. Copiar y preparar el entrypoint ──────────────────────
COPY start.sh /workspace/start.sh
RUN chmod +x /workspace/start.sh

# ── 7. Exponer solo el puerto del frontend ──────────────────
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

CMD ["./start.sh"]
