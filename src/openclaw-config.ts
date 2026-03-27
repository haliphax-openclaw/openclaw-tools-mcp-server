import { readFileSync, existsSync } from "fs";
import type { GatewayToolsHttpPolicy } from "./http-tool-policy.js";
import type { GatewayRpc } from "./gateway-rpc.js";

export interface ParsedOpenclawPolicies {
  gatewayTools?: GatewayToolsHttpPolicy;
  /** Optional MCP-bridge subset: only these gateway tool names are advertised as MCP tools. */
  mcpToolAllowlist?: string[];
}

export function parseOpenclawJsonPolicies(raw: string): ParsedOpenclawPolicies {
  let root: Record<string, unknown>;
  try {
    root = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
  const gateway = root.gateway as Record<string, unknown> | undefined;
  const gatewayTools = gateway?.tools as GatewayToolsHttpPolicy | undefined;
  const mcp = root.openclawToolsMcp as Record<string, unknown> | undefined;
  const allow = mcp?.allow;
  const mcpToolAllowlist = Array.isArray(allow)
    ? allow.filter((x): x is string => typeof x === "string")
    : undefined;
  return {
    gatewayTools:
      gatewayTools && typeof gatewayTools === "object" ? { ...gatewayTools } : undefined,
    mcpToolAllowlist:
      mcpToolAllowlist && mcpToolAllowlist.length > 0 ? mcpToolAllowlist : undefined,
  };
}

function unwrapRpcPayload(res: unknown): unknown {
  if (!res || typeof res !== "object") return res;
  const o = res as Record<string, unknown>;
  if (o.ok === true && "payload" in o) return o.payload;
  return res;
}

export async function resolveGatewayToolsHttpPolicy(options: {
  openclawJsonPath: string;
  rpc: GatewayRpc | null;
}): Promise<GatewayToolsHttpPolicy> {
  if (existsSync(options.openclawJsonPath)) {
    try {
      const raw = readFileSync(options.openclawJsonPath, "utf8");
      const parsed = parseOpenclawJsonPolicies(raw);
      if (parsed.gatewayTools) return parsed.gatewayTools;
    } catch {
      /* fall through */
    }
  }

  if (!options.rpc) return {};

  const res = await options.rpc.call("config.get", {});
  const payload = unwrapRpcPayload(res) as Record<string, unknown> | null;
  const gateway = payload?.gateway as Record<string, unknown> | undefined;
  const tools = gateway?.tools as GatewayToolsHttpPolicy | undefined;
  return tools && typeof tools === "object" ? { ...tools } : {};
}

export function loadMcpAllowlistFromOpenclawJsonPath(path: string): string[] | undefined {
  if (!existsSync(path)) return undefined;
  try {
    const raw = readFileSync(path, "utf8");
    return parseOpenclawJsonPolicies(raw).mcpToolAllowlist;
  } catch {
    return undefined;
  }
}
