import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GatewayToolDescriptor } from "./effective-tools.js";
import { parametersToZodShape } from "./effective-tools.js";
import type { GatewayToolInvoker } from "./gateway-tool-invoker.js";

function formatInvokeResult(result: unknown): string {
  const raw = result as Record<string, unknown> | undefined;
  if (raw && typeof raw === "object" && "details" in raw) {
    return JSON.stringify(raw.details, null, 2);
  }
  if (
    raw &&
    typeof raw === "object" &&
    "content" in raw &&
    Array.isArray(raw.content)
  ) {
    const parts = (raw.content as Array<{ type: string; text?: string }>)
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text);
    return parts.join("\n") || JSON.stringify(raw, null, 2);
  }
  return typeof result === "string" ? result : JSON.stringify(result, null, 2);
}

/**
 * Registers each OpenClaw gateway tool descriptor as an MCP tool that forwards to `POST /tools/invoke`.
 */
export function registerGatewayToolsAsMcp(
  server: McpServer,
  descriptors: GatewayToolDescriptor[],
  invoker: GatewayToolInvoker,
  defaultSessionKey: string,
): void {
  const seen = new Set<string>();
  for (const d of descriptors) {
    if (seen.has(d.name)) continue;
    seen.add(d.name);

    const inputSchema = parametersToZodShape(d.parameters);

    server.registerTool(
      d.name,
      {
        description: d.description ?? d.name,
        inputSchema,
      },
      async (args) => {
        const params = { ...(args as Record<string, unknown>) };
        const routingSessionKey =
          (params.sessionKey as string | undefined) ?? defaultSessionKey;
        delete params.sessionKey;

        const res = await invoker.invoke(d.name, params, routingSessionKey);

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

        return {
          content: [{ type: "text" as const, text: formatInvokeResult(res.result) }],
        };
      },
    );
  }
}
