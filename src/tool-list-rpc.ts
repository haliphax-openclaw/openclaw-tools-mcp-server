import type { GatewayRpc } from "./gateway-rpc.js";

/** True when the gateway/CLI reports an unsupported RPC method name. */
export function isUnknownMethodGatewayError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /unknown method/i.test(msg);
}

/**
 * Load tool list: prefers `tools.effective` (session-scoped). Older gateways may only expose
 * `tools.catalog` (see OpenClaw gateway protocol docs).
 */
export async function fetchToolListPayload(
  rpc: GatewayRpc,
  sessionKey: string,
): Promise<unknown> {
  try {
    return await rpc.call("tools.effective", { sessionKey });
  } catch (e) {
    if (!isUnknownMethodGatewayError(e)) throw e;
    return await rpc.call("tools.catalog", { includePlugins: true });
  }
}
