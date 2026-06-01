# PicDefense.io MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server for the
[PicDefense.io](https://picdefense.io) API — let AI agents run reverse-image risk
analysis, EXIF extraction, image backlink discovery, and image content
detection (face / landmark / logo / label / SafeSearch) on any image URL.

## Features

- 🔐 **Per-user authentication** — each connection carries its own PicDefense API token; the server holds no keys
- 🚀 **Dual transport** — modern Streamable HTTP (`/mcp`) and legacy SSE (`/sse`)
- 🧰 **9 tools** covering the full PicDefense API v2
- 🐳 **Docker-ready** — production container behind nginx
- 📖 **Built-in docs** — Swagger UI at `/docs`

## Tools

| Tool | Description |
|------|-------------|
| `picdefense_get_credits` | Remaining account credit balance |
| `picdefense_check_image_risk` | Reverse-image risk analysis + **picrisk** score (core tool) |
| `picdefense_extract_exif` | Extract EXIF metadata (camera, timestamps, GPS) |
| `picdefense_detect_face` | Detect a human face in an image |
| `picdefense_detect_landmark` | Detect a recognizable landmark |
| `picdefense_detect_logo` | Detect a brand logo |
| `picdefense_safesearch` | Content-safety (adult/violence/racy/…) assessment |
| `picdefense_find_backlinks` | Find pages where an image appears |
| `picdefense_detect_labels` | Detect descriptive labels for image contents |

All image tools take a single `url` (a public http/https image URL). **Most tools
consume account credits per call** — use `picdefense_get_credits` to check your balance.

## Authentication

Every request authenticates with your PicDefense **API token**, which is your
**user id and API key joined by a colon**:

```
USERID:APIKEY
```

Find both in your PicDefense.io account settings:
**https://app.picdefense.io/?returnUrl=https://app.picdefense.io/dashboard/settings**

The token is sent as the `X-API-TOKEN` header to the API (`https://app.picdefense.io/api/v2`).

## Quick start

### Hosted server (recommended)

The hosted server runs at **https://mcp.picdefense.io**. Add it to Claude Code:

```bash
# Streamable HTTP (recommended)
claude mcp add -t http picdefense "https://mcp.picdefense.io/mcp" \
  --header "X-API-Token: USERID:APIKEY"

# or SSE
claude mcp add -t sse picdefense "https://mcp.picdefense.io/sse?token=USERID:APIKEY"
```

Quick HTTP smoke test:

```bash
curl -X POST https://mcp.picdefense.io/mcp \
  -H "Content-Type: application/json" \
  -H "X-API-Token: USERID:APIKEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Claude Desktop (hosted)

Claude Desktop launches MCP servers as local commands, so reach the hosted server
through the [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) bridge (requires
Node.js installed). See [`claude_desktop_config.example.json`](claude_desktop_config.example.json):

```json
{
  "mcpServers": {
    "picdefense": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.picdefense.io/sse?token=YOUR_USERID:YOUR_APIKEY"
      ]
    }
  }
}
```

Edit your `claude_desktop_config.json` (Settings → Developer → Edit Config), add the
`mcpServers` block above with your `USERID:APIKEY`, then fully quit and reopen Claude Desktop.

> Testing against a plain-HTTP server (e.g. `http://<host>:6910`) instead of HTTPS?
> `mcp-remote` blocks non-HTTPS origins unless the host is `localhost` — append
> `"--allow-http"` to the `args` array, or reach it over an SSH tunnel to `localhost`.

### Local (stdio) via npx — no clone needed

Run the published package directly. Requires Node.js installed.

```json
{
  "mcpServers": {
    "picdefense": {
      "command": "npx",
      "args": [
        "-y",
        "@picdefenseio/mcp-server",
        "--api-token",
        "USERID:APIKEY"
      ]
    }
  }
}
```

You can also pass the token via the `PICDEFENSE_API_TOKEN` env var instead of `--api-token`.

### Local (stdio) from source

Clone and build, then point Claude Desktop at the built entry point:

```bash
git clone https://github.com/rchanllc/picdefenseio-mcp-server.git
cd picdefenseio-mcp-server
npm install
npm run build
```

Then use `"command": "node"` with `"args": ["/absolute/path/to/dist/index.js", "--api-token", "USERID:APIKEY"]`.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PICDEFENSE_API_TOKEN` | — | `USERID:APIKEY` (stdio only; hosted server reads it per-connection) |
| `PICDEFENSE_API_BASE_URL` | `https://app.picdefense.io/api/v2` | API base URL |
| `PORT` | `6910` | Hosted server listen port |

## Running the hosted server

### Development

```bash
npm run dev:sse        # tsx watch, auto-reload
```

### Production (Docker)

```bash
# via docker compose
docker compose up --build -d

# or the helper script (handles build + health check)
./deploy.sh
```

The container is named `picdefenseio_mcp` and listens on port **6910**.

### HTTP endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check (used by Docker + CI) |
| GET | `/api/info` | Server + transport info |
| GET | `/tools` | List available tools |
| GET | `/docs` | Swagger UI for the underlying API |
| GET | `/sse?token=USERID:APIKEY` | Open an SSE MCP session |
| POST | `/messages?sessionId=<id>` | SSE session message channel |
| POST | `/mcp` | Streamable HTTP MCP (header `X-API-Token`) |

## Self-hosting

There is no CI/CD in this repo — host it yourself. On your server:

```bash
git clone https://github.com/rchanllc/picdefenseio-mcp-server.git
cd picdefenseio-mcp-server
docker compose up --build -d      # or: ./deploy.sh
```

The container is named `picdefenseio_mcp` and listens on **6910**. To update,
`git pull` and re-run `docker compose up --build -d`.

Front it with nginx at `https://mcp.picdefense.io` → `127.0.0.1:6910`
(`proxy_buffering off` and a long read timeout are recommended for the `/sse` path).

## Architecture

```
┌──────────────┐    ┌────────────────────────┐    ┌─────────────────────────┐
│  MCP Client  │───▶│  PicDefense MCP Server │───▶│  PicDefense.io API v2   │
│ (Claude etc.)│    │      (port 6910)       │    │ app.picdefense.io/api/v2│
└──────────────┘    └────────────────────────┘    └─────────────────────────┘
        token (USERID:APIKEY) forwarded as X-API-TOKEN ───────────▶
```

Each connection builds its own API client + MCP server bound to the caller's token,
so the service is multi-tenant and stateless with respect to credentials.

## License

MIT — see [LICENSE](LICENSE).
