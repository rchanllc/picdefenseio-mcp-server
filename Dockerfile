# --- Build stage ---
FROM node:22-slim AS builder
WORKDIR /app
# Install the exact, audited dependency tree from the committed lockfile (npm ci),
# rather than re-resolving from the registry at build time.
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY src/ src/
RUN npm run build

# --- Runtime stage ---
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=6910

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist/ dist/

# Run as non-root
RUN groupadd -r mcp && useradd -r -g mcp mcp && chown -R mcp:mcp /app
USER mcp

EXPOSE 6910

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||6910)+'/health',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/sse-server.js"]
