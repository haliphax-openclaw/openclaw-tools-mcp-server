import { unwrapGatewayRpcResult } from "./gateway-rpc.js";
import type { GatewayRpc } from "./gateway-rpc.js";

export interface InvokeResult {
  ok: boolean;
  result?: unknown;
  error?: { type: string; message: string };
}

/**
 * Invokes OpenClaw gateway tools via `openclaw gateway call tools.invoke` (WebSocket RPC).
 */
export class GatewayToolInvoker {
  constructor(private readonly rpc: GatewayRpc) {}

  async invoke(
    tool: string,
    args: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<InvokeResult> {
    const params: Record<string, unknown> = {
      tool,
      args: args ?? {},
    };
    if (sessionKey) params.sessionKey = sessionKey;

    try {
      const raw = await this.rpc.call("tools.invoke", params);
      const top = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
      if (top && typeof top.ok === "boolean") {
        return {
          ok: top.ok,
          result: top.result,
          error: top.error as { type: string; message: string } | undefined,
        };
      }

      const inner = unwrapGatewayRpcResult(raw);
      if (inner && typeof inner.ok === "boolean") {
        return {
          ok: inner.ok,
          result: inner.result,
          error: inner.error as { type: string; message: string } | undefined,
        };
      }

      return { ok: true, result: raw };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: { type: "rpc_error", message: msg } };
    }
  }
}
