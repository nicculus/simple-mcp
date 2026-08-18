# simple-mcp

Monorepo for the MCP server infrastructure and its client libraries.

| Path | What it is | Published as |
|------|------------|---------------|
| [`infra/`](infra/) | Terraform + GitHub Actions to deploy the MCP server on AWS, GCP, and Azure | — |
| [`client/js/`](client/js/) | TypeScript client library + CLI | [`@nicculus/mcp-client`](https://www.npmjs.com/package/@nicculus/mcp-client) on npm |
| [`client/python/`](client/python/) | Python client library + CLI | [`mcp-client-python`](https://pypi.org/project/mcp-client-python/) on PyPI |
| [`cli/npm/`](cli/npm/) | Launcher wrapping `client/js`'s CLI as `simplemcp` | [`@nicculus/simplemcp`](https://www.npmjs.com/package/@nicculus/simplemcp) on npm |
| [`cli/python/`](cli/python/) | Launcher wrapping `client/python`'s CLI as `simplemcp` | [`nicculus-simplemcp`](https://pypi.org/project/nicculus-simplemcp/) on PyPI |

## Releasing a package

Each package publishes on its own tag prefix (not a shared `v*`), since a monorepo needs to say
which package a tag is for:

- `client-js-vX.Y.Z` → publishes `client/js` to npm
- `client-python-vX.Y.Z` → publishes `client/python` to PyPI (version is derived from the tag via `hatch-vcs`)
- `cli-npm-vX.Y.Z` → publishes `cli/npm` to npm
- `cli-python-vX.Y.Z` → publishes `cli/python` to PyPI

This repo was formed by combining three previously separate repos
(`mcp-infra`, `mcp-client`, `mcp-client-python`) into one, without carrying
over their git history. The originals are archived.

See each subfolder's own `README.md` and `CLAUDE.md` for details — they're
self-contained and assume that subfolder as the working directory.
