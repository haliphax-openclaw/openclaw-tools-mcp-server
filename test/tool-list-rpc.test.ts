import { describe, it, expect } from "vitest";
import {
  fetchToolListPayload,
  isUnknownMethodGatewayError,
} from "../src/tool-list-rpc.js";
import type { GatewayRpc } from "../src/gateway-rpc.js";

describe("tool-list-rpc", () => {
  it("isUnknownMethodGatewayError matches CLI-style messages", () => {
    expect(
      isUnknownMethodGatewayError(
        new Error("Gateway call failed: GatewayClientRequestError: unknown method: tools.effective"),
      ),
    ).toBe(true);
    expect(isUnknownMethodGatewayError(new Error("network down"))).toBe(false);
  });

  it("fetchToolListPayload uses tools.effective when it succeeds", async () => {
    const rpc: GatewayRpc = {
      async call(method, params) {
        expect(method).toBe("tools.effective");
        expect(params).toEqual({ sessionKey: "main" });
        return { tools: [{ name: "x" }] };
      },
    };
    const payload = await fetchToolListPayload(rpc, "main");
    expect(payload).toEqual({ tools: [{ name: "x" }] });
  });

  it("fetchToolListPayload falls back to tools.catalog on unknown method", async () => {
    const calls: string[] = [];
    const rpc: GatewayRpc = {
      async call(method) {
        calls.push(method);
        if (method === "tools.effective") {
          throw new Error("unknown method: tools.effective");
        }
        if (method === "tools.catalog") {
          return {
            groups: [
              {
                tools: [{ id: "pdf", label: "PDF", description: "Read PDFs" }],
              },
            ],
          };
        }
        throw new Error("unexpected");
      },
    };
    const payload = await fetchToolListPayload(rpc, "main");
    expect(calls).toEqual(["tools.effective", "tools.catalog"]);
    expect(payload).toMatchObject({ groups: expect.any(Array) });
  });
});
