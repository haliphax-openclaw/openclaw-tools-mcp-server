import { readFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";
import { httpToWsGatewayUrl } from "./gateway-rpc.js";

export interface Config {
  gateway: { url: string; token: string; wsUrl: string };
  openclawJsonPath: string;
  cacheDir: string;
  defaultSessionKey: string;
  openclawCli: string;
  rpcTimeoutMs: number;
}

export function loadConfig(): Config {
  let file: Partial<{
    gateway: Partial<{ url: string; token: string }>;
    openclawJsonPath: string;
    cacheDir: string;
    defaultSessionKey: string;
    openclawCli: string;
    rpcTimeoutMs: number;
  }> = {};
  try {
    const raw = readFileSync(
      resolve(process.env.OPENCLAW_MCP_CONFIG ?? "openclaw-mcp.json"),
      "utf-8",
    );
    file = JSON.parse(raw);
  } catch {
    // optional file
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

  const wsUrl =
    process.env.OPENCLAW_GATEWAY_WS_URL ?? httpToWsGatewayUrl(url);

  const openclawJsonPath =
    process.env.OPENCLAW_JSON_PATH ??
    process.env.OPENCLAW_OPENCLAW_JSON ??
    file.openclawJsonPath ??
    join(homedir(), ".openclaw", "openclaw.json");

  const cacheDir =
    process.env.OPENCLAW_MCP_CACHE_DIR ??
    file.cacheDir ??
    join(homedir(), ".cache", "openclaw-tools-mcp");

  try {
    mkdirSync(cacheDir, { recursive: true });
  } catch {
    /* ignore */
  }

  const defaultSessionKey =
    process.env.OPENCLAW_SESSION_KEY ??
    file.defaultSessionKey ??
    "main";

  const openclawCli =
    process.env.OPENCLAW_CLI ?? file.openclawCli ?? "openclaw";

  const rpcTimeoutMs =
    Number(process.env.OPENCLAW_GATEWAY_RPC_TIMEOUT_MS) ||
    file.rpcTimeoutMs ||
    30_000;

  return {
    gateway: { url, token, wsUrl },
    openclawJsonPath,
    cacheDir,
    defaultSessionKey,
    openclawCli,
    rpcTimeoutMs,
  };
}
