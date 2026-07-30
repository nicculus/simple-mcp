# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A TypeScript client library and CLI for connecting to a serverless MCP server deployed on AWS, Azure, or GCP. The companion server is [mcp-infra](https://github.com/nicculus/mcp-infra).

The package has two entrypoints:
- **Library** (`src/client.ts`) — importable `MCPClient` class for use in other TypeScript/Node projects
- **CLI** (`src/cli.ts`) — `mcp-client` binary for interactive use from the terminal

## Commands

```sh
npm install          # install dependencies
npm run build        # compile TypeScript to dist/
npm run dev          # watch mode
npm run lint         # type-check without emitting
```

After building, run the CLI directly:

```sh
node dist/cli.js tools list
node dist/cli.js tools call <name> --args '{"key":"value"}'
```

Or link it globally:

```sh
npm link
mcp-client tools list
```

## Environment variables

The CLI reads these at runtime — can also be placed in a `.env` file:

| Variable | Description |
|---|---|
| `MCP_ENDPOINT` | Full URL to the MCP server (e.g. `https://YOUR_ENDPOINT/mcp`) |
| `MCP_HEADERS` | Headers as comma-separated `key:value` pairs (e.g. `"x-api-key:YOUR_KEY"`) |

## Architecture

**`src/client.ts`** — `MCPClient` wraps `@modelcontextprotocol/sdk`. Each public method (`listTools`, `callTool`) opens a fresh connection, executes, and closes. The transport is always Streamable HTTP (`StreamableHTTPClientTransport`). The `headers` config field is passed directly to the transport's `requestInit`.

**`src/cli.ts`** — `commander`-based CLI. Commands are namespaced under `tools` (`tools list`, `tools call <name>`). All commands accept `--json` for machine-readable output and `--header key:value` (repeatable) for custom headers. `buildClient()` merges `MCP_HEADERS` env var and `--header` flags before constructing the client.

## Conventions

- `--json` flag on every command outputs raw JSON for scripting
- Default (human) output for `tools list` is name + description; for `tools call` it prints text content directly
- Headers are the sole auth mechanism — pass `x-api-key`, `Authorization`, or whatever the server expects via `MCP_HEADERS` or `--header`
- ESM throughout (`"type": "module"`) — imports within `src/` must use `.js` extensions
