#!/usr/bin/env node
/**
 * Curate subscriptions MCP server — Streamable HTTP transport (Cloud Run).
 *
 * Same tools as the stdio server (get_watchlist, get_subscriptions,
 * analyze_coverage, get_service_prices, activate/cancel_subscription) but
 * reachable over HTTP so a hosted agent (e.g. Claude on Vertex AI) can call it.
 *
 * Stateless: a fresh Server + transport is created per request, which suits
 * Cloud Run's autoscaling (no sticky sessions). Hardened with a shared-secret
 * header — set MCP_API_KEY and send it as `x-api-key`.
 *
 * Env:
 *   PORT          (Cloud Run injects this; default 8080)
 *   MONGO_URI     Atlas connection string
 *   MCP_API_KEY   shared secret required on every /mcp call (optional but
 *                 STRONGLY recommended before exposing publicly)
 *   DEFAULT_USER_ID  fallback user when a tool call omits user_id
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const express = require('express');
const mongoose = require('mongoose');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

const { MCP_TOOLS, executeTool } = require('./server');

const PORT = process.env.PORT || 8080;
const API_KEY = process.env.MCP_API_KEY || '';
const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || '1';

async function connectMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('[curate-mcp-http] MONGO_URI is not set');
    process.exit(1);
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.error('[curate-mcp-http] MongoDB connected');
}

// Build a fresh MCP Server wired to our tools (one per request, stateless).
function buildServer() {
  const server = new Server(
    { name: 'curate-subscriptions', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: MCP_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.input_schema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    try {
      const input = { user_id: DEFAULT_USER_ID, ...(args || {}) };
      const result = await executeTool(name, input);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: 'text', text: `Tool ${name} failed: ${err.message}` }] };
    }
  });

  return server;
}

async function main() {
  await connectMongo();

  const app = express();
  app.use(express.json());

  // Liveness probe for Cloud Run.
  app.get('/healthz', (_req, res) => res.json({ ok: true }));

  // Optional shared-secret gate. No key configured = open (local/dev only).
  app.use('/mcp', (req, res, next) => {
    if (API_KEY && req.get('x-api-key') !== API_KEY) {
      return res.status(401).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized' }, id: null });
    }
    next();
  });

  // Stateless Streamable HTTP: new Server + transport per request, closed after.
  app.post('/mcp', async (req, res) => {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { transport.close(); server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error('[curate-mcp-http] request error:', err);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null });
      }
    }
  });

  // GET/DELETE aren't used in stateless mode — reply method-not-allowed.
  const methodNotAllowed = (_req, res) =>
    res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null });
  app.get('/mcp', methodNotAllowed);
  app.delete('/mcp', methodNotAllowed);

  app.listen(PORT, () => {
    console.error(`[curate-mcp-http] listening on :${PORT} — tools: ${MCP_TOOLS.map((t) => t.name).join(', ')}`);
    console.error(`[curate-mcp-http] auth: ${API_KEY ? 'x-api-key required' : 'OPEN (set MCP_API_KEY before exposing)'}`);
  });
}

main().catch((err) => {
  console.error('[curate-mcp-http] fatal:', err);
  process.exit(1);
});
