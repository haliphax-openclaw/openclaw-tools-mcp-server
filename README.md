# openclaw-tools-mcp

MCP server that exposes [OpenClaw](https://github.com/openclaw/openclaw) tools to ACP agents (Kiro, Codex, Claude Code, etc.).

ACP agents run in their own runtime with their own native tools but lack access to OpenClaw's capabilities. This server bridges that gap — web search, page fetching, browser automation, PDF analysis, messaging, inter-agent communication, and Canvas are all available as MCP tools.

```
ACP Agent ◄── stdio (JSON-RPC) ──► openclaw-tools-mcp ◄── HTTP ──► OpenClaw Gateway
```

## Default tools

| Tool | Description |
|------|-------------|
| `web_search` | Search the web |
| `web_fetch` | Fetch and extract readable content from URLs |
| `browser` | Control a web browser (navigate, click, type, screenshot, etc.) |
| `pdf` | Analyze PDF documents |
| `message` | Send messages via Discord, Telegram, WhatsApp, etc. |
| `canvas` | Control the Canvas visual workspace |
| `sessions_send` | Send a message into another OpenClaw session (agent-to-agent) |

## Quick start

```bash
cd openclaw-tools-mcp
npm install
npm run build
```

Add to `~/.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "openclaw-tools": {
      "command": "node",
      "args": ["/absolute/path/to/openclaw-tools-mcp/dist/index.js"],
      "env": {
        "OPENCLAW_GATEWAY_TOKEN": "${OPENCLAW_GATEWAY_TOKEN}"
      }
    }
  }
}
```

Requires Node.js >= 22 and a running OpenClaw Gateway.

## Configuration

### Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENCLAW_GATEWAY_TOKEN` | Yes | — | Bearer token for gateway auth |
| `OPENCLAW_GATEWAY_URL` | No | `http://127.0.0.1:18789` | Gateway base URL |
| `OPENCLAW_MCP_TOOLS` | No | all 7 tools | Comma-separated list of tools to expose |
| `OPENCLAW_MCP_CONFIG` | No | `openclaw-mcp.json` | Path to config file |
| `OPENCLAW_MCP_CUSTOM_TOOLS` | No | — | Comma-separated paths to custom tool JSON files |

### Config file

Optional `openclaw-mcp.json`:

```json
{
  "gateway": {
    "url": "http://127.0.0.1:18789",
    "token": "your-token"
  },
  "tools": ["web_search", "web_fetch", "browser", "pdf", "message", "canvas", "sessions_send"],
  "customTools": ["./tools/rooms.json"]
}
```

Environment variables override config file values.

### Exposing a subset of tools

```json
{
  "mcpServers": {
    "openclaw-tools": {
      "command": "node",
      "args": ["/path/to/openclaw-tools-mcp/dist/index.js"],
      "env": {
        "OPENCLAW_GATEWAY_TOKEN": "${OPENCLAW_GATEWAY_TOKEN}",
        "OPENCLAW_MCP_TOOLS": "web_search,web_fetch,message"
      }
    }
  }
}
```

## Custom tool definitions

Load additional tools from JSON files — useful for custom OpenClaw skills/plugins.

```json
{
  "tools": [
    {
      "name": "room_join",
      "description": "Join a named room for multi-agent broadcast messaging.",
      "parameters": {
        "type": "object",
        "properties": {
          "room": { "type": "string", "description": "Room name" },
          "agentId": { "type": "string", "description": "Your agent ID" }
        },
        "required": ["room", "agentId"]
      }
    }
  ]
}
```

Single-tool files (without the `tools` wrapper) also work. The schema format matches what OpenClaw plugins use in `registerTool()`. Supported types: `string`, `number`, `integer`, `boolean`, `array`. Enums via `"enum": [...]`.

A `sessionKey` parameter is automatically injected into every custom tool for gateway routing.

A ready-made definition for the rooms plugin is included at [`tools/rooms.json`](tools/rooms.json).

## Notes

- The server uses stdio transport — ACP agents spawn it as a child process.
- All tool calls are proxied to the gateway's `POST /tools/invoke` HTTP endpoint.
- `sessions_send` requires a gateway config change — see below.
- Every built-in tool (except `sessions_send`) accepts an optional `sessionKey` parameter for routing the call to a specific agent session on the gateway.

### Enabling sessions_send

`sessions_send` is on the gateway's default HTTP deny list for `/tools/invoke`. Without this config change, calls will return `404 Tool not available`. Add to your OpenClaw config (`~/.openclaw/openclaw.json`):

```json5
gateway: {
  tools: {
    allow: ["sessions_send"]
  }
}
```

Then restart the gateway (`openclaw gateway restart`).

## Troubleshooting

- **Server won't start** — `OPENCLAW_GATEWAY_TOKEN` must be set.
- **Tools return errors** — Verify the gateway is running (`openclaw gateway status`) and the token is correct.
- **Tool not found (404)** — The tool may be blocked by gateway policy. Check `gateway.tools.deny` in your OpenClaw config.
- **Verify in Kiro CLI** — Run `/mcp` in an interactive session to see loaded servers and tools.

## License

This project is released into the public domain under [The Unlicense](https://unlicense.org). See [LICENSE](LICENSE).
