import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { writeFileSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const baseEnv = { ...process.env };

describe("loadConfig", () => {
  let dir: string;
  let configPath: string;

  beforeEach(() => {
    process.env = { ...baseEnv };
    dir = mkdtempSync(join(tmpdir(), "oc-mcp-cfg-"));
    configPath = join(dir, "openclaw-mcp.json");
  });

  afterEach(() => {
    process.env = { ...baseEnv };
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  it("exits when token is missing", async () => {
    delete process.env.OPENCLAW_GATEWAY_TOKEN;
    process.env.OPENCLAW_MCP_CONFIG = join(dir, "missing.json");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: number) => {
      throw new Error(`exit:${code}`);
    });
    const { loadConfig } = await import("../src/config.js");
    expect(() => loadConfig()).toThrow("exit:1");
    expect(errSpy).toHaveBeenCalled();
    exitSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("reads token and gateway options from env", async () => {
    process.env.OPENCLAW_GATEWAY_TOKEN = "envtok";
    process.env.OPENCLAW_GATEWAY_URL = "http://10.0.0.1:9999";
    process.env.OPENCLAW_GATEWAY_WS_URL = "ws://explicit/ws";
    process.env.OPENCLAW_SESSION_KEY = "agent-1";
    process.env.OPENCLAW_CLI = "/opt/openclaw";
    process.env.OPENCLAW_GATEWAY_RPC_TIMEOUT_MS = "12000";
    process.env.OPENCLAW_JSON_PATH = join(dir, "oc.json");
    process.env.OPENCLAW_MCP_CACHE_DIR = join(dir, "cache");

    const { loadConfig } = await import("../src/config.js");
    const c = loadConfig();

    expect(c.gateway.token).toBe("envtok");
    expect(c.gateway.url).toBe("http://10.0.0.1:9999");
    expect(c.gateway.wsUrl).toBe("ws://explicit/ws");
    expect(c.defaultSessionKey).toBe("agent-1");
    expect(c.openclawCli).toBe("/opt/openclaw");
    expect(c.rpcTimeoutMs).toBe(12000);
    expect(c.openclawJsonPath).toBe(join(dir, "oc.json"));
    expect(c.cacheDir).toBe(join(dir, "cache"));
  });

  it("merges optional openclaw-mcp.json when OPENCLAW_MCP_CONFIG points to it", async () => {
    writeFileSync(
      configPath,
      JSON.stringify({
        gateway: { token: "filetok", url: "https://gw.test/" },
        defaultSessionKey: "fromfile",
        openclawCli: "openclaw-bin",
        rpcTimeoutMs: 777,
      }),
    );
    process.env.OPENCLAW_MCP_CONFIG = configPath;
    delete process.env.OPENCLAW_GATEWAY_TOKEN;

    const { loadConfig } = await import("../src/config.js");
    const c = loadConfig();

    expect(c.gateway.token).toBe("filetok");
    expect(c.gateway.url).toBe("https://gw.test/");
    expect(c.gateway.wsUrl).toBe("wss://gw.test");
    expect(c.defaultSessionKey).toBe("fromfile");
    expect(c.openclawCli).toBe("openclaw-bin");
    expect(c.rpcTimeoutMs).toBe(777);
  });

  it("env overrides file values", async () => {
    writeFileSync(
      configPath,
      JSON.stringify({ gateway: { token: "filetok", url: "http://old/" } }),
    );
    process.env.OPENCLAW_MCP_CONFIG = configPath;
    process.env.OPENCLAW_GATEWAY_TOKEN = "wins";

    const { loadConfig } = await import("../src/config.js");
    const c = loadConfig();
    expect(c.gateway.token).toBe("wins");
    expect(c.gateway.url).toBe("http://old/");
  });
});
