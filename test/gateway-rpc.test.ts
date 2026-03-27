import { describe, it, expect } from "vitest";
import { unwrapGatewayRpcResult, httpToWsGatewayUrl } from "../src/gateway-rpc.js";

describe("gateway-rpc", () => {
  describe("httpToWsGatewayUrl", () => {
    it("maps http→ws and https→wss", () => {
      expect(httpToWsGatewayUrl("http://127.0.0.1:18789")).toBe("ws://127.0.0.1:18789");
      expect(httpToWsGatewayUrl("http://127.0.0.1:18789/")).toBe("ws://127.0.0.1:18789");
      expect(httpToWsGatewayUrl("https://gw.example.com/path")).toBe(
        "wss://gw.example.com/path",
      );
    });
  });

  describe("unwrapGatewayRpcResult", () => {
    it("returns undefined for non-objects", () => {
      expect(unwrapGatewayRpcResult(null)).toBeUndefined();
      expect(unwrapGatewayRpcResult(undefined)).toBeUndefined();
      expect(unwrapGatewayRpcResult("x")).toBeUndefined();
    });

    it("returns object payload when present", () => {
      expect(unwrapGatewayRpcResult({ payload: { a: 1 } })).toEqual({ a: 1 });
    });

    it("returns full top object when payload is not an object", () => {
      expect(unwrapGatewayRpcResult({ payload: "nope" })).toEqual({ payload: "nope" });
    });

    it("returns top object when no payload key", () => {
      expect(unwrapGatewayRpcResult({ ok: true, result: 1 })).toEqual({ ok: true, result: 1 });
    });
  });
});
