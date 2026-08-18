# @nicculus/simplemcp (npm)

Thin launcher around [`@nicculus/mcp-client`](https://www.npmjs.com/package/@nicculus/mcp-client) — installs it as a
dependency and re-exposes its CLI under the `smcp` command name.

```sh
npm install -g @nicculus/simplemcp
smcp --help
```

If you're fine with the original command name, you can skip this wrapper and
`npm install -g @nicculus/mcp-client` directly — its CLI is `mcp-client`.
