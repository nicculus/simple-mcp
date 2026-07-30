import { createRequire } from "module";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Tool, Resource, Prompt, PromptMessage } from "@modelcontextprotocol/sdk/types.js";

const { version } = createRequire(import.meta.url)("../package.json") as {
  version: string;
};

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
    const client = new Client({ name: "mcp-client", version });
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
