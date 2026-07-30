import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockClientInstance, MockMCPClient } = vi.hoisted(() => {
  const mockClientInstance = {
    listTools: vi.fn().mockResolvedValue([]),
    callTool: vi.fn().mockResolvedValue({ content: [] }),
    listResources: vi.fn().mockResolvedValue([]),
    readResource: vi.fn().mockResolvedValue([]),
    listPrompts: vi.fn().mockResolvedValue([]),
    getPrompt: vi.fn().mockResolvedValue([]),
  };
  return {
    mockClientInstance,
    MockMCPClient: vi.fn(() => mockClientInstance),
  };
});

vi.mock("./client.js", () => ({ MCPClient: MockMCPClient }));

import { parseHeaders, program } from "./cli.js";

beforeEach(() => {
  vi.clearAllMocks();
  mockClientInstance.listTools.mockResolvedValue([]);
  mockClientInstance.callTool.mockResolvedValue({ content: [] });
  mockClientInstance.listResources.mockResolvedValue([]);
  mockClientInstance.readResource.mockResolvedValue([]);
  mockClientInstance.listPrompts.mockResolvedValue([]);
  mockClientInstance.getPrompt.mockResolvedValue([]);
});

function run(args: string[]): Promise<string[]> {
  const logs: string[] = [];
  const spy = vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => { logs.push(a.join(" ")); });
  return program.parseAsync(["node", "cli.js", ...args])
    .then(() => { spy.mockRestore(); return logs; });
}

// --- parseHeaders ------------------------------------------------------------

describe("parseHeaders", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MCP_HEADERS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns empty object when no env or flags provided", () => {
    expect(parseHeaders([])).toEqual({});
  });

  it("parses a single MCP_HEADERS entry", () => {
    process.env.MCP_HEADERS = "x-api-key:secret";
    expect(parseHeaders([])).toEqual({ "x-api-key": "secret" });
  });

  it("parses multiple comma-separated MCP_HEADERS entries", () => {
    process.env.MCP_HEADERS = "x-api-key:secret,X-Custom:foo";
    expect(parseHeaders([])).toEqual({ "x-api-key": "secret", "X-Custom": "foo" });
  });

  it("trims whitespace from MCP_HEADERS keys and values", () => {
    process.env.MCP_HEADERS = " x-api-key : secret ";
    expect(parseHeaders([])).toEqual({ "x-api-key": "secret" });
  });

  it("parses a single --header flag", () => {
    expect(parseHeaders(["x-api-key:mykey"])).toEqual({ "x-api-key": "mykey" });
  });

  it("parses multiple --header flags", () => {
    expect(parseHeaders(["x-api-key:mykey", "X-Foo:bar"])).toEqual({
      "x-api-key": "mykey",
      "X-Foo": "bar",
    });
  });

  it("--header flag overrides MCP_HEADERS for the same key", () => {
    process.env.MCP_HEADERS = "x-api-key:env-key";
    expect(parseHeaders(["x-api-key:flag-key"])).toEqual({ "x-api-key": "flag-key" });
  });

  it("merges MCP_HEADERS env and --header flags for different keys", () => {
    process.env.MCP_HEADERS = "x-api-key:secret";
    expect(parseHeaders(["X-Custom:extra"])).toEqual({
      "x-api-key": "secret",
      "X-Custom": "extra",
    });
  });

  it("preserves colons in header values", () => {
    expect(parseHeaders(["Authorization:Bearer tok:en"])).toEqual({
      Authorization: "Bearer tok:en",
    });
  });

  it("exits on malformed --header flag (missing colon)", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    expect(() => parseHeaders(["bad-header"])).toThrow();
    exitSpy.mockRestore();
  });
});

// --- resources list ----------------------------------------------------------

describe("resources list", () => {
  beforeEach(() => {
    process.env.MCP_ENDPOINT = "https://example.com/mcp";
  });
  afterEach(() => {
    delete process.env.MCP_ENDPOINT;
  });

  it("prints uri and description for each resource", async () => {
    mockClientInstance.listResources.mockResolvedValue([
      { uri: "server://info", description: "Server info" },
      { uri: "config://region" },
    ]);
    const logs = await run(["resources", "list"]);
    expect(logs.some(l => l.includes("server://info"))).toBe(true);
    expect(logs.some(l => l.includes("Server info"))).toBe(true);
  });

  it("prints 'No resources available.' when list is empty", async () => {
    mockClientInstance.listResources.mockResolvedValue([]);
    const logs = await run(["resources", "list"]);
    expect(logs.some(l => l.includes("No resources available."))).toBe(true);
  });

  it("outputs raw JSON with --json", async () => {
    mockClientInstance.listResources.mockResolvedValue([{ uri: "server://info" }]);
    const logs = await run(["resources", "list", "--json"]);
    const parsed = JSON.parse(logs[0]);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("passes headers to the client", async () => {
    await run(["resources", "list", "--header", "x-api-key:secret"]);
    expect(MockMCPClient).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { "x-api-key": "secret" } })
    );
  });
});

