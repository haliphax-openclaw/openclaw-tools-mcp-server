export interface InvokeResult {
  ok: boolean;
  result?: unknown;
  error?: { type: string; message: string };
}

export interface GatewayToolInvokerOptions {
  /** Gateway HTTP base URL (e.g. `http://127.0.0.1:18789`). */
  baseUrl: string;
  /** Bearer token for `Authorization` (same as gateway token auth). */
  token: string;
  /** Request timeout in ms (default 30000). */
  timeoutMs?: number;
  /** Injected for tests; defaults to global `fetch`. */
  fetchFn?: typeof fetch;
}

function toolsInvokeHttpUrl(baseUrl: string): string {
  const u = new URL(baseUrl);
  return `${u.origin}/tools/invoke`;
}

function parseJsonResponse(text: string): unknown {
  const t = text.trim();
  if (!t) return {};
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return { _raw: text };
  }
}

/**
 * Invokes OpenClaw gateway tools via `POST /tools/invoke` (HTTP API).
 * @see https://docs.openclaw.ai/gateway/tools-invoke-http-api
 */
export class GatewayToolInvoker {
  private readonly url: string;
  private readonly token: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(opts: GatewayToolInvokerOptions) {
    this.url = toolsInvokeHttpUrl(opts.baseUrl);
    this.token = opts.token;
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  async invoke(
    tool: string,
    args: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<InvokeResult> {
    const body: Record<string, unknown> = {
      tool,
      args: args ?? {},
    };
    if (sessionKey) body.sessionKey = sessionKey;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await this.fetchFn(this.url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      const data = parseJsonResponse(text) as Record<string, unknown>;

      if (!res.ok) {
        const err = data.error as { type?: string; message?: string } | undefined;
        const msg =
          (err && typeof err.message === "string" && err.message) ||
          (typeof data.message === "string" && data.message) ||
          `HTTP ${res.status}`;
        return {
          ok: false,
          error: {
            type: err?.type ?? "http_error",
            message: msg,
          },
        };
      }

      if (typeof data.ok === "boolean") {
        return {
          ok: data.ok,
          result: data.result,
          error: data.error as { type: string; message: string } | undefined,
        };
      }

      return { ok: true, result: data };
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        return {
          ok: false,
          error: { type: "timeout", message: `Request timed out after ${this.timeoutMs}ms` },
        };
      }
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: { type: "network_error", message: msg } };
    } finally {
      clearTimeout(timer);
    }
  }
}
