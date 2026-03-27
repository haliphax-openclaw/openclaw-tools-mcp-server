import { describe, it, expect } from "vitest";
import { GatewayToolInvoker } from "../src/gateway-tool-invoker.js";
import type { GatewayRpc } from "../src/gateway-rpc.js";

function rpcFrom(
  fn: (method: string, params: Record<string, unknown>) => Promise<unknown>,
): GatewayRpc {
  return { call: fn };
}

describe("GatewayToolInvoker", () => {
  it("maps top-level ok/result/error from tools.invoke", async () => {
    const invoker = new GatewayToolInvoker(
      rpcFrom(async () => ({
        ok: false,
        error: { type: "tool_error", message: "nope" },
      })),
    );
    const res = await invoker.invoke("web_search", { q: "x" }, "sess");
    expect(res).toEqual({
      ok: false,
      result: undefined,
      error: { type: "tool_error", message: "nope" },
    });
  });

  it("uses top-level ok/result when ok is boolean (does not read nested payload)", async () => {
    const invoker = new GatewayToolInvoker(
      rpcFrom(async () => ({
        ok: true,
        payload: { ok: true, result: { details: { x: 1 } } },
      })),
    );
    const res = await invoker.invoke("t", {});
    expect(res.ok).toBe(true);
    expect(res.result).toBeUndefined();
  });

  it("reads ok from inner payload object", async () => {
    const invoker = new GatewayToolInvoker(
      rpcFrom(async () => ({
        payload: { ok: true, result: "inner" },
      })),
    );
    const res = await invoker.invoke("t", { a: 1 }, "sk");
    expect(res).toEqual({ ok: true, result: "inner", error: undefined });
  });

  it("omits sessionKey when not provided", async () => {
    let seen: Record<string, unknown> | undefined;
    const invoker = new GatewayToolInvoker(
      rpcFrom(async (_m, params) => {
        seen = params;
        return { ok: true, result: null };
      }),
    );
    await invoker.invoke("tool", { x: 1 });
    expect(seen).toEqual({ tool: "tool", args: { x: 1 } });
  });

  it("includes sessionKey in RPC params when provided", async () => {
    let seen: Record<string, unknown> | undefined;
    const invoker = new GatewayToolInvoker(
      rpcFrom(async (_m, params) => {
        seen = params;
        return { ok: true };
      }),
    );
    await invoker.invoke("tool", {}, "my-session");
    expect(seen).toEqual({ tool: "tool", args: {}, sessionKey: "my-session" });
  });

  it("treats unrecognized shapes as success with raw result", async () => {
    const invoker = new GatewayToolInvoker(
      rpcFrom(async () => ({ notOkShape: true })),
    );
    const res = await invoker.invoke("t", {});
    expect(res).toEqual({ ok: true, result: { notOkShape: true } });
  });

  it("returns rpc_error when call throws", async () => {
    const invoker = new GatewayToolInvoker(
      rpcFrom(async () => {
        throw new Error("spawn failed");
      }),
    );
    const res = await invoker.invoke("t", {});
    expect(res.ok).toBe(false);
    expect(res.error).toEqual({ type: "rpc_error", message: "spawn failed" });
  });

  it("stringifies non-Error throws", async () => {
    const invoker = new GatewayToolInvoker(
      rpcFrom(async () => {
        throw "boom";
      }),
    );
    const res = await invoker.invoke("t", {});
    expect(res.ok).toBe(false);
    expect(res.error?.message).toBe("boom");
  });
});
