#!/usr/bin/env node
/**
 * PicDefense.io MCP server — stdio transport.
 * Spawned locally by an MCP client (Claude Desktop, Claude Code, Cursor, etc.).
 *
 * Auth: a single PicDefense API token in the form `USERID:APIKEY`.
 *   - CLI:  --api-token USERID:APIKEY   (or -t)
 *   - Env:  PICDEFENSE_API_TOKEN=USERID:APIKEY
 * Optional env: PICDEFENSE_API_BASE_URL (defaults to https://app.picdefense.io/api/v2)
 *
 * For the hosted multi-tenant server (SSE + HTTP), see src/sse-server.ts.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PicDefenseClient } from './client.js';
import { createServer } from './server-factory.js';

const DEFAULT_BASE_URL = 'https://app.picdefense.io/api/v2';

function resolveToken(): string {
  const args = process.argv.slice(2);
  const idx = args.findIndex((a) => a === '--api-token' || a === '-t');
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return process.env.PICDEFENSE_API_TOKEN || '';
}

const token = resolveToken();
if (!token) {
  console.error('Missing PicDefense API token.');
  console.error('Pass --api-token USERID:APIKEY or set PICDEFENSE_API_TOKEN=USERID:APIKEY');
  console.error('Find your API key in your PicDefense.io account settings.');
  process.exit(1);
}

const client = new PicDefenseClient(
  process.env.PICDEFENSE_API_BASE_URL || DEFAULT_BASE_URL,
  token
);

async function main() {
  const server = createServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('PicDefense MCP server failed to start:', err);
  process.exit(1);
});
