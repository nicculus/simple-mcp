# Adopting MCP spec 2026-07-28

Status: **migrated.** Server, `client/python`, and `client/js` all speak
`2026-07-28` end-to-end, verified against a live server (not just mocked
tests) — see "How this was verified" below.

[Announcement.](https://blog.modelcontextprotocol.io/posts/2026-07-28/)

## What shipped

| Component | Package | Version | Speaks 2026-07-28? |
|-----------|---------|---------|------------------------|
| `infra/mcp-server` | `fastmcp-slim[server]` | `4.0.0b3` (BETA — no stable 4.x yet) | **Yes** |
| `client/python` | `mcp` | `2.0.0` | **Yes** |
| `client/js` | `@modelcontextprotocol/client` | `2.0.0` | **Yes** |

Migrated in the order the spec requires: server first, then both clients
together. A stateless-spec client cannot interoperate with a stateful-spec
server, so there was no safe intermediate state — each step below was
verified with the full test suite before moving to the next.

Re-check current registry state with:

```sh
curl -s https://pypi.org/pypi/fastmcp-slim/json | jq '.info.version, ([.releases | keys[]] | map(select(startswith("4."))))'
curl -s https://pypi.org/pypi/mcp/json | jq '.info.version'
npm view @modelcontextprotocol/client dist-tags
```

Note: `@modelcontextprotocol/sdk` (the v1 line `client/js` used to depend on)
is **not** the package that unblocked this migration and never will be —
it stays on 1.x indefinitely. The 2026-07-28-capable client shipped as a
**separate, new package**, `@modelcontextprotocol/client`. An earlier version
of this doc had the unblock condition written against `@modelcontextprotocol/sdk`'s
`LATEST_PROTOCOL_VERSION`, which was simply the wrong package to watch.

## `infra/mcp-server`

`server.py` is pure FastMCP decorators (`@mcp.tool`, `@mcp.resource`,
`@mcp.prompt`) with no hand-rolled session or header handling, so the
wire-level changes were fully absorbed by the framework — all 32 existing
tests passed unmodified against `fastmcp-slim` 4.0.0b3.

One hardcoded value did need fixing: `server://info`'s `"transport"` field
said `"streamable-http"`. FastMCP 4.x renamed its default `transport` literal
on `http_app()` from `"streamable-http"` to `"http"` (both route to the same
streamable-HTTP app internally; `"http"` is just the current accurate name to
advertise). Updated to `"http"`.

`fastmcp-slim` has no stable 4.x release yet — `4.0.0b3` is a **beta**,
pinned deliberately (`>=4.0.0b3,<5.0`) as the server-side half of this
migration. Move off the beta once 4.0.0 stable ships upstream.

## `client/python`

The six call sites in `src/mcp_client/client.py` all needed the three
mechanical fixes anticipated:

1. `streamablehttp_client` → `streamable_http_client` (renamed).
2. No more `headers=` param — headers now go through a pre-configured HTTP
   client via the SDK's own `create_mcp_http_client(headers=...)` helper.
3. Transport yields a 2-tuple (`read, write`), not a 3-tuple — the
   session-id callback is gone.

Plus two **not** anticipated by the original version of this doc, both found
by actually running the migrated client against a live server rather than
trusting mocked tests:

- **`session.initialize()` is a trap, not just "vestigial."** It still
  performs a real handshake in `mcp` 2.x — but that handshake negotiates only
  *legacy* protocol versions, capped at `2025-11-25`
  (`mcp.client.session.LATEST_HANDSHAKE_VERSION`). Calling it unchanged would
  have kept the client on the old protocol permanently despite the dependency
  bump, with no error to signal it. The stateless-spec replacement is
  `session.discover()` (`MODERN_PROTOCOL_VERSIONS = ('2026-07-28',)`); all six
  call sites now call that instead. No legacy fallback was added, since this
  client only ever talks to this repo's own server, which is 2026-07-28-only
  as of this migration.
- **`read_resource` no longer takes `pydantic.AnyUrl`.** The old code wrapped
  the URI in `AnyUrl(uri)`; `mcp` 2.x's `ClientSession.read_resource` takes a
  plain `str` and fails Pydantic validation on anything else. Every mocked
  test still passed with `AnyUrl` passed through (mocks don't validate
  types) — this only surfaced against the real server.

Also dropped the explicit `httpx>=0.27` dependency. `mcp` 2.x's transport
uses `httpx2` internally (via `create_mcp_http_client`), which `client/python`
never imports directly, and `mcp` 2.x doesn't depend on `httpx` (v1) at all —
the old pin was dead weight once nothing in this codebase used it.

## `client/js`

This was a **package swap, not a version bump** — `@modelcontextprotocol/sdk`
stays on the 1.x line permanently; the 2026-07-28-capable client is the new
`@modelcontextprotocol/client` package, with a flattened export surface (no
more `/client/index.js`, `/client/streamableHttp.js`, `/types.js` subpaths —
everything comes from the package root).

Used the official codemod for the mechanical part:

```sh
npx @modelcontextprotocol/codemod v1-to-v2 src
```

(Note: the `@beta` dist-tag referenced in earlier planning no longer exists —
the codemod itself shipped stable `2.0.0`. Plain `@modelcontextprotocol/codemod`
resolves to the right thing now.)

The codemod correctly flattened the import paths in `client.ts` and
`client.test.ts`, but introduced one bug of its own: it emitted **two**
`vi.mock("@modelcontextprotocol/client", ...)` calls for what are now the
same module path (previously two different subpaths), which silently
clobber each other rather than merging — the second call's return value wins
entirely, dropping `Client: MockClient` from the mock. Caught by running the
test suite immediately after the codemod rather than assuming a clean
"5 changes across 2 files" report meant the changes were correct. Fixed by
merging into a single `vi.mock` call.

Same version-negotiation trap as Python, different shape: `Client`'s
`versionNegotiation` option defaults to `mode: 'legacy'` — the plain 2025
connect sequence, byte-identical to not setting the option at all. Left
unset, the client would silently never speak 2026-07-28. Fixed by
constructing with:

```ts
new Client({ name, version }, { versionNegotiation: { mode: { pin: "2026-07-28" } } })
```

One further trap here, again only caught by testing against a live server:
this package's own exported `LATEST_PROTOCOL_VERSION` constant is a
**legacy**-handshake value (`"2025-11-25"` as of `2.0.0`) — there is no
exported constant for the modern protocol version. Pinning to
`LATEST_PROTOCOL_VERSION` fails at connect time with an SDK-thrown error
(`"pinning is for 2026-07-28 and later ... 2025-era servers"`), which is at
least a loud, clear failure rather than a silent downgrade — but it meant the
first live-server test run failed. The literal string `"2026-07-28"` is the
correct value, not a placeholder to replace later.

## How this was verified

Beyond the unit/mocked test suites (32 server tests, 58 `client/python`
tests, 51 `client/js` tests, all passing), each client was run for real
against a live instance of the migrated server:

- `list_tools`, `list_resources`, `read_resource` (including the templated
  `config://{key}` resource), `list_prompts`, `get_prompt`, and `call_tool`
  all exercised end-to-end for both clients.
- The negotiated protocol version was checked explicitly, not inferred from
  success: `session.protocol_version` (Python) and
  `client.getNegotiatedProtocolVersion()` (JS) both confirmed
  **`2026-07-28`**, with JS additionally confirming `getProtocolEra() ===
  'modern'`.

This is what caught the `read_resource(AnyUrl)`, the double-`vi.mock`, and
the JS `LATEST_PROTOCOL_VERSION` trap — none of which the mocked test suites
alone would have surfaced.

## New spec features not yet adopted

Deliberately deferred — this migration was scoped to interoperate at
2026-07-28, not to adopt every new capability it enables:

- **Cacheable list results** — `ttlMs` / `cacheScope` on `tools/list`,
  `prompts/list`, `resources/list`, `resources/read`. Directly relevant here:
  this is a scale-to-zero, pay-per-request deployment, so client-side caching
  cuts billable invocations.
- **Multi Round-Trip Requests (MRTR)** — `resultType: "input_required"`,
  replacing elicitation-over-held-open-streams. A better fit for Lambda /
  Cloud Run / Container Apps than long-lived streams. Neither client
  currently handles an `input_required` result from `read_resource`/etc.;
  none of this server's tools trigger one today, so it's untested rather
  than unsupported.
- **Tasks extension** — now formal as `io.modelcontextprotocol/tasks`.

## Explicitly out of scope

Deprecated in this spec but unused here, so no migration work:

- **Roots, Sampling, Logging** — not used by this server or either client.
- **HTTP+SSE legacy transport** — this repo is Streamable HTTP only.
- **DCR → CIMD, RFC 9207 issuer validation, `application_type`** — all OAuth
  authorization-server concerns. Auth here is an `x-api-key` header validated
  in application code against the cloud secret store; there is no OAuth flow.
