#!/usr/bin/env node
/**
 * Minimal stub for `openclaw gateway call … --json` used by MCP smoke tests.
 * Not a real gateway; prints fixed JSON to stdout only.
 */
const argv = process.argv.slice(2);
if (argv[0] !== "gateway" || argv[1] !== "call") {
  console.error("mock-openclaw: expected: gateway call <method> …");
  process.exit(1);
}
const method = argv[2];
const pi = argv.indexOf("--params");
const paramsJson = pi >= 0 && argv[pi + 1] ? argv[pi + 1] : "{}";
let params = {};
try {
  params = JSON.parse(paramsJson);
} catch {
  params = {};
}

const groupedEffective = {
  ok: true,
  payload: {
    agentId: "smoke-agent",
    profile: "full",
    groups: [
      {
        id: "core",
        label: "Core",
        source: "core",
        tools: [
          {
            id: "echo_smoke",
            label: "Echo (smoke)",
            description: "Returns args for integration testing",
            source: "core",
          },
        ],
      },
    ],
  },
};

if (method === "config.get") {
  console.log(JSON.stringify({ ok: true, payload: { gateway: { tools: {} } } }));
} else if (method === "tools.effective") {
  console.log(JSON.stringify(groupedEffective));
} else if (method === "tools.catalog") {
  console.log(JSON.stringify(groupedEffective.payload));
} else if (method === "tools.invoke") {
  const tool = params.tool;
  if (tool === "echo_smoke") {
    console.log(
      JSON.stringify({
        ok: true,
        result: { echoed: params.args ?? {}, sessionKey: params.sessionKey ?? null },
      }),
    );
  } else {
    console.log(
      JSON.stringify({ ok: false, error: { type: "not_found", message: `unknown tool ${tool}` } }),
    );
  }
} else {
  console.log(JSON.stringify({ ok: false, error: { type: "mock", message: `unhandled ${method}` } }));
}
