#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

// @nicculus/mcp-client's package.json restricts "exports" to its library
// entrypoint (".") and only declares an "import" condition (no "require"),
// so resolution must go through import.meta.resolve, not require.resolve.
// We derive the CLI script from the resolved library entry's directory —
// both live in the same dist/ folder.
let cliPath;
try {
  const clientEntryUrl = import.meta.resolve("@nicculus/mcp-client");
  cliPath = path.join(path.dirname(fileURLToPath(clientEntryUrl)), "cli.js");
} catch (err) {
  console.error("simplemcp: could not locate @nicculus/mcp-client — is it installed?");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

// mcp-client's CLI only parses argv when run as the entry script (it checks
// `import.meta.url` against `process.argv[1]`), so it must be spawned as its
// own process rather than imported.
const result = spawnSync(process.execPath, [cliPath, ...process.argv.slice(2)], {
  stdio: "inherit",
});

if (result.error) {
  console.error(`simplemcp: failed to launch mcp-client (${result.error.message})`);
  process.exit(1);
}

process.exit(result.status ?? 1);
