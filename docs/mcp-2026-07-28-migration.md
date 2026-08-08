# Adopting MCP spec 2026-07-28

Status: **blocked on upstream SDKs — do not start the migration yet.**

[Announcement.](https://blog.modelcontextprotocol.io/posts/2026-07-28/)

## Why it's blocked

The announcement says all Tier 1 SDKs support 2026-07-28 immediately. That is
not true of the two SDKs this repo actually depends on, as of the versions
published today. Measured directly against the registries rather than taken
from the post:

| Component | Package | Latest published | Max protocol | Can speak 2026-07-28? |
|-----------|---------|------------------|--------------|------------------------|
| `client/python` | `mcp` | 2.0.0 | `2026-07-28` | **Yes** |
| `client/js` | `@modelcontextprotocol/sdk` | 1.30.0 | `2025-11-25` | **No** |
| `infra/mcp-server` | `fastmcp-slim[server]` | 3.4.5 → pulls `mcp==1.29.0` | `2025-11-25` | **No** |

How to re-check (these are the exact probes used):

```sh
# JS SDK: LATEST_PROTOCOL_VERSION / SUPPORTED_PROTOCOL_VERSIONS
npm view @modelcontextprotocol/sdk dist-tags
grep LATEST_PROTOCOL_VERSION node_modules/@modelcontextprotocol/sdk/dist/esm/types.js

# Python SDK
python -c "import mcp.types as t; print(t.LATEST_PROTOCOL_VERSION)"

# What MCP SDK the server framework actually resolves to
pip install 'fastmcp-slim[server]' && pip show mcp
```

Only the Python client *could* move today. Doing that alone would buy nothing:
the server can't serve the new protocol, so the client would negotiate back
down anyway (`mcp` 2.x keeps `DEFAULT_NEGOTIATED_VERSION = 2025-03-26` and
still dispatches `2025-11-25 and earlier`), and the two clients would drift
apart for no gain.

**Unblock condition:** a `@modelcontextprotocol/sdk` release whose
`LATEST_PROTOCOL_VERSION` is `2026-07-28`, *and* a `fastmcp-slim` release that
resolves `mcp>=2.0`. Migrate the server first, then both clients together —
a stateless-spec client against a stateful-spec server does not interoperate.

## What the migration actually involves

### `client/python` — real code changes, not just a version bump

`src/mcp_client/client.py` has six identical call sites, all of which break:

```python
# now (mcp 1.x)
from mcp.client.streamable_http import streamablehttp_client
async with streamablehttp_client(self.endpoint, headers=self.headers) as (read, write, _):

# mcp 2.x
from mcp.client.streamable_http import streamable_http_client
async with streamable_http_client(
    self.endpoint, http_client=httpx2.AsyncClient(headers=self.headers)
) as (read, write):
```

Three separate breaks in that one line:

1. **Renamed:** `streamablehttp_client` → `streamable_http_client`. This is the
   crash that `mcp>=1.0` (unbounded) already caused in production — see the
   `mcp<2.0` pin.
2. **No `headers=` parameter.** The new signature is
   `(url, *, http_client=None, terminate_on_close=True)`. Per-request headers —
   which is how this repo does auth (`x-api-key`) — must now go through a
   pre-configured `httpx2.AsyncClient`.
3. **Yields a 2-tuple, not a 3-tuple.** `TransportStreams` is
   `tuple[ReadStream, WriteStream]`; the trailing `_` (the session-id callback)
   is gone, consistent with sessions being removed from the spec.

Also note `mcp` 2.x depends on **`httpx2`**, not `httpx` — `client/python`'s
own `httpx>=0.27` dependency needs revisiting at the same time.

`ClientSession.initialize()` still exists in 2.x, so the existing
`await session.initialize()` calls are not immediately fatal, but they become
vestigial under a stateless protocol and should be reviewed rather than
carried over verbatim.

### `infra/mcp-server` — likely low-touch, but gated

`server.py` is written entirely against FastMCP decorators (`@mcp.tool`,
`@mcp.resource`, `@mcp.prompt`) with no hand-rolled session or header
handling, so the wire-level changes — header-based routing via `Mcp-Method` /
`Mcp-Name`, removal of the `initialize` handshake and `Mcp-Session-Id` — should
be absorbed by the framework. The one hardcoded assumption to revisit is the
advertised `"transport": "streamable-http"` in the health payload.

New spec features worth adopting deliberately once unblocked, none of which
are automatic:

- **Cacheable list results** — `ttlMs` / `cacheScope` on `tools/list`,
  `prompts/list`, `resources/list`, `resources/read`. Directly relevant here:
  this is a scale-to-zero, pay-per-request deployment, so client-side caching
  cuts billable invocations.
- **Multi Round-Trip Requests (MRTR)** — `resultType: "input_required"`,
  replacing elicitation-over-held-open-streams. A better fit for Lambda /
  Cloud Run / Container Apps than long-lived streams.
- **Tasks extension** — now formal as `io.modelcontextprotocol/tasks`.

### `client/js` — same shape, blocked hardest

`@modelcontextprotocol/sdk` is caret-pinned `^1.12.0`, so it will not float
into a breaking major on its own. Nothing to do until a version supporting
2026-07-28 is published; expect a transport-call rewrite comparable to the
Python one.

## Explicitly out of scope

Deprecated in this spec but unused here, so no migration work:

- **Roots, Sampling, Logging** — not used by this server or either client.
- **HTTP+SSE legacy transport** — this repo is Streamable HTTP only.
- **DCR → CIMD, RFC 9207 issuer validation, `application_type`** — all OAuth
  authorization-server concerns. Auth here is an `x-api-key` header validated
  in application code against the cloud secret store; there is no OAuth flow.

## Deliberate guards already in place

- `client/python`: `mcp>=1.0,<2.0`
- `client/js`: `@modelcontextprotocol/sdk` `^1.12.0`
- `infra/mcp-server`: `fastmcp-slim[server]>=3.0,<4.0`

All three are protocol-version boundaries, not arbitrary version hygiene.
Lift them together, in the order above, when the unblock condition is met.
