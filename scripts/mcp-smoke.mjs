#!/usr/bin/env node
/**
 * Spawns dist/index.js over stdio with a mock openclaw CLI; lists tools and calls echo_smoke.
 */
import { chmodSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const mockCli = join(__dirname, "mock-openclaw-gateway.mjs");
chmodSync(mockCli, 0o755);
const cacheDir = mkdtempSync(join(tmpdir(), "openclaw-mcp-smoke-"));

const missingOpenclawJson = join(cacheDir, "no-openclaw.json");

const transport = new StdioClientTransport({
  command: "node",
  args: [join(root, "dist", "index.js")],
  cwd: root,
  env: {
    ...process.env,
    OPENCLAW_GATEWAY_TOKEN: "smoke-token",
    OPENCLAW_GATEWAY_URL: "http://127.0.0.1:18789",
    OPENCLAW_CLI: mockCli,
    OPENCLAW_JSON_PATH: missingOpenclawJson,
    OPENCLAW_MCP_CACHE_DIR: cacheDir,
    OPENCLAW_SESSION_KEY: "main",
    OPENCLAW_GATEWAY_RPC_TIMEOUT_MS: "5000",
    NO_COLOR: "1",
    FORCE_COLOR: "0",
  },
});

const client = new Client({ name: "openclaw-mcp-smoke", version: "0" }, { capabilities: {} });

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  if (!names.includes("echo_smoke")) {
    console.error("FAIL: expected echo_smoke in tools, got:", names);
    process.exitCode = 1;
  } else {
    console.log("OK listTools:", names.join(", "));
  }

  const call = await client.callTool({ name: "echo_smoke", arguments: { msg: "hi" } });
  const text = call.content?.find((c) => c.type === "text")?.text ?? "";
  if (!text.includes("hi") && !text.includes("echoed")) {
    console.error("FAIL: unexpected callTool body:", text);
    process.exitCode = 1;
  } else {
    console.log("OK callTool:", text.slice(0, 200));
  }
} catch (e) {
  console.error("FAIL:", e);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
  rmSync(cacheDir, { recursive: true, force: true });
}

process.exit(process.exitCode ?? 0);
