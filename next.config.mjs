/** @type {import('next').NextConfig} */
const nextConfig = {
  // Habilitar build standalone para Docker (genera server.js autocontenido)
  output: 'standalone',

  // 1. Bloqueo para el React Compiler (Analizador de UI)
  reactCompiler: {
    sources: (filename) => {
      // Ignora cualquier archivo cuya ruta contenga "db", "prisma" o entornos virtuales
      return !/db|node_modules|\.next|prisma|\.venv/.test(filename);
    },
  },

  // 2. Bloqueo para TURBOPACK (El motor por defecto en Rust)
  turbopack: {
    rules: {
      // Convierte cualquier archivo dentro de cualquier carpeta 'db' en un proceso nulo (noop)
      "**/db/**/*": { loaders: ["@next/plugin-custom-route-match/noop"] },
      "**/db/*": { loaders: ["@next/plugin-custom-route-match/noop"] },
    },
  },

  // 3. Bloqueo para WEBPACK (Por si Next.js desactiva Turbopack internamente)
  webpack: (config) => {
    config.watchOptions = {
      ignored: [
        "**/node_modules/**",
        "**/.next/**",
        "**/prisma/**",
        "**/db/**", // Ignora subcarpetas de db en cualquier nivel
        "**/db/*", // Ignora archivos raíz de db en cualquier nivel
        "**/db", // Ignora la carpeta db en sí
        "**/.venv/**",
        "**/__pycache__/**",
      ],
    };
    return config;
  },
};

export default nextConfig;
