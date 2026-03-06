######## Root Dockerfile: build client + server, serve via Nginx ########

# ── Stage 1: Build frontend + backend ──
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root manifests
COPY package*.json ./

# Install root deps if any (noop if empty)
RUN if [ -f package-lock.json ] || [ -f package.json ]; then npm install || true; fi

# ── Build server ──
WORKDIR /app/server
COPY server/package*.json ./
# Ensure devDependencies (TypeScript, Nest CLI, etc.) are installed even if NODE_ENV=production
RUN npm install --include=dev

COPY server ./
RUN npx prisma generate && npm run build

# ── Build client ──
WORKDIR /app/client
COPY client/package*.json ./
# Install with devDependencies so type packages like @types/mapbox__point-geometry are available for vue-tsc
RUN npm install --include=dev

COPY client ./
RUN npm run build

# ── Stage 2: Runtime with Nginx + Node ──
FROM node:20-slim AS runner

RUN apt-get update && apt-get install -y nginx openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy full built server app (code + node_modules + dist + prisma)
COPY --from=builder /app/server ./server

# Copy client build
COPY --from=builder /app/client/dist /usr/share/nginx/html

# Nginx config (adjust upstream to localhost:3000)
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Simple process manager: start Nest backend and Nginx
CMD service nginx start && node server/dist/src/main.js

