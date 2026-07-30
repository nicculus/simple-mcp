import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockInstance, MockClient, MockTransport } = vi.hoisted(() => {
  const mockInstance = {
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    listTools: vi.fn().mockResolvedValue({ tools: [] }),
    callTool: vi.fn().mockResolvedValue({ content: [] }),
    listResources: vi.fn().mockResolvedValue({ resources: [] }),
    readResource: vi.fn().mockResolvedValue({ contents: [] }),
    listPrompts: vi.fn().mockResolvedValue({ prompts: [] }),
    getPrompt: vi.fn().mockResolvedValue({ messages: [] }),
  };
  return {
    mockInstance,
    MockClient: vi.fn(() => mockInstance),
    MockTransport: vi.fn(),
  };
});

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({ Client: MockClient }));
vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: MockTransport,
}));

import { MCPClient } from "./client.js";

beforeEach(() => {
  vi.clearAllMocks();
  mockInstance.listTools.mockResolvedValue({ tools: [] });
  mockInstance.callTool.mockResolvedValue({ content: [] });
  mockInstance.listResources.mockResolvedValue({ resources: [] });
  mockInstance.readResource.mockResolvedValue({ contents: [] });
  mockInstance.listPrompts.mockResolvedValue({ prompts: [] });
  mockInstance.getPrompt.mockResolvedValue({ messages: [] });
});

