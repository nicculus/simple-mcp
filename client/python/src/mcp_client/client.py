from mcp import ClientSession
from mcp.client.streamable_http import create_mcp_http_client, streamable_http_client
from mcp.types import Tool, CallToolResult, Resource, Prompt, PromptMessage


class MCPClient:
    """Client for a serverless MCP server over Streamable HTTP."""

    def __init__(self, endpoint: str, headers: dict[str, str] | None = None) -> None:
        self.endpoint = endpoint
        self.headers = headers or {}

    # session.initialize() performs mcp 2.x's *legacy* handshake, which caps
    # negotiation at protocol 2025-11-25 (mcp.client.session.LATEST_HANDSHAKE_VERSION)
    # -- it does not reach 2026-07-28. session.discover() is the stateless-spec
    # replacement; the server this client talks to only speaks 2026-07-28 now,
    # so there's no legacy fallback to preserve here.

    async def list_tools(self) -> list[Tool]:
        async with create_mcp_http_client(headers=self.headers) as http_client:
            async with streamable_http_client(self.endpoint, http_client=http_client) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.discover()
                    result = await session.list_tools()
                    return result.tools

    async def call_tool(self, name: str, arguments: dict | None = None) -> CallToolResult:
        async with create_mcp_http_client(headers=self.headers) as http_client:
            async with streamable_http_client(self.endpoint, http_client=http_client) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.discover()
                    return await session.call_tool(name, arguments or {})

    async def list_resources(self) -> list[Resource]:
        async with create_mcp_http_client(headers=self.headers) as http_client:
            async with streamable_http_client(self.endpoint, http_client=http_client) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.discover()
                    result = await session.list_resources()
                    return result.resources

    async def read_resource(self, uri: str) -> list:
        # mcp 2.x's ClientSession.read_resource takes a plain str, not
        # pydantic.AnyUrl -- passing AnyUrl now fails Pydantic validation
        # server-side (caught by an actual live server, not the mocked tests).
        async with create_mcp_http_client(headers=self.headers) as http_client:
            async with streamable_http_client(self.endpoint, http_client=http_client) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.discover()
                    result = await session.read_resource(uri)
                    return result.contents

    async def list_prompts(self) -> list[Prompt]:
        async with create_mcp_http_client(headers=self.headers) as http_client:
            async with streamable_http_client(self.endpoint, http_client=http_client) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.discover()
                    result = await session.list_prompts()
                    return result.prompts

    async def get_prompt(self, name: str, arguments: dict[str, str] | None = None) -> list[PromptMessage]:
        async with create_mcp_http_client(headers=self.headers) as http_client:
            async with streamable_http_client(self.endpoint, http_client=http_client) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.discover()
                    result = await session.get_prompt(name, arguments)
                    return result.messages
