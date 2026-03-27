import { describe, it, expect } from "vitest";
import {
  extractToolsFromEffectivePayload,
  applyMcpAllowlist,
} from "../src/effective-tools.js";

describe("effective-tools", () => {
  it("extractToolsFromEffectivePayload reads tools array with name + parameters", () => {
    const payload = {
      tools: [
        {
          name: "web_search",
          description: "Search",
          parameters: { type: "object", properties: { query: { type: "string" } } },
        },
      ],
    };
    const tools = extractToolsFromEffectivePayload(payload);
    expect(tools).toHaveLength(1);
    expect(tools[0]!.name).toBe("web_search");
    expect(tools[0]!.description).toBe("Search");
    expect(tools[0]!.parameters?.properties?.query).toEqual({ type: "string" });
  });

  it("unwraps CLI-style ok/payload wrapper", () => {
    const payload = {
      ok: true,
      payload: {
        tools: [{ name: "pdf", description: "PDF" }],
      },
    };
    const tools = extractToolsFromEffectivePayload(payload);
    expect(tools.map((t) => t.name)).toEqual(["pdf"]);
  });

  it("applyMcpAllowlist returns all tools when allowlist undefined", () => {
    const tools = [{ name: "a" }, { name: "b" }] as ReturnType<
      typeof extractToolsFromEffectivePayload
    >;
    expect(applyMcpAllowlist(tools, undefined)).toEqual(tools);
  });

  it("applyMcpAllowlist filters to named tools when allowlist non-empty", () => {
    const tools = [{ name: "a" }, { name: "b" }, { name: "c" }] as ReturnType<
      typeof extractToolsFromEffectivePayload
    >;
    expect(applyMcpAllowlist(tools, ["b"]).map((t) => t.name)).toEqual(["b"]);
  });
});
