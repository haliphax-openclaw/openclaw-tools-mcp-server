import { readFileSync } from "fs";
import { resolve } from "path";

export interface Config {
  gateway: { url: string; token: string };
  tools: string[];
  customTools: string[];
}

const DEFAULT_TOOLS = [
  "web_search",
  "web_fetch",
  "browser",
  "pdf",
  "message",
  "canvas",
  "sessions_send",
];

export function loadConfig(): Config {
  let file: Partial<{
    gateway: Partial<Config["gateway"]>;
    tools: string[];
    customTools: string[];
  }> = {};
  try {
    const raw = readFileSync(
      resolve(process.env.OPENCLAW_MCP_CONFIG ?? "openclaw-mcp.json"),
      "utf-8",
    );
    file = JSON.parse(raw);
  } catch {
    // no config file — rely on env vars
  }

  const token =
    process.env.OPENCLAW_GATEWAY_TOKEN ?? file.gateway?.token ?? "";
  if (!token) {
    console.error(
      "Error: OPENCLAW_GATEWAY_TOKEN is required (env var or config file)",
    );
    process.exit(1);
  }

  const url =
    process.env.OPENCLAW_GATEWAY_URL ??
    file.gateway?.url ??
    "http://127.0.0.1:18789";

  const tools = process.env.OPENCLAW_MCP_TOOLS
    ? process.env.OPENCLAW_MCP_TOOLS.split(",").map((t) => t.trim())
    : file.tools ?? DEFAULT_TOOLS;

  const customTools = process.env.OPENCLAW_MCP_CUSTOM_TOOLS
    ? process.env.OPENCLAW_MCP_CUSTOM_TOOLS.split(",").map((t) => t.trim())
    : file.customTools ?? [];

  return { gateway: { url, token }, tools, customTools };
}
