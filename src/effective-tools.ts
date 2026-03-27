/**
 * Normalize gateway `tools.effective` payloads (shape varies by gateway version / CLI wrapper).
 */

import { z, type ZodRawShape } from "zod";

export interface GatewayToolDescriptor {
  name: string;
  description?: string;
  /** JSON Schema object for tool arguments (OpenAI-style tools). */
  parameters?: Record<string, unknown>;
}

function unwrapPayload(root: unknown): unknown {
  if (!root || typeof root !== "object") return root;
  const o = root as Record<string, unknown>;
  if (o.ok === true && o.payload != null) return o.payload;
  return root;
}

function findToolsArray(root: unknown): unknown[] | null {
  const p = unwrapPayload(root);
  if (!p || typeof p !== "object") return null;
  const o = p as Record<string, unknown>;
  if (Array.isArray(o.tools)) return o.tools;
  if (Array.isArray(o.effectiveTools)) return o.effectiveTools;
  if (Array.isArray(o.items)) return o.items;
  return null;
}

export function extractToolsFromEffectivePayload(root: unknown): GatewayToolDescriptor[] {
  const arr = findToolsArray(root);
  if (!arr) return [];

  const out: GatewayToolDescriptor[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const t = item as Record<string, unknown>;
    const name = t.name;
    if (typeof name !== "string" || !name) continue;
    const description = typeof t.description === "string" ? t.description : undefined;
    const parameters =
      (t.parameters as Record<string, unknown> | undefined) ??
      (t.inputSchema as Record<string, unknown> | undefined);
    out.push({
      name,
      description,
      parameters:
        parameters && typeof parameters === "object" ? parameters : undefined,
    });
  }
  return out;
}

export function applyMcpAllowlist(
  tools: GatewayToolDescriptor[],
  allowlist: string[] | undefined,
): GatewayToolDescriptor[] {
  if (!allowlist || allowlist.length === 0) return tools;
  const allow = new Set(allowlist);
  return tools.filter((t) => allow.has(t.name));
}

interface ParameterObject {
  type?: string;
  properties?: Record<string, Record<string, unknown>>;
  required?: string[];
}

/** Map JSON Schema–style parameters from the gateway into MCP Zod input shapes. */
export function parametersToZodShape(parameters: Record<string, unknown> | undefined): ZodRawShape {
  const shape: ZodRawShape = {};
  if (!parameters || typeof parameters !== "object") {
    shape.sessionKey = z
      .string()
      .optional()
      .describe("OpenClaw session key for routing (tools.effective scope)");
    return shape;
  }

  const p = parameters as ParameterObject;
  const props = p.properties ?? {};
  const required = new Set(p.required ?? []);

  for (const [key, prop] of Object.entries(props)) {
    if (!prop || typeof prop !== "object") continue;
    const pr = prop as Record<string, unknown>;
    const t = typeof pr.type === "string" ? pr.type : "string";
    let field: z.ZodTypeAny;
    switch (t) {
      case "number":
      case "integer":
        field = z.number();
        break;
      case "boolean":
        field = z.boolean();
        break;
      case "array":
        field = z.array(z.unknown());
        break;
      default:
        field = z.string();
    }
    if (typeof pr.description === "string") field = field.describe(pr.description);
    shape[key] = required.has(key) ? field : field.optional();
  }

  shape.sessionKey = z
    .string()
    .optional()
    .describe("OpenClaw session key for routing (tools.effective scope)");

  return shape;
}
