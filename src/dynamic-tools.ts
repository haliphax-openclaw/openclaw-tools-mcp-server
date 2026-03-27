import type { GatewayRpc } from "./gateway-rpc.js";
import { readEffectiveCache, writeEffectiveCache } from "./effective-tools-cache.js";
import {
  applyMcpAllowlist,
  extractToolsFromEffectivePayload,
  type GatewayToolDescriptor,
} from "./effective-tools.js";
import { filterHttpInvokableToolNames } from "./http-tool-policy.js";
import type { GatewayToolsHttpPolicy } from "./http-tool-policy.js";
import { fetchToolListPayload } from "./tool-list-rpc.js";

export async function fetchFilteredEffectiveTools(opts: {
  rpc: GatewayRpc;
  sessionKey: string;
  httpPolicy: GatewayToolsHttpPolicy | undefined;
  mcpAllowlist: string[] | undefined;
  cacheDir: string;
}): Promise<GatewayToolDescriptor[]> {
  let payload: unknown = readEffectiveCache(opts.cacheDir, opts.sessionKey);
  if (payload === undefined) {
    payload = await fetchToolListPayload(opts.rpc, opts.sessionKey);
    writeEffectiveCache(opts.cacheDir, opts.sessionKey, payload);
  }

  let tools = extractToolsFromEffectivePayload(payload);
  tools = applyMcpAllowlist(tools, opts.mcpAllowlist);
  const allowedNames = new Set(
    filterHttpInvokableToolNames(
      tools.map((t) => t.name),
      opts.httpPolicy,
    ),
  );
  return tools.filter((t) => allowedNames.has(t.name));
}