describe("MCPClient", () => {
  describe("listTools", () => {
    it("returns the tools array from the SDK response", async () => {
      const tools = [{ name: "tool_a", description: "Does A" }];
      mockInstance.listTools.mockResolvedValue({ tools });
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      expect(await client.listTools()).toEqual(tools);
    });

    it("creates transport with the correct URL", async () => {
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      await client.listTools();
      expect(MockTransport).toHaveBeenCalledWith(new URL("https://example.com/mcp"), expect.anything());
    });

    it("passes headers to the transport", async () => {
      const client = new MCPClient({ endpoint: "https://example.com/mcp", headers: { "x-api-key": "secret" } });
      await client.listTools();
      expect(MockTransport).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({ requestInit: { headers: { "x-api-key": "secret" } } })
      );
    });

    it("uses empty headers when none are provided", async () => {
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      await client.listTools();
      const [, opts] = MockTransport.mock.calls[0];
      expect(opts.requestInit.headers).toEqual({});
    });

    it("connects and closes the client", async () => {
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      await client.listTools();
      expect(mockInstance.connect).toHaveBeenCalledOnce();
      expect(mockInstance.close).toHaveBeenCalledOnce();
    });

    it("closes the client even when the call throws", async () => {
      mockInstance.listTools.mockRejectedValue(new Error("network error"));
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      await expect(client.listTools()).rejects.toThrow("network error");
      expect(mockInstance.close).toHaveBeenCalledOnce();
    });
  });

  describe("callTool", () => {
    it("returns the result from the SDK", async () => {
      const expected = { content: [{ type: "text", text: "hello" }] };
      mockInstance.callTool.mockResolvedValue(expected);
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      expect(await client.callTool({ name: "my_tool" })).toEqual(expected);
    });

    it("passes name and arguments to the SDK", async () => {
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      await client.callTool({ name: "get_repo_summary", arguments: { repo_url: "https://github.com/owner/repo" } });
      expect(mockInstance.callTool).toHaveBeenCalledWith({ name: "get_repo_summary", arguments: { repo_url: "https://github.com/owner/repo" } });
    });

    it("defaults arguments to an empty object", async () => {
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      await client.callTool({ name: "my_tool" });
      expect(mockInstance.callTool).toHaveBeenCalledWith({ name: "my_tool", arguments: {} });
    });

    it("closes the client even when the call throws", async () => {
      mockInstance.callTool.mockRejectedValue(new Error("server error"));
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      await expect(client.callTool({ name: "my_tool" })).rejects.toThrow("server error");
      expect(mockInstance.close).toHaveBeenCalledOnce();
    });
  });

  describe("listResources", () => {
    it("returns the resources array from the SDK response", async () => {
      const resources = [{ uri: "server://info", name: "Server Info" }];
      mockInstance.listResources.mockResolvedValue({ resources });
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      expect(await client.listResources()).toEqual(resources);
    });

    it("returns an empty array when no resources exist", async () => {
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      expect(await client.listResources()).toEqual([]);
    });

    it("passes headers to the transport", async () => {
      const client = new MCPClient({ endpoint: "https://example.com/mcp", headers: { "x-api-key": "k" } });
      await client.listResources();
      expect(MockTransport).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({ requestInit: { headers: { "x-api-key": "k" } } })
      );
    });

    it("closes the client after the call", async () => {
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      await client.listResources();
      expect(mockInstance.close).toHaveBeenCalledOnce();
    });

    it("closes the client even when the call throws", async () => {
      mockInstance.listResources.mockRejectedValue(new Error("error"));
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      await expect(client.listResources()).rejects.toThrow("error");
      expect(mockInstance.close).toHaveBeenCalledOnce();
    });
  });

  describe("readResource", () => {
    it("returns the contents array from the SDK response", async () => {
      const contents = [{ uri: "server://info", text: '{"name":"demo"}' }];
      mockInstance.readResource.mockResolvedValue({ contents });
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      expect(await client.readResource("server://info")).toEqual(contents);
    });

    it("passes the URI to the SDK", async () => {
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      await client.readResource("config://region");
      expect(mockInstance.readResource).toHaveBeenCalledWith({ uri: "config://region" });
    });

    it("closes the client even when the call throws", async () => {
      mockInstance.readResource.mockRejectedValue(new Error("not found"));
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      await expect(client.readResource("nonexistent://foo")).rejects.toThrow("not found");
      expect(mockInstance.close).toHaveBeenCalledOnce();
    });
  });

  describe("listPrompts", () => {
    it("returns the prompts array from the SDK response", async () => {
      const prompts = [{ name: "analyze_endpoint", description: "Analyze an endpoint" }];
      mockInstance.listPrompts.mockResolvedValue({ prompts });
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      expect(await client.listPrompts()).toEqual(prompts);
    });

    it("returns an empty array when no prompts exist", async () => {
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      expect(await client.listPrompts()).toEqual([]);
    });

    it("closes the client after the call", async () => {
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      await client.listPrompts();
      expect(mockInstance.close).toHaveBeenCalledOnce();
    });

    it("closes the client even when the call throws", async () => {
      mockInstance.listPrompts.mockRejectedValue(new Error("error"));
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      await expect(client.listPrompts()).rejects.toThrow("error");
      expect(mockInstance.close).toHaveBeenCalledOnce();
    });
  });

  describe("getPrompt", () => {
    it("returns the messages array from the SDK response", async () => {
      const messages = [{ role: "user", content: { type: "text", text: "Analyze..." } }];
      mockInstance.getPrompt.mockResolvedValue({ messages });
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      expect(await client.getPrompt("analyze_endpoint", { url: "https://example.com" })).toEqual(messages);
    });

    it("passes name and arguments to the SDK", async () => {
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      await client.getPrompt("analyze_endpoint", { url: "https://example.com" });
      expect(mockInstance.getPrompt).toHaveBeenCalledWith({ name: "analyze_endpoint", arguments: { url: "https://example.com" } });
    });

    it("passes undefined args when not provided", async () => {
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      await client.getPrompt("analyze_endpoint");
      expect(mockInstance.getPrompt).toHaveBeenCalledWith({ name: "analyze_endpoint", arguments: undefined });
    });

    it("closes the client even when the call throws", async () => {
      mockInstance.getPrompt.mockRejectedValue(new Error("not found"));
      const client = new MCPClient({ endpoint: "https://example.com/mcp" });
      await expect(client.getPrompt("nonexistent")).rejects.toThrow("not found");
      expect(mockInstance.close).toHaveBeenCalledOnce();
    });
  });
});
