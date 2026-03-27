import { describe, it, expect } from "vitest";
import {
  extractToolsFromEffectivePayload,
  applyMcpAllowlist,
  parametersToZodShape,
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

  it("extractToolsFromEffectivePayload reads effectiveTools and items arrays", () => {
    expect(
      extractToolsFromEffectivePayload({
        effectiveTools: [{ name: "e1" }],
      }).map((t) => t.name),
    ).toEqual(["e1"]);
    expect(
      extractToolsFromEffectivePayload({
        items: [{ name: "i1", inputSchema: { type: "object", properties: {} } }],
      })[0]!.parameters,
    ).toEqual({ type: "object", properties: {} });
  });

  it("extractToolsFromEffectivePayload flattens protocol groups (id/label)", () => {
    const tools = extractToolsFromEffectivePayload({
      ok: true,
      payload: {
        agentId: "agent",
        profile: "full",
        groups: [
          {
            id: "core",
            label: "Core",
            source: "core",
            tools: [
              { id: "web_search", label: "Web search", description: "Search the web" },
            ],
          },
        ],
      },
    });
    expect(tools).toHaveLength(1);
    expect(tools[0]!.name).toBe("web_search");
    expect(tools[0]!.description).toBe("Search the web");
  });

  it("parametersToZodShape adds optional sessionKey when parameters missing", () => {
    const shape = parametersToZodShape(undefined);
    expect(Object.keys(shape)).toEqual(["sessionKey"]);
  });

  it("parametersToZodShape maps JSON schema property types", () => {
    const shape = parametersToZodShape({
      type: "object",
      properties: {
        n: { type: "number", description: "num" },
        f: { type: "boolean" },
        a: { type: "array" },
        s: { type: "string" },
        d: {},
      },
      required: ["s"],
    });
    expect(shape.n).toBeDefined();
    expect(shape.f).toBeDefined();
    expect(shape.a).toBeDefined();
    expect(shape.s).toBeDefined();
    expect(shape.d).toBeDefined();
    expect(shape.sessionKey).toBeDefined();
  });
});
