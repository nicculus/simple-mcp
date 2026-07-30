# cli

Installer/launcher wrappers around the CLIs already shipped by `client/js`
and `client/python` — not a third implementation. Each just installs the
underlying client as a dependency and re-exposes its CLI under the friendlier
`simple-mcp` command name.

| Path | Distribution | Wraps |
|------|--------------|-------|
| [`npm/`](npm/) | `@nicculus/simple-mcp` on npm | `client/js` |
| [`python/`](python/) | `simple-mcp` on PyPI | `client/python` |
| [`powershell/`](powershell/) | `install.ps1` script | whichever of the above is available |

See each subfolder's README for install instructions.
