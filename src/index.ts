#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { GatewayClient } from "./gateway.js";
import { registerTools } from "./tools/index.js";
import { loadCustomTools } from "./custom-tools.js";

const config = loadConfig();
const gateway = new GatewayClient(config.gateway);

const server = new McpServer({
  name: "openclaw-tools",
  version: "1.0.0",
});

registerTools(server, gateway, config.tools);
loadCustomTools(config.customTools, server, gateway);

const transport = new StdioServerTransport();
await server.connect(transport);
