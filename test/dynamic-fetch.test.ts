import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { fetchFilteredEffectiveTools } from "../src/dynamic-tools.js";
import type { GatewayRpc } from "../src/gateway-rpc.js";

describe("fetchFilteredEffectiveTools", () => {
  let cacheDir: string;

  beforeEach(() => {
    cacheDir = mkdtempSync(join(tmpdir(), "oc-dyn-"));
  });

  afterEach(() => {
    rmSync(cacheDir, { recursive: true, force: true });
  });

  it("filters HTTP-denied tools and applies MCP allowlist", async () => {
    const rpc: GatewayRpc = {
      async call(method, params) {
        expect(method).toBe("tools.effective");
        expect(params).toEqual({ sessionKey: "main" });
        return {
          tools: [
            { name: "web_search", description: "Search" },
            { name: "sessions_spawn", description: "Spawn" },
            { name: "browser", description: "Browse" },
          ],
        };
      },
    };

    const tools = await fetchFilteredEffectiveTools({
      rpc,
      sessionKey: "main",
      httpPolicy: { deny: ["browser"] },
      mcpAllowlist: ["web_search", "browser"],
      cacheDir,
    });

    expect(tools.map((t) => t.name).sort()).toEqual(["web_search"].sort());
  });

  it("falls back to tools.catalog when tools.effective is unknown", async () => {
    let n = 0;
    const rpc: GatewayRpc = {
      async call(method) {
        n++;
        if (method === "tools.effective") {
          throw new Error("GatewayClientRequestError: unknown method: tools.effective");
        }
        if (method === "tools.catalog") {
          return {
            groups: [{ tools: [{ id: "web_search", label: "Search", description: "" }] }],
          };
        }
        throw new Error("bad method");
      },
    };

    const tools = await fetchFilteredEffectiveTools({
      rpc,
      sessionKey: "legacy",
      httpPolicy: {},
      mcpAllowlist: undefined,
      cacheDir,
    });
    expect(n).toBe(2);
    expect(tools.map((t) => t.name)).toEqual(["web_search"]);
  });

  it("reuses disk cache on second call (no second RPC)", async () => {
    let calls = 0;
    const rpc: GatewayRpc = {
      async call(method) {
        calls++;
        expect(method).toBe("tools.effective");
        return { tools: [{ name: "pdf", description: "PDF" }] };
      },
    };

    const a = await fetchFilteredEffectiveTools({
      rpc,
      sessionKey: "sk1",
      httpPolicy: {},
      mcpAllowlist: undefined,
      cacheDir,
    });
    const b = await fetchFilteredEffectiveTools({
      rpc,
      sessionKey: "sk1",
      httpPolicy: {},
      mcpAllowlist: undefined,
      cacheDir,
    });

    expect(a).toEqual(b);
    expect(calls).toBe(1);
  });
});
