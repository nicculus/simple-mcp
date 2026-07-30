#Requires -Version 5.1
<#
.SYNOPSIS
    Installs the simple-mcp CLI on Windows.
.DESCRIPTION
    Detects an available package manager (npm or pip) and installs simple-mcp
    through it. Use -Via to force one over the other.
.PARAMETER Via
    Which package manager to install through: "npm", "pip", or "auto"
    (default) to pick whichever is found, preferring npm.
.EXAMPLE
    iwr https://raw.githubusercontent.com/nicculus/simple-mcp/main/cli/powershell/install.ps1 | iex
#>
param(
    [ValidateSet("npm", "pip", "auto")]
    [string]$Via = "auto"
)

$ErrorActionPreference = "Stop"

function Test-CommandExists {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

$hasNpm = Test-CommandExists "npm"
$hasPip = Test-CommandExists "pip"

if ($Via -eq "auto") {
    if ($hasNpm) {
        $Via = "npm"
    } elseif ($hasPip) {
        $Via = "pip"
    } else {
        Write-Error "Neither npm nor pip was found on PATH. Install Node.js (https://nodejs.org) or Python (https://python.org), then re-run this script."
        exit 1
    }
}

switch ($Via) {
    "npm" {
        if (-not $hasNpm) {
            Write-Error "npm was requested via -Via but is not on PATH."
            exit 1
        }
        Write-Host "Installing simple-mcp via npm..."
        npm install -g "@nicculus/simple-mcp"
    }
    "pip" {
        if (-not $hasPip) {
            Write-Error "pip was requested via -Via but is not on PATH."
            exit 1
        }
        Write-Host "Installing simple-mcp via pip..."
        pip install --user simple-mcp
    }
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Installation failed (exit code $LASTEXITCODE)."
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "simple-mcp installed via $Via. Run 'simple-mcp --help' to get started."
Write-Host "(If the command isn't found, open a new shell so your updated PATH takes effect.)"
