# openclaw-tools-mcp

MCP server that exposes [OpenClaw](https://github.com/openclaw/openclaw) gateway tools to ACP agents (Kiro, Codex, Claude Code, etc.).

ACP agents run in their own runtime with their own native tools but lack access to OpenClaw’s capabilities. This server bridges that gap: whatever the gateway reports as **effective tools** for a session (built-ins plus plugins/extensions) is advertised over MCP and invoked through the same path the gateway uses.

```
ACP Agent ◄── stdio (JSON-RPC) ──► openclaw-tools-mcp ◄── HTTP POST /tools/invoke + openclaw gateway call ──► Gateway
```

## Requirements

- Node.js >= 22
- A running OpenClaw Gateway
- The **`openclaw`** CLI on `PATH` (or set `OPENCLAW_CLI`) so the server can run `openclaw gateway call …` for tool listing (`tools.effective` / `tools.catalog`) and optional `config.get` fallbacks

## How tool lists work

1. On startup, the server calls **`tools.effective`** for `OPENCLAW_SESSION_KEY` (default `main`) via the CLI. Gateways that do not implement that RPC yet fall back automatically to **`tools.catalog`** (wider catalog, not session-filtered the same way).
2. Results are merged with a **per-session disk cache** (LRU, up to **10** session keys) under `OPENCLAW_MCP_CACHE_DIR`.
3. Tool names are filtered by the same **HTTP invoke policy** the gateway uses: a built-in deny list plus `gateway.tools` from `~/.openclaw/openclaw.json` (`allow` / `deny`). If that file is missing or unreadable, the server may call **`config.get`** over RPC to read policy.
4. Optionally, restrict what MCP exposes with **`openclawToolsMcp.allow`** in `openclaw.json` (array of tool names). If set, only those names that also pass the HTTP policy are registered.

Tool calls use **`POST /tools/invoke`** on the gateway HTTP port with the same bearer token ([Tools Invoke HTTP API](https://docs.openclaw.ai/gateway/tools-invoke-http-api)).

## Quick start

```bash
cd openclaw-tools-mcp-server
npm install
npm run build
```

Add to `~/.kiro/settings/mcp.json` (or your client’s MCP config):

```json
{
  "mcpServers": {
    "openclaw-tools": {
      "command": "node",
      "args": ["/absolute/path/to/openclaw-tools-mcp-server/dist/index.js"],
      "env": {
        "OPENCLAW_GATEWAY_TOKEN": "${OPENCLAW_GATEWAY_TOKEN}"
      }
    }
  }
}
```

## Configuration

### Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENCLAW_GATEWAY_TOKEN` | Yes | — | Bearer token for gateway auth |
| `OPENCLAW_GATEWAY_URL` | No | `http://127.0.0.1:18789` | Gateway base URL (used to derive WebSocket URL) |
| `OPENCLAW_GATEWAY_WS_URL` | No | derived from `OPENCLAW_GATEWAY_URL` | Explicit `ws://` / `wss://` URL if needed |
| `OPENCLAW_SESSION_KEY` | No | `main` | Session key for tool listing RPC and default `sessionKey` on HTTP `/tools/invoke` |
| `OPENCLAW_MCP_CACHE_DIR` | No | `~/.cache/openclaw-tools-mcp` | Disk cache for effective tool payloads |
| `OPENCLAW_JSON_PATH` / `OPENCLAW_OPENCLAW_JSON` | No | `~/.openclaw/openclaw.json` | Path to OpenClaw config (HTTP tool policy + optional MCP allowlist) |
| `OPENCLAW_CLI` | No | `openclaw` | Path or name of the OpenClaw CLI |
| `OPENCLAW_GATEWAY_RPC_TIMEOUT_MS` | No | `30000` | Timeout for each `openclaw gateway call` and for HTTP `/tools/invoke` |
| `OPENCLAW_MCP_CONFIG` | No | `openclaw-mcp.json` | Optional JSON overlay (see below) |

### Optional `openclaw-mcp.json`

Same keys as supported in `loadConfig()`:

```json
{
  "gateway": {
    "url": "http://127.0.0.1:18789",
    "token": "your-token"
  },
  "openclawJsonPath": "/home/you/.openclaw/openclaw.json",
  "cacheDir": "/home/you/.cache/openclaw-tools-mcp",
  "defaultSessionKey": "main",
  "openclawCli": "openclaw",
  "rpcTimeoutMs": 30000
}
```

Environment variables override file values.

### Restricting tools exposed to MCP

In `~/.openclaw/openclaw.json`:

```json
{
  "openclawToolsMcp": {
    "allow": ["web_search", "web_fetch", "message"]
  }
}
```

Only those tools (that are also allowed for HTTP invoke) are registered.

### Allowing tools blocked by default HTTP policy

Some tools (for example `sessions_send`) are on the gateway’s default HTTP deny list. Allow them via `gateway.tools` in `openclaw.json`, then restart the gateway:

```json
{
  "gateway": {
    "tools": {
      "allow": ["sessions_send"]
    }
  }
}
```

## Runtime behavior

- The server uses **stdio** transport; the client spawns it as a child process.
- Each MCP tool accepts an optional **`sessionKey`** argument; if omitted, `OPENCLAW_SESSION_KEY` is sent on `/tools/invoke`.

## Troubleshooting

- **`unknown method: tools.effective`** — Upgrade the gateway and CLI to a current OpenClaw release, or rely on the built-in fallback to `tools.catalog` (already tried automatically after this error).
- **Server won’t start** — Set `OPENCLAW_GATEWAY_TOKEN`.
- **No tools listed** — Check gateway is running, token is valid, and filters (`openclawToolsMcp.allow`, `gateway.tools`) are not excluding everything.
- **`openclaw gateway call` errors** — Ensure `openclaw` is installed and matches your gateway; try `OPENCLAW_CLI` with an absolute path.
- **Verify in Kiro CLI** — Run `/mcp` in an interactive session to see loaded servers and tools.

## License

This project is released into the public domain under [The Unlicense](https://unlicense.org). See [LICENSE](LICENSE).
