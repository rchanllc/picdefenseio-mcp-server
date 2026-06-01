#!/usr/bin/env node
/**
 * PicDefense.io MCP server — hosted HTTP service exposing two transports:
 *   - SSE:  GET /sse?token=USERID:APIKEY   (+ POST /messages?sessionId=...)
 *   - HTTP: POST /mcp   with header  X-API-Token: USERID:APIKEY   (stateless)
 *
 * Multi-tenant: each connection carries its own PicDefense token, so a fresh
 * MCP server + API client is built per session. The service holds no API keys.
 *
 * Listens on PORT (default 6910). Designed to sit behind nginx at
 * https://mcp.picdefense.io.
 */

import express, { type Request, type Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { PicDefenseClient } from './client.js';
import { createServer, SERVER_NAME, SERVER_VERSION } from './server-factory.js';

const PORT = Number(process.env.PORT || 6910);
const BASE_URL = process.env.PICDEFENSE_API_BASE_URL || 'https://app.picdefense.io/api/v2';

const __dirname = dirname(fileURLToPath(import.meta.url));
const swaggerDocument = JSON.parse(readFileSync(join(__dirname, 'swagger.json'), 'utf-8'));

const TOOLS = [
  ['picdefense_get_credits', 'Remaining account credit balance'],
  ['picdefense_check_image_risk', 'Reverse-image risk analysis + picrisk score'],
  ['picdefense_extract_exif', 'Extract EXIF metadata from an image'],
  ['picdefense_detect_face', 'Detect a human face in an image'],
  ['picdefense_detect_landmark', 'Detect a landmark in an image'],
  ['picdefense_detect_logo', 'Detect a brand logo in an image'],
  ['picdefense_safesearch', 'Content-safety (SafeSearch) assessment'],
  ['picdefense_find_backlinks', 'Find pages where an image appears'],
  ['picdefense_detect_labels', 'Detect descriptive labels in an image'],
];

const app = express();
app.use(cors());
app.use(express.json());

// Active SSE transports, keyed by session id.
const transports: Record<string, SSEServerTransport> = {};

function readToken(req: Request): string {
  return (
    (req.query.token as string) ||
    (req.query.apiKey as string) || // legacy alias
    (req.headers['x-api-token'] as string) ||
    ''
  );
}

// --- Health & discovery ---

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', server: SERVER_NAME, version: SERVER_VERSION });
});

app.get('/api/info', (_req: Request, res: Response) => {
  res.json({
    server: SERVER_NAME,
    version: SERVER_VERSION,
    transport: 'SSE + HTTP',
    api: BASE_URL,
    auth: 'PicDefense token in the form USERID:APIKEY',
    endpoints: {
      sse: 'GET /sse?token=USERID:APIKEY',
      messages: 'POST /messages?sessionId=<id>',
      http: 'POST /mcp with header X-API-Token: USERID:APIKEY',
      health: 'GET /health',
      docs: 'GET /docs',
    },
    note: 'Most tools consume account credits per call.',
  });
});

app.get('/tools', (_req: Request, res: Response) => {
  res.json({ tools: TOOLS.map(([name, description]) => ({ name, description })) });
});

app.get('/setup/claude-code-config', (_req: Request, res: Response) => {
  res.json({
    sse: 'claude mcp add -t sse picdefense "https://mcp.picdefense.io/sse?token=USERID:APIKEY"',
    http: 'claude mcp add -t http picdefense "https://mcp.picdefense.io/mcp" --header "X-API-Token: USERID:APIKEY"',
    note: 'Replace USERID:APIKEY with your PicDefense.io user id and API key, colon-separated.',
  });
});

// --- Docs ---
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/', (_req: Request, res: Response) => res.redirect('/docs'));

// --- SSE transport ---

app.get('/sse', async (req: Request, res: Response) => {
  const token = readToken(req);
  if (!token) {
    res.status(401).json({ error: 'Missing token. Use /sse?token=USERID:APIKEY' });
    return;
  }

  const transport = new SSEServerTransport('/messages', res);
  transports[transport.sessionId] = transport;
  res.on('close', () => {
    delete transports[transport.sessionId];
  });

  const client = new PicDefenseClient(BASE_URL, token);
  const server = createServer(client);
  await server.connect(transport);
});

app.post('/messages', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  if (!transport) {
    res.status(400).json({ error: 'No active SSE session for the given sessionId' });
    return;
  }
  await transport.handlePostMessage(req, res, req.body);
});

// --- Streamable HTTP transport (stateless) ---

app.post('/mcp', async (req: Request, res: Response) => {
  const token = readToken(req);
  if (!token) {
    res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Missing token. Set the X-API-Token header (USERID:APIKEY).' },
      id: null,
    });
    return;
  }

  try {
    const client = new PicDefenseClient(BASE_URL, token);
    const server = createServer(client);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on('close', () => {
      transport.close();
      server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('Error handling /mcp request:', err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`${SERVER_NAME} v${SERVER_VERSION} listening on :${PORT}`);
  console.log(`  SSE:   GET  /sse?token=USERID:APIKEY`);
  console.log(`  HTTP:  POST /mcp  (header X-API-Token: USERID:APIKEY)`);
  console.log(`  Docs:  GET  /docs   Health: GET /health`);
  console.log(`  API:   ${BASE_URL}`);
});
