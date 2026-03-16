import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z, type ZodRawShape } from "zod";
import type { GatewayClient } from "../gateway.js";
import { webSearch } from "./web-search.js";
import { webFetch } from "./web-fetch.js";
import { browser } from "./browser.js";
import { pdf } from "./pdf.js";
import { message } from "./message.js";
import { canvas } from "./canvas.js";
import { sessionsSend } from "./sessions-send.js";

export interface ToolDef {
  name: string;
  description: string;
  schema: ZodRawShape;
}

const ALL_TOOLS: ToolDef[] = [webSearch, webFetch, browser, pdf, message, canvas, sessionsSend];

export function registerTools(
  server: McpServer,
  gateway: GatewayClient,
  enabledNames: string[],
) {
  const enabled = new Set(enabledNames);

  for (const tool of ALL_TOOLS) {
    if (!enabled.has(tool.name)) continue;

    const hasOwnSessionKey = "sessionKey" in tool.schema;

    const schema: ZodRawShape = hasOwnSessionKey
      ? tool.schema
      : {
          ...tool.schema,
          sessionKey: z.string().optional().describe("OpenClaw session key for routing"),
        };

    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: schema },
      async (args) => {
        const params = { ...(args as Record<string, unknown>) };
        let routingSessionKey: string | undefined;
        if (!hasOwnSessionKey) {
          routingSessionKey = params.sessionKey as string | undefined;
          delete params.sessionKey;
        }

        const res = await gateway.invoke(tool.name, params, routingSessionKey);

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

        // Gateway result may be wrapped: { content: [...], details: {...} }
        // Extract the most useful representation
        const raw = res.result as Record<string, unknown> | undefined;
        let text: string;
        if (raw && typeof raw === "object" && "details" in raw) {
          text = JSON.stringify(raw.details, null, 2);
        } else if (raw && typeof raw === "object" && "content" in raw && Array.isArray(raw.content)) {
          const parts = (raw.content as Array<{ type: string; text?: string }>)
            .filter((c) => c.type === "text" && c.text)
            .map((c) => c.text);
          text = parts.join("\n") || JSON.stringify(raw, null, 2);
        } else {
          text = typeof res.result === "string"
            ? res.result
            : JSON.stringify(res.result, null, 2);
        }

        return { content: [{ type: "text" as const, text }] };
      },
    );
  }
}
