# ============================================================
# Stage 1: Instalar dependencias
# ============================================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias (incluyendo devDependencies para el build)
RUN npm ci

# ============================================================
# Stage 2: Compilar la aplicación
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependencias del stage anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar todo el código fuente del proyecto
# (build context es la raíz del proyecto en docker-compose)
COPY . .

# Variable de entorno necesaria en build time para que Next.js
# la embeba en el bundle del cliente (se sobreescribe en runtime)
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Deshabilitar telemetría de Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Compilar la aplicación en modo standalone
RUN npm run build

# ============================================================
# Stage 3: Imagen de producción mínima
# ============================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Crear usuario no-root por seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar archivos estáticos públicos
COPY --from=builder /app/public ./public

# Crear directorio para caché de Next.js con permisos correctos
RUN mkdir .next && chown nextjs:nodejs .next

# Copiar el build standalone y los estáticos generados
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Cambiar a usuario no-root
USER nextjs

# Exponer puerto 3000
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Iniciar el servidor standalone de Next.js
CMD ["node", "server.js"]
