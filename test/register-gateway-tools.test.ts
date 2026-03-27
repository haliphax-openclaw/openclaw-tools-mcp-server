import { describe, it, expect, vi } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGatewayToolsAsMcp } from "../src/register-gateway-tools.js";
import type { GatewayToolDescriptor } from "../src/effective-tools.js";
import type { GatewayToolInvoker } from "../src/gateway-tool-invoker.js";

type Captured = {
  name: string;
  meta: { description: string; inputSchema: unknown };
  handler: (args: unknown) => Promise<unknown>;
};

function fakeServer(): { server: McpServer; captured: Captured[] } {
  const captured: Captured[] = [];
  const server = {
    registerTool(name, meta, handler) {
      captured.push({ name, meta, handler });
    },
  } as unknown as McpServer;
  return { server, captured };
}

describe("registerGatewayToolsAsMcp", () => {
  it("dedupes tool names and registers handlers that strip sessionKey for invoke", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, result: { hello: 1 } });
    const invoker = { invoke } as unknown as GatewayToolInvoker;
    const { server, captured } = fakeServer();
    const descriptors: GatewayToolDescriptor[] = [
      { name: "dup", description: "first" },
      { name: "dup", description: "second" },
      { name: "other", description: "o" },
    ];
    registerGatewayToolsAsMcp(server, descriptors, invoker, "default-sk");

    expect(captured.map((c) => c.name)).toEqual(["dup", "other"]);

    const h0 = captured[0]!.handler;
    const out = await h0({ sessionKey: "route-here", foo: "bar" });
    expect(invoke).toHaveBeenCalledWith("dup", { foo: "bar" }, "route-here");
    expect(out).toEqual({
      content: [{ type: "text", text: JSON.stringify({ hello: 1 }, null, 2) }],
    });
  });

  it("uses defaultSessionKey when sessionKey omitted", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, result: "ok" });
    const invoker = { invoke } as unknown as GatewayToolInvoker;
    const { server, captured } = fakeServer();
    registerGatewayToolsAsMcp(server, [{ name: "t" }], invoker, "main");
    await captured[0]!.handler({});
    expect(invoke).toHaveBeenCalledWith("t", {}, "main");
  });

  it("returns isError when invoke fails", async () => {
    const invoke = vi.fn().mockResolvedValue({
      ok: false,
      error: { type: "x", message: "bad" },
    });
    const invoker = { invoke } as unknown as GatewayToolInvoker;
    const { server, captured } = fakeServer();
    registerGatewayToolsAsMcp(server, [{ name: "t" }], invoker, "main");
    const out = await captured[0]!.handler({});
    expect(out).toEqual({
      content: [{ type: "text", text: "Error: bad" }],
      isError: true,
    });
  });

  it("formatInvokeResult prefers details JSON", async () => {
    const invoke = vi.fn().mockResolvedValue({
      ok: true,
      result: { details: { a: 1 } },
    });
    const invoker = { invoke } as unknown as GatewayToolInvoker;
    const { server, captured } = fakeServer();
    registerGatewayToolsAsMcp(server, [{ name: "t" }], invoker, "main");
    const out = (await captured[0]!.handler({})) as {
      content: Array<{ type: string; text: string }>;
    };
    expect(out.content[0]!.text).toBe(JSON.stringify({ a: 1 }, null, 2));
  });

  it("formatInvokeResult joins text content parts", async () => {
    const invoke = vi.fn().mockResolvedValue({
      ok: true,
      result: {
        content: [
          { type: "text", text: "a" },
          { type: "text", text: "b" },
        ],
      },
    });
    const invoker = { invoke } as unknown as GatewayToolInvoker;
    const { server, captured } = fakeServer();
    registerGatewayToolsAsMcp(server, [{ name: "t" }], invoker, "main");
    const out = (await captured[0]!.handler({})) as {
      content: Array<{ type: string; text: string }>;
    };
    expect(out.content[0]!.text).toBe("a\nb");
  });

  it("formatInvokeResult returns plain string results verbatim", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, result: "plain" });
    const invoker = { invoke } as unknown as GatewayToolInvoker;
    const { server, captured } = fakeServer();
    registerGatewayToolsAsMcp(server, [{ name: "t" }], invoker, "main");
    const out = (await captured[0]!.handler({})) as {
      content: Array<{ type: string; text: string }>;
    };
    expect(out.content[0]!.text).toBe("plain");
  });
});
