# simple-mcp (PowerShell)

Bootstrap script for Windows users who don't already have `npm` or `pip`
scripts memorized — it detects whichever is available and installs
[`@nicculus/simple-mcp`](../npm) (npm) or [`simple-mcp`](../python) (PyPI)
through it.

```powershell
iwr https://raw.githubusercontent.com/nicculus/simple-mcp/main/cli/powershell/install.ps1 | iex
```

Or force a specific package manager:

```powershell
.\install.ps1 -Via pip
```

This script doesn't install anything itself beyond invoking npm/pip — you
still need Node.js or Python installed first.