// --- resources read ----------------------------------------------------------

describe("resources read", () => {
  beforeEach(() => {
    process.env.MCP_ENDPOINT = "https://example.com/mcp";
  });
  afterEach(() => {
    delete process.env.MCP_ENDPOINT;
  });

  it("prints text content from the resource", async () => {
    mockClientInstance.readResource.mockResolvedValue([{ uri: "server://info", text: '{"name":"demo"}' }]);
    const logs = await run(["resources", "read", "server://info"]);
    expect(logs.some(l => l.includes('{"name":"demo"}'))).toBe(true);
  });

  it("outputs raw JSON with --json", async () => {
    mockClientInstance.readResource.mockResolvedValue([{ uri: "server://info", text: "hello" }]);
    const logs = await run(["resources", "read", "server://info", "--json"]);
    const parsed = JSON.parse(logs[0]);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("passes the URI to the client", async () => {
    await run(["resources", "read", "config://region"]);
    expect(mockClientInstance.readResource).toHaveBeenCalledWith("config://region");
  });
});

// --- prompts list ------------------------------------------------------------

describe("prompts list", () => {
  beforeEach(() => {
    process.env.MCP_ENDPOINT = "https://example.com/mcp";
  });
  afterEach(() => {
    delete process.env.MCP_ENDPOINT;
  });

  it("prints name, args signature, and description", async () => {
    mockClientInstance.listPrompts.mockResolvedValue([
      { name: "analyze_endpoint", description: "Analyze an endpoint", arguments: [{ name: "url", required: true }, { name: "method", required: false }] },
    ]);
    const logs = await run(["prompts", "list"]);
    const line = logs.join("\n");
    expect(line).toContain("analyze_endpoint");
    expect(line).toContain("Analyze an endpoint");
    expect(line).toContain("url");
    expect(line).toContain("method?");
  });

  it("prints 'No prompts available.' when list is empty", async () => {
    mockClientInstance.listPrompts.mockResolvedValue([]);
    const logs = await run(["prompts", "list"]);
    expect(logs.some(l => l.includes("No prompts available."))).toBe(true);
  });

  it("outputs raw JSON with --json", async () => {
    mockClientInstance.listPrompts.mockResolvedValue([{ name: "p", arguments: [] }]);
    const logs = await run(["prompts", "list", "--json"]);
    const parsed = JSON.parse(logs[0]);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("passes headers to the client", async () => {
    await run(["prompts", "list", "--header", "x-api-key:secret"]);
    expect(MockMCPClient).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { "x-api-key": "secret" } })
    );
  });
});

// --- prompts get -------------------------------------------------------------

describe("prompts get", () => {
  beforeEach(() => {
    process.env.MCP_ENDPOINT = "https://example.com/mcp";
  });
  afterEach(() => {
    delete process.env.MCP_ENDPOINT;
  });

  it("prints [role] text for each message", async () => {
    mockClientInstance.getPrompt.mockResolvedValue([
      { role: "user", content: { type: "text", text: "Analyze https://example.com" } },
    ]);
    const logs = await run(["prompts", "get", "analyze_endpoint"]);
    expect(logs.some(l => l.includes("[user]") && l.includes("Analyze https://example.com"))).toBe(true);
  });

  it("outputs raw JSON with --json", async () => {
    mockClientInstance.getPrompt.mockResolvedValue([
      { role: "user", content: { type: "text", text: "hello" } },
    ]);
    const logs = await run(["prompts", "get", "analyze_endpoint", "--json"]);
    const parsed = JSON.parse(logs[0]);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("passes name and args to the client", async () => {
    await run(["prompts", "get", "analyze_endpoint", "--args", '{"url":"https://example.com"}']);
    expect(mockClientInstance.getPrompt).toHaveBeenCalledWith(
      "analyze_endpoint",
      { url: "https://example.com" }
    );
  });

  it("passes prompt name when no --args given", async () => {
    await run(["prompts", "get", "analyze_endpoint"]);
    const [name] = mockClientInstance.getPrompt.mock.calls[0];
    expect(name).toBe("analyze_endpoint");
  });
});
