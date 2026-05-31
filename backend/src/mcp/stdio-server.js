#!/usr/bin/env node
/**
 * Curate subscriptions MCP server (stdio transport).
 *
 * Exposes the same tools the in-app agent uses (get_watchlist, get_subscriptions,
 * analyze_coverage, get_service_prices, activate_subscription, cancel_subscription)
 * so a local MCP client — e.g. Claude Code on this machine — can drive real
 * subscription changes for testing, independent of the hosted agent / API key.
 *
 * IMPORTANT: stdio MCP servers must keep stdout clean (JSON-RPC only). All
 * diagnostics go to stderr.
 */
const path = require('path');
// Load backend/.env regardless of the client's working directory.
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

const { MCP_TOOLS, executeTool } = require('./server');

async function connectMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('[curate-mcp] MONGO_URI is not set in backend/.env');
    process.exit(1);
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.error('[curate-mcp] MongoDB connected');
}

async function main() {
  await connectMongo();

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
      // Default to the demo user so callers don't have to pass user_id every time.
      const input = { user_id: 1, ...(args || {}) };
      const result = await executeTool(name, input);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Tool ${name} failed: ${err.message}` }],
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[curate-mcp] stdio server ready — tools:', MCP_TOOLS.map((t) => t.name).join(', '));
}

main().catch((err) => {
  console.error('[curate-mcp] fatal:', err);
  process.exit(1);
});
