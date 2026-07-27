# ResiResi × APIblaze — the guided lab, in your BROWSER (three panes:
# steps on the left, ResiResi's Developers page and Nino's storefront live
# on the right). Prefer the terminal version? That's .\start.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "This lab needs Node.js 20+ — install it from https://nodejs.org and re-run."
}
$major = [int](node -p 'process.versions.node.split(".")[0]')
if ($major -lt 20) {
  Write-Error "Node 20+ required — you have $(node -v). https://nodejs.org"
}

node lab/web/server.mjs
