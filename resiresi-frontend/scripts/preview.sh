#!/usr/bin/env bash
# Run resiresi locally on the server so you can see your changes.
# Then port-forward from your laptop:  ssh -i <key>.pem -L 3003:localhost:3003 <user>@<host>
# and open http://localhost:3003
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Installing dependencies…"
npm install

echo "==> Starting the dev server on http://localhost:3003 (Ctrl-C to stop)…"
npm run dev
