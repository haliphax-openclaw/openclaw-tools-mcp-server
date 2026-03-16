import type { Config } from "./config.js";

export class GatewayClient {
  constructor(private config: Config["gateway"]) {}

  async invoke(
    tool: string,
    args: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<{ ok: boolean; result?: unknown; error?: { type: string; message: string } }> {
    const body: Record<string, unknown> = { tool, args };
    if (sessionKey) body.sessionKey = sessionKey;

    const res = await fetch(`${this.config.url}/tools/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        error: { type: `http_${res.status}`, message: body },
      };
    }

    return (await res.json()) as { ok: boolean; result?: unknown; error?: { type: string; message: string } };
  }
}
