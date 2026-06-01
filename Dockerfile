# syntax=docker/dockerfile:1.7

# ---------- Stage 1: install deps + build ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app

# OS deps for better-sqlite3 native build
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# install monorepo deps (workspaces)
COPY package.json package-lock.json* ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm install

# copy source
COPY client/ client/
COPY server/ server/
COPY cmas-content.json ./cmas-content.json

# build client → client/dist
RUN npm --workspace client run build
# build server → server/dist
RUN npm --workspace server run build

# Prune to production deps for runtime
RUN npm prune --omit=dev --workspaces --include-workspace-root

# ---------- Stage 2: slim runtime ----------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8473
ENV HOST=0.0.0.0
ENV CLIENT_DIST=/app/client/dist
ENV CONTENT_PATH=/app/content/cmas-content.json
ENV DB_PATH=/data/cmas.db

# non-root user
RUN groupadd --system --gid 1001 app \
 && useradd --system --uid 1001 --gid 1001 --home /app app \
 && mkdir -p /data /app/content \
 && chown -R app:app /data /app

# Copy runtime artifacts only. npm workspaces hoists deps to /app/node_modules,
# so server/ does not have its own node_modules directory.
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/server/dist ./server/dist
COPY --from=build --chown=app:app /app/client/dist ./client/dist
COPY --from=build --chown=app:app /app/cmas-content.json /app/content/cmas-content.json
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/server/package.json ./server/package.json

USER app
VOLUME ["/data"]
EXPOSE 8473

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8473)+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server/dist/index.js"]
