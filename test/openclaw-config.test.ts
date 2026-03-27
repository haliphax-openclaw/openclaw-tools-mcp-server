import { describe, it, expect } from "vitest";
import { writeFileSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  parseOpenclawJsonPolicies,
  resolveGatewayToolsHttpPolicy,
} from "../src/openclaw-config.js";
import type { GatewayRpc } from "../src/gateway-rpc.js";

describe("openclaw-config", () => {
  it("parseOpenclawJsonPolicies reads gateway.tools and openclawToolsMcp.allow", () => {
    const raw = JSON.stringify({
      gateway: {
        tools: { allow: ["gateway"], deny: ["browser"] },
      },
      openclawToolsMcp: { allow: ["web_search", "message"] },
    });
    const p = parseOpenclawJsonPolicies(raw);
    expect(p.gatewayTools).toEqual({ allow: ["gateway"], deny: ["browser"] });
    expect(p.mcpToolAllowlist).toEqual(["web_search", "message"]);
  });

  it("parseOpenclawJsonPolicies tolerates missing optional sections", () => {
    expect(parseOpenclawJsonPolicies("{}")).toEqual({
      gatewayTools: undefined,
      mcpToolAllowlist: undefined,
    });
  });

  it("resolveGatewayToolsHttpPolicy uses file when present", async () => {
    const dir = mkdtempSync(join(tmpdir(), "oc-json-"));
    const path = join(dir, "openclaw.json");
    writeFileSync(
      path,
      JSON.stringify({ gateway: { tools: { deny: ["pdf"] } } }),
    );
    const policy = await resolveGatewayToolsHttpPolicy({
      openclawJsonPath: path,
      rpc: null,
    });
    expect(policy).toEqual({ deny: ["pdf"] });
    rmSync(dir, { recursive: true, force: true });
  });

  it("resolveGatewayToolsHttpPolicy falls back to config.get RPC when file missing", async () => {
    const rpc: GatewayRpc = {
      async call(method, params) {
        expect(method).toBe("config.get");
        expect(params).toEqual({});
        return {
          ok: true,
          payload: {
            gateway: { tools: { allow: ["sessions_send"] } },
          },
        };
      },
    };
    const missingPath = join(mkdtempSync(join(tmpdir(), "oc-missing-")), "openclaw.json");
    const policy = await resolveGatewayToolsHttpPolicy({
      openclawJsonPath: missingPath,
      rpc,
    });
    expect(policy).toEqual({ allow: ["sessions_send"] });
  });
});
