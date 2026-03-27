import { readFileSync } from "fs";
import { resolve } from "path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import type { GatewayClient } from "./gateway.js";

/**
 * JSON tool definition file format:
 *
 * Single tool:
 * { "name": "room_join", "description": "...", "parameters": { "type": "object", "properties": {...}, "required": [...] } }
 *
 * Multiple tools:
 * { "tools": [ { "name": "...", ... }, ... ] }
 */

interface JsonToolDef {
  name: string;
  description: string;
  parameters?: {
    type: "object";
    properties?: Record<string, JsonPropDef>;
    required?: string[];
  };
}

interface JsonPropDef {
  type: string;
  description?: string;
  enum?: string[];
  items?: { type: string };
}

function jsonPropToZod(prop: JsonPropDef): z.ZodTypeAny {
  let schema: z.ZodTypeAny;
  switch (prop.type) {
    case "number":
    case "integer":
      schema = z.number();
      break;
    case "boolean":
      schema = z.boolean();
      break;
    case "array":
      schema = z.array(
        prop.items?.type === "number" ? z.number() : z.string(),
      );
      break;
    default:
      schema = prop.enum ? z.enum(prop.enum as [string, ...string[]]) : z.string();
  }
  return prop.description ? schema.describe(prop.description) : schema;
}

function jsonSchemaToZod(def: JsonToolDef): ZodRawShape {
  const shape: ZodRawShape = {};
  const props = def.parameters?.properties ?? {};
  const required = new Set(def.parameters?.required ?? []);

  for (const [key, prop] of Object.entries(props)) {
    const field = jsonPropToZod(prop);
    shape[key] = required.has(key) ? field : field.optional();
  }

  shape.sessionKey = z
    .string()
    .optional()
    .describe("OpenClaw session key for routing");

  return shape;
}

export function loadCustomTools(
  paths: string[],
  server: McpServer,
  gateway: GatewayClient,
): number {
  let count = 0;

  for (const p of paths) {
    const fullPath = resolve(p);
    let raw: string;
    try {
      raw = readFileSync(fullPath, "utf-8");
    } catch (err: any) {
      console.error(`Warning: could not read custom tool file ${fullPath}: ${err.message}`);
      continue;
    }

    let defs: JsonToolDef[];
    try {
      const parsed = JSON.parse(raw);
      defs = Array.isArray(parsed.tools) ? parsed.tools : [parsed];
    } catch (err: any) {
      console.error(`Warning: invalid JSON in ${fullPath}: ${err.message}`);
      continue;
    }

    for (const def of defs) {
      if (!def.name) continue;
      const shape = jsonSchemaToZod(def);
      const inputSchema = z.object(shape).passthrough();

      server.registerTool(
        def.name,
        { description: def.description ?? def.name, inputSchema },
        async (args) => {
          const params = { ...(args as Record<string, unknown>) };
          const sessionKey = params.sessionKey as string | undefined;
          delete params.sessionKey;

          const res = await gateway.invoke(def.name, params, sessionKey);

          if (!res.ok) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error: ${res.error?.message ?? "Unknown gateway error"}`,
                },
              ],
              isError: true,
            };
          }

          const result = res.result as Record<string, unknown> | undefined;
          let text: string;
          if (result && typeof result === "object" && "details" in result) {
            text = JSON.stringify(result.details, null, 2);
          } else if (
            result &&
            typeof result === "object" &&
            "content" in result &&
            Array.isArray(result.content)
          ) {
            const parts = (
              result.content as Array<{ type: string; text?: string }>
            )
              .filter((c) => c.type === "text" && c.text)
              .map((c) => c.text);
            text = parts.join("\n") || JSON.stringify(result, null, 2);
          } else {
            text =
              typeof res.result === "string"
                ? res.result
                : JSON.stringify(res.result, null, 2);
          }

          return { content: [{ type: "text" as const, text }] };
        },
      );
      count++;
    }
  }

  return count;
}
