#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { fetchFilteredEffectiveTools } from "./dynamic-tools.js";
import { OpenclawCliGatewayRpc } from "./gateway-rpc.js";
import { GatewayToolInvoker } from "./gateway-tool-invoker.js";
import {
  resolveGatewayToolsHttpPolicy,
  loadMcpAllowlistFromOpenclawJsonPath,
} from "./openclaw-config.js";
import { registerGatewayToolsAsMcp } from "./register-gateway-tools.js";

const config = loadConfig();

const rpc = new OpenclawCliGatewayRpc({
  cliPath: config.openclawCli,
  wsUrl: config.gateway.wsUrl,
  token: config.gateway.token,
  timeoutMs: config.rpcTimeoutMs,
});

const [httpPolicy, mcpAllowlist] = await Promise.all([
  resolveGatewayToolsHttpPolicy({
    openclawJsonPath: config.openclawJsonPath,
    rpc,
  }),
  Promise.resolve(loadMcpAllowlistFromOpenclawJsonPath(config.openclawJsonPath)),
]);

const descriptors = await fetchFilteredEffectiveTools({
  rpc,
  sessionKey: config.defaultSessionKey,
  httpPolicy,
  mcpAllowlist,
  cacheDir: config.cacheDir,
});

if (descriptors.length === 0) {
  console.error(
    "Warning: no OpenClaw gateway tools to expose after HTTP policy + allowlist filters.",
  );
}

const server = new McpServer({
  name: "openclaw-tools",
  version: "2.0.0",
});

const invoker = new GatewayToolInvoker({
  baseUrl: config.gateway.url,
  token: config.gateway.token,
  timeoutMs: config.rpcTimeoutMs,
});
registerGatewayToolsAsMcp(
  server,
  descriptors,
  invoker,
  config.defaultSessionKey,
);

const transport = new StdioServerTransport();
await server.connect(transport);
