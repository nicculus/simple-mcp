# @nicculus/mcp-client

A TypeScript client library and CLI for connecting to a serverless MCP server over Streamable HTTP.

Companion to [mcp-infra](https://github.com/nicculus/mcp-infra), which deploys the server to AWS, Azure, or GCP.

## Installation

```sh
npm install -g @nicculus/mcp-client
```

## CLI

```sh
export MCP_ENDPOINT=https://YOUR_ENDPOINT/mcp
export MCP_HEADERS="x-api-key:YOUR_KEY"

# List available tools
mcp-client tools list

# Call a tool
mcp-client tools call <name> --args '{"key": "value"}'

# Machine-readable output
mcp-client tools list --json
mcp-client tools call <name> --args '{"key": "value"}' --json

# Custom headers (repeatable)
mcp-client tools list --header "x-api-key:YOUR_KEY"
mcp-client tools list --header "Authorization:Bearer tok123" --header "X-Custom:foo"
```

For one-off use without a global install:

```sh
npx @nicculus/mcp-client tools list
```

Credentials can also be placed in a `.env` file in the working directory. Additional headers can be set via `MCP_HEADERS` as comma-separated `key:value` pairs:

```sh
MCP_HEADERS="x-api-key:YOUR_KEY,X-Custom:foo"
```

## SDK

```ts
import { MCPClient } from "@nicculus/mcp-client";

const client = new MCPClient({
  endpoint: "https://YOUR_ENDPOINT/mcp",
  headers: {
    "x-api-key": "YOUR_KEY",
  },
});
```

### Usage

```ts
// List available tools
const tools = await client.listTools();
console.log(tools.map((t) => t.name));

// Call a tool
const result = await client.callTool({
  name: "get_repo_summary",
  arguments: { repo_url: "anthropics/anthropic-sdk-python" },
});
console.log(result.content);
```

Each method opens a fresh connection, executes, and closes — no persistent state to manage.

## Requirements

- Node.js 18+
- An MCP server endpoint (see [mcp-infra](https://github.com/nicculus/mcp-infra))

## License

MIT
