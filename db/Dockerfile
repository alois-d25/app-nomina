# ============================================================
# Backend FastAPI — Imagen híbrida Python + Node.js
# ============================================================
FROM python:3.11-slim

WORKDIR /app

# ── 1. Instalar dependencias del sistema ─────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# ── 2. Instalar Node.js 18.x (para Sequelize CLI) ───────────
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

# ── 3. Copiar e instalar dependencias de Python ─────────────
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ── 4. Copiar código fuente del backend ──────────────────────
COPY . .

# ── 5. Instalar dependencias de Node.js (Sequelize) ─────────
# Creamos un package.json mínimo para las dependencias de Sequelize
RUN npm init -y && \
    npm install --save-dev sequelize-cli@^6.6.5 && \
    npm install --save sequelize@^6.37.8 mysql2@^3.22.0 dotenv@^16.4.5

# ── 6. Script de entrada ────────────────────────────────────
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Exponer puerto 8000
EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
