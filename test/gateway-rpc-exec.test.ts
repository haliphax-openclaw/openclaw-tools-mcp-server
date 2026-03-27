import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

declare global {
  // eslint-disable-next-line no-var
  var __openclawExecFileStdout: string | undefined;
}

const promisifyCustom = Symbol.for("nodejs.util.promisify.custom");

vi.mock("child_process", async (importActual) => {
  const actual = await importActual<typeof import("child_process")>();
  const promisified = vi.fn(
    async (_file: string, _args: string[] | undefined, _options: object) => ({
      stdout: globalThis.__openclawExecFileStdout ?? "{}",
      stderr: "",
    }),
  );
  const execFile = Object.assign(
    vi.fn(
      (
        _file: string,
        _args: unknown,
        _options: unknown,
        _callback: unknown,
      ) => {
        throw new Error("execFile callback form not used by OpenclawCliGatewayRpc tests");
      },
    ),
    { [promisifyCustom]: promisified },
  );
  return { ...actual, execFile };
});

describe("OpenclawCliGatewayRpc (execFile)", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete globalThis.__openclawExecFileStdout;
  });

  beforeEach(() => {
    vi.resetModules();
    globalThis.__openclawExecFileStdout = "{}";
  });

  it("parses JSON stdout and passes CLI args including default timeout", async () => {
    globalThis.__openclawExecFileStdout = `{"ok":true,"payload":{}}`;
    const { OpenclawCliGatewayRpc } = await import("../src/gateway-rpc.js");
    const childProcess = await import("child_process");
    const rpc = new OpenclawCliGatewayRpc({
      cliPath: "/bin/openclaw",
      wsUrl: "ws://h:1",
      token: "tok",
    });
    const out = await rpc.call("tools.effective", { sessionKey: "main" });
    expect(out).toEqual({ ok: true, payload: {} });

    const promisified = (childProcess.execFile as unknown as Record<symbol, ReturnType<typeof vi.fn>>)[
      promisifyCustom
    ];
    expect(promisified).toHaveBeenCalledWith(
      "/bin/openclaw",
      expect.arrayContaining([
        "gateway",
        "call",
        "tools.effective",
        "--url",
        "ws://h:1",
        "--token",
        "tok",
        "--params",
        JSON.stringify({ sessionKey: "main" }),
        "--json",
        "--timeout",
        "30000",
      ]),
      expect.objectContaining({
        maxBuffer: 50 * 1024 * 1024,
        env: expect.objectContaining({ NO_COLOR: "1", FORCE_COLOR: "0" }),
      }),
    );
  });

  it("uses custom timeoutMs when set", async () => {
    globalThis.__openclawExecFileStdout = "{}";
    const { OpenclawCliGatewayRpc } = await import("../src/gateway-rpc.js");
    const childProcess = await import("child_process");
    const rpc = new OpenclawCliGatewayRpc({
      cliPath: "openclaw",
      wsUrl: "ws://x",
      token: "t",
      timeoutMs: 999,
    });
    await rpc.call("x", {});
    const promisified = (childProcess.execFile as unknown as Record<symbol, ReturnType<typeof vi.fn>>)[
      promisifyCustom
    ];
    const passedArgs = promisified.mock.calls[0]![1] as string[];
    expect(passedArgs).toContain("--timeout");
    expect(passedArgs[passedArgs.indexOf("--timeout") + 1]).toBe("999");
  });

  it("throws on empty stdout", async () => {
    globalThis.__openclawExecFileStdout = "  \n";
    const { OpenclawCliGatewayRpc } = await import("../src/gateway-rpc.js");
    const rpc = new OpenclawCliGatewayRpc({
      cliPath: "openclaw",
      wsUrl: "ws://x",
      token: "t",
    });
    await expect(rpc.call("x", {})).rejects.toThrow("empty stdout");
  });
});
