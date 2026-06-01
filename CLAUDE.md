# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

An MCP server wrapping the **PicDefense.io API v2** (`https://app.picdefense.io/api/v2`,
spec mirrored in `src/swagger.json`). It exposes 9 image-analysis tools to AI agents over
two transports. TypeScript, `@modelcontextprotocol/sdk`, zod, Docker.

## Architecture

- **`src/client.ts`** — `PicDefenseClient`: one method per API endpoint, native `fetch`,
  30s timeout, sends `X-API-TOKEN: USERID:APIKEY`, unwraps the `{status,message,error,data}`
  envelope and throws on `status:-1` / non-2xx (e.g. `insufficient credits`, `unauthorized`).
- **`src/tools/*.ts`** — one file per tool: exports a zod schema + a handler `(client, params) => string`.
  The 8 image tools share `tools/_shared.ts` (`urlSchema`, `format`).
- **`src/server-factory.ts`** — `createServer(client)` registers all 9 tools on a fresh
  `McpServer` via `server.tool(...)`. **This is the single source of truth for tool
  names/descriptions** — add new tools here.
- **`src/index.ts`** — stdio transport (npm `bin`, local Claude Desktop use). Token from
  `--api-token`/`-t` or `PICDEFENSE_API_TOKEN`.
- **`src/sse-server.ts`** — hosted Express server (port 6910). Per-connection token: SSE
  (`/sse` + `/messages`) and stateless Streamable HTTP (`/mcp`). No global key.

## Auth model

Multi-tenant. The server never stores credentials — each stdio process / SSE session /
HTTP request carries the user's own `USERID:APIKEY`, forwarded as `X-API-TOKEN`. Most
endpoints **deduct account credits per call**.

## Adding a tool

1. Add a client method in `src/client.ts`.
2. Add `src/tools/<name>.ts` (schema + handler).
3. Register it in `src/server-factory.ts` and add a row to the `TOOLS` table in `src/sse-server.ts`.
4. Update the tool table in `README.md`.

## Commands

```bash
npm install
npm run build          # tsc + copy swagger.json to dist/
npm run dev            # stdio (tsx)
npm run dev:sse        # hosted server (tsx watch)
npm run start:sse      # node dist/sse-server.js
docker compose up --build -d
```

## Deploy

No CI/CD in this repo (intentional — it's meant to be cloned and self-hosted).
On the host: `git clone` → `docker compose up --build -d` (or `./deploy.sh`).
Container `picdefenseio_mcp` on port 6910; nginx proxies `https://mcp.picdefense.io` →
`127.0.0.1:6910`. Update with `git pull && docker compose up --build -d`.

## Conventions

- Pin exact dependency versions (no `^`/`~`). Keep the top-level `zod` pin matching the
  version `@modelcontextprotocol/sdk` resolves, or `server.tool(...)` type inference breaks.
