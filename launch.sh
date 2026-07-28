#!/usr/bin/env bash
# ResiResi × APIblaze — the guided lab, in your BROWSER (three panes:
# steps on the left, ResiResi's Developers page and Nino's storefront live
# on the right). Prefer the terminal version? That's ./launch_terminal_only.sh
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "This lab needs Node.js 20+ — install it from https://nodejs.org and re-run." >&2
  exit 1
fi
MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$MAJOR" -lt 20 ]; then
  echo "Node 20+ required — you have $(node -v). https://nodejs.org" >&2
  exit 1
fi

exec node lab/web/server.mjs
