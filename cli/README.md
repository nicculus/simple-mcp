# cli

Installer/launcher wrappers around the CLIs already shipped by `client/js`
and `client/python` — not a third implementation. Each just installs the
underlying client as a dependency and re-exposes its CLI under the friendlier
`simplemcp` command name.

| Path | Distribution | Wraps |
|------|--------------|-------|
| [`npm/`](npm/) | `simplemcp` on npm | `client/js` |
| [`python/`](python/) | `simplemcp` on PyPI | `client/python` |

See each subfolder's README for install instructions.
