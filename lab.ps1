# ResiResi x APIblaze guided lab (Windows PowerShell).
# Explains, runs, and pauses at every step. Just:  .\lab.ps1
# If blocked by execution policy, run once:
#   powershell -ExecutionPolicy Bypass -File .\lab.ps1
$ErrorActionPreference = "Stop"

function Need($cmd, $hint) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Host "$cmd is required — $hint"; exit 1
  }
}
Need node "https://nodejs.org"
Need docker "https://docker.com/get-started"

# ANSI colors render in Windows Terminal / PowerShell 7.
$env:FORCE_COLOR = "1"
node (Join-Path $PSScriptRoot "lab\run.mjs") @args
exit $LASTEXITCODE
