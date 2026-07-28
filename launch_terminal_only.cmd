@echo off
rem ResiResi x APIblaze guided lab - terminal version (Windows).
rem Explains, runs, and pauses at every step. Prefer the browser version
rem (three live panes)? That's launch.cmd
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

node lab\run.mjs %*
