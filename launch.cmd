@echo off
rem ResiResi x APIblaze - the guided lab, in your BROWSER (three panes:
rem steps on the left, ResiResi's Developers page and Nino's storefront live
rem on the right). Prefer the terminal version? That's launch_terminal_only.cmd
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo This lab needs Node.js 20+ - install it from https://nodejs.org and re-run.
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"
if errorlevel 1 (
  echo Node 20+ required - you have an older version. https://nodejs.org
  exit /b 1
)

node lab\web\server.mjs
