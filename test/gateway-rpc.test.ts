import { describe, it, expect } from "vitest";
import { httpToWsGatewayUrl } from "../src/gateway-rpc.js";

describe("gateway-rpc", () => {
  it("httpToWsGatewayUrl maps http→ws and https→wss", () => {
    expect(httpToWsGatewayUrl("http://127.0.0.1:18789")).toBe("ws://127.0.0.1:18789");
    expect(httpToWsGatewayUrl("http://127.0.0.1:18789/")).toBe("ws://127.0.0.1:18789");
    expect(httpToWsGatewayUrl("https://gw.example.com/path")).toBe(
      "wss://gw.example.com/path",
    );
  });
});
