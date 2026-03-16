# AGENTS.md — openclaw-tools-mcp

Instructions for AI agents working on this codebase.

## What this is

An MCP (Model Context Protocol) server that proxies OpenClaw tool calls from ACP agents to the OpenClaw Gateway's HTTP API. It runs as a stdio child process spawned by the ACP agent.

## Project structure

```
src/
  index.ts            Entry point — creates McpServer, registers tools, connects stdio
  config.ts           Configuration loading (env vars + optional JSON config file)
  gateway.ts          HTTP client for POST /tools/invoke on the OpenClaw Gateway
  custom-tools.ts     Loads additional tool definitions from JSON files on disk
  tools/
    index.ts          Tool registry — registers enabled tools on the McpServer
    web-search.ts     web_search tool schema
    web-fetch.ts      web_fetch tool schema
    browser.ts        browser tool schema (action-based, many sub-actions)
    pdf.ts            pdf tool schema
    message.ts        message tool schema (action-based)
    canvas.ts         canvas tool schema (action-based)
    sessions-send.ts  sessions_send tool schema (agent-to-agent messaging)
tools/
  rooms.json          Custom tool definition for the rooms plugin (5 tools)
```

## How it works

1. ACP agent spawns the server via stdio
2. Agent sends MCP `tools/call` requests
3. Server proxies each call to `POST http://<gateway>/tools/invoke` with bearer auth
4. Gateway executes the tool and returns the result
5. Server wraps the result and returns it via MCP JSON-RPC

## Key patterns

- **Built-in tools** are defined in `src/tools/*.ts` as Zod schemas. Each exports a `ToolDef` with `name`, `description`, `schema`.
- **Custom tools** are loaded from JSON files at paths specified in config. They use JSON Schema format (same as OpenClaw's `registerTool()`).
- **sessionKey handling**: Most tools get an auto-injected `sessionKey` param for gateway routing (stripped before forwarding as `args`). Tools that define their own `sessionKey` in their schema (like `sessions_send`) keep it as a tool argument — it's not stripped.
- **Result unwrapping**: Gateway results may be wrapped in `{ content, details }`. The handler extracts `details` when present for cleaner output.

## Adding a new built-in tool

1. Create `src/tools/my-tool.ts` exporting a `ToolDef`
2. Import and add it to `ALL_TOOLS` in `src/tools/index.ts`
3. Add the tool name to `DEFAULT_TOOLS` in `src/config.ts` if it should be on by default
4. Build: `./node_modules/.bin/tsc`

## Adding a custom tool (no code changes)

Create a JSON file following this format and add its path to `customTools` in config:

```json
{
  "name": "my_tool",
  "description": "What it does",
  "parameters": {
    "type": "object",
    "properties": {
      "param1": { "type": "string", "description": "..." }
    },
    "required": ["param1"]
  }
}
```

## Build

```bash
NODE_ENV=development npm install   # NODE_ENV=production skips devDeps
./node_modules/.bin/tsc
```

## Test

```bash
# Smoke test — MCP initialize + tool list
printf '...' | OPENCLAW_GATEWAY_TOKEN=xxx node dist/index.js
```

No test framework. Verify by sending JSON-RPC over stdin and checking stdout.

## Rules

- Don't hardcode tokens or secrets
- Don't modify tool behavior — this is a transparent proxy
- Keep tool schemas faithful to what the gateway expects
- Public domain (Unlicense)
