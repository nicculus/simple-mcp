# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A monorepo with three components, each self-contained with its own `CLAUDE.md`:

- **`infra/`** — Terraform + GitHub Actions to deploy the MCP server on AWS, GCP, Azure. See `infra/CLAUDE.md`.
- **`client/js/`** — TypeScript client library + CLI, published to npm as `@nicculus/mcp-client`. See `client/js/CLAUDE.md`.
- **`client/python/`** — Python client library + CLI, published to PyPI as `mcp-client-python`. See `client/python/CLAUDE.md`.
- **`cli/npm/`** — thin launcher installing `client/js` as a dependency, published to npm as `@nicculus/simplemcp`.
- **`cli/python/`** — thin launcher installing `client/python` as a dependency, published to PyPI as `nicculus-simplemcp`.

The `cli/*` packages are not a third implementation — they exist only to install and re-expose the existing `client/js`/`client/python` CLIs under the `smcp` command name for users who'd rather not know the underlying package names.

Commands documented in each subfolder's `CLAUDE.md` are written relative to that subfolder — `cd` into it first.

## CI/CD

Workflows live in the root `.github/workflows/` and are path-filtered per component (`infra-*.yml`, `client-js-*.yml`, `client-python-*.yml`, `cli-npm-*.yml`, `cli-python-*.yml`) so a change in one component doesn't trigger builds for the others.
