# simplemcp (PyPI)

Thin launcher around [`mcp-client-python`](https://pypi.org/project/mcp-client-python/) — installs it as a
dependency and re-exposes its CLI under the `simplemcp` command name.

```sh
pip install simplemcp
simplemcp --help
```

If you're fine with the original command name, you can skip this wrapper and
`pip install mcp-client-python` directly — its CLI is `mcp-client`.
