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
ARG VITE_MAPBOX_TOKEN
ARG VITE_OPENAI_API_KEY
COPY client/package*.json ./
# Install with devDependencies so type packages like @types/mapbox__point-geometry are available for vue-tsc
RUN npm install --include=dev

COPY client ./
RUN npm run build

# ── Prune devDependencies ──
WORKDIR /app
RUN npm prune --omit=dev

# ── Stage 2: Runtime with Nginx + Node ──
FROM node:20-slim AS runner

RUN apt-get update && apt-get install -y nginx openssl gettext-base && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root node_modules (where NPM hoists most workspace dependencies like @nestjs/core)
COPY --from=builder /app/node_modules ./node_modules

# Copy full built server (sources + dist + generated Prisma client)
COPY --from=builder /app/server ./server

# Copy client build into Nginx web root
COPY --from=builder /app/client/dist /usr/share/nginx/html

# Nginx config (adjust upstream to localhost:3000)
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Use a entrypoint script to substitute PORT in Nginx config at runtime
# Render provides $PORT, and we want Nginx to listen on it.
# We also ensure the Nest backend runs on a different internal port (3000)
# which Nginx then proxies to.
CMD /bin/bash -c "envsubst '\$PORT' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp && mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf && service nginx start && cd /app && PORT=3001 node server/dist/src/main.js"

