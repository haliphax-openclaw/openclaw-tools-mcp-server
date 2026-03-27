import { describe, it, expect, vi } from "vitest";
import { GatewayToolInvoker } from "../src/gateway-tool-invoker.js";

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: HeadersInit } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
}

describe("GatewayToolInvoker", () => {
  it("POSTs to /tools/invoke on gateway origin and maps ok/result/error", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: false,
        error: { type: "tool_error", message: "nope" },
      }),
    );
    const invoker = new GatewayToolInvoker({
      baseUrl: "http://127.0.0.1:18789/",
      token: "tok",
      fetchFn,
    });
    const res = await invoker.invoke("web_search", { q: "x" }, "sess");
    expect(res).toEqual({
      ok: false,
      result: undefined,
      error: { type: "tool_error", message: "nope" },
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("http://127.0.0.1:18789/tools/invoke");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)?.Authorization).toBe("Bearer tok");
    expect(JSON.parse(init?.body as string)).toEqual({
      tool: "web_search",
      args: { q: "x" },
      sessionKey: "sess",
    });
  });

  it("omits sessionKey in JSON body when not provided", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ ok: true, result: null }));
    const invoker = new GatewayToolInvoker({
      baseUrl: "https://gw.example.com/prefix/ignored",
      token: "t",
      fetchFn,
    });
    await invoker.invoke("tool", { x: 1 });
    expect(fetchFn.mock.calls[0]![0]).toBe("https://gw.example.com/tools/invoke");
    expect(JSON.parse(fetchFn.mock.calls[0]![1]!.body as string)).toEqual({
      tool: "tool",
      args: { x: 1 },
    });
  });

  it("maps HTTP error status using JSON error body when present", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ ok: false, error: { type: "bad_request", message: "invalid" } }, {
          status: 400,
        }),
      );
    const invoker = new GatewayToolInvoker({
      baseUrl: "http://h:1",
      token: "t",
      fetchFn,
    });
    const res = await invoker.invoke("t", {});
    expect(res.ok).toBe(false);
    expect(res.error).toEqual({ type: "bad_request", message: "invalid" });
  });

  it("uses http_error when status not ok and body has no structured error", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("nope", { status: 502 }));
    const invoker = new GatewayToolInvoker({
      baseUrl: "http://h:1",
      token: "t",
      fetchFn,
    });
    const res = await invoker.invoke("t", {});
    expect(res).toMatchObject({
      ok: false,
      error: { type: "http_error", message: "HTTP 502" },
    });
  });

  it("returns network_error when fetch throws", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const invoker = new GatewayToolInvoker({
      baseUrl: "http://127.0.0.1:18789",
      token: "t",
      fetchFn,
    });
    const res = await invoker.invoke("t", {});
    expect(res.ok).toBe(false);
    expect(res.error).toEqual({ type: "network_error", message: "ECONNREFUSED" });
  });
});
