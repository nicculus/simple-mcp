import { createRequire } from "module";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import type { Tool, Resource, Prompt, PromptMessage } from "@modelcontextprotocol/client";

const { version } = createRequire(import.meta.url)("../package.json") as {
  version: string;
};

// This package's own LATEST_PROTOCOL_VERSION/SUPPORTED_PROTOCOL_VERSIONS
// constants are legacy-handshake values (LATEST_PROTOCOL_VERSION is
// "2025-11-25" here) -- there's no exported constant for the modern spec,
// confirmed empirically by pinning to LATEST_PROTOCOL_VERSION and getting
// "pinning is for 2026-07-28 and later; ... 2025-era servers" back from the
// SDK itself. The literal is the correct value, not a placeholder.
const MODERN_PROTOCOL_VERSION = "2026-07-28";

export interface MCPClientConfig {
  endpoint: string;
  headers?: Record<string, string>;
}

export interface ToolCallOptions {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export type { Tool, Resource, Prompt, PromptMessage };

export class MCPClient {
  private config: MCPClientConfig;

  constructor(config: MCPClientConfig) {
    this.config = config;
  }

  private createTransport(): StreamableHTTPClientTransport {
    const url = new URL(this.config.endpoint);
    return new StreamableHTTPClientTransport(url, {
      requestInit: {
        headers: this.config.headers ?? {},
      },
    });
  }

  private async withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
    // versionNegotiation defaults to "legacy" (the plain 2025 handshake,
    // capped below 2026-07-28) -- carrying that default over silently would
    // mean this client never actually speaks the new stateless spec despite
    // the package bump. Pin to the exact modern revision the server speaks:
    // no fallback, fails loudly if it can't be negotiated.
    const client = new Client(
      { name: "mcp-client", version },
      { versionNegotiation: { mode: { pin: MODERN_PROTOCOL_VERSION } } },
    );
    const transport = this.createTransport();
    await client.connect(transport);
    try {
      return await fn(client);
    } finally {
      await client.close();
    }
  }

  async listTools(): Promise<Tool[]> {
    return this.withClient(async (client) => {
      const result = await client.listTools();
      return result.tools;
    });
  }

  async callTool(options: ToolCallOptions): Promise<Awaited<ReturnType<Client["callTool"]>>> {
    return this.withClient(async (client) => {
      return client.callTool({
        name: options.name,
        arguments: options.arguments ?? {},
      });
    });
  }

  async listResources(): Promise<Resource[]> {
    return this.withClient(async (client) => {
      const result = await client.listResources();
      return result.resources;
    });
  }

  async readResource(uri: string): Promise<ResourceContent[]> {
    return this.withClient(async (client) => {
      const result = await client.readResource({ uri });
      return result.contents as ResourceContent[];
    });
  }

  async listPrompts(): Promise<Prompt[]> {
    return this.withClient(async (client) => {
      const result = await client.listPrompts();
      return result.prompts;
    });
  }

  async getPrompt(name: string, args?: Record<string, string>): Promise<PromptMessage[]> {
    return this.withClient(async (client) => {
      const result = await client.getPrompt({ name, arguments: args });
      return result.messages;
    });
  }
}
