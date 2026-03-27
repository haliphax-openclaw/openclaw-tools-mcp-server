import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * OpenClaw Gateway WebSocket RPC (via `openclaw gateway call <method>`).
 */
export interface GatewayRpc {
  call(method: string, params: Record<string, unknown>): Promise<unknown>;
}

/** Convert gateway HTTP base (e.g. http://127.0.0.1:18789) to WebSocket URL for the CLI. */
export function httpToWsGatewayUrl(httpUrl: string): string {
  const u = new URL(httpUrl);
  if (u.protocol === "https:") u.protocol = "wss:";
  else if (u.protocol === "http:") u.protocol = "ws:";
  const s = u.toString();
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

/** Normalize `openclaw gateway call --json` top-level shapes. */
export function unwrapGatewayRpcResult(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  if ("payload" in o && o.payload && typeof o.payload === "object") {
    return o.payload as Record<string, unknown>;
  }
  return o;
}

export class OpenclawCliGatewayRpc implements GatewayRpc {
  constructor(
    private readonly opts: {
      cliPath: string;
      wsUrl: string;
      token: string;
      timeoutMs?: number;
    },
  ) {}

  async call(method: string, params: Record<string, unknown>): Promise<unknown> {
    const timeout = this.opts.timeoutMs ?? 30_000;
    const args = [
      "gateway",
      "call",
      method,
      "--url",
      this.opts.wsUrl,
      "--token",
      this.opts.token,
      "--params",
      JSON.stringify(params),
      "--json",
      "--timeout",
      String(timeout),
    ];
    const { stdout } = await execFileAsync(this.opts.cliPath, args, {
      maxBuffer: 50 * 1024 * 1024,
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    });
    const text = stdout.trim();
    if (!text) throw new Error("openclaw gateway call returned empty stdout");
    return JSON.parse(text) as unknown;
  }
}
