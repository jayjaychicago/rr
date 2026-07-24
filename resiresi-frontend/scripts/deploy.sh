#!/usr/bin/env bash
# Publish resiresi live. Builds first so a broken build fails here, not in the cloud.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Building…"
npm install
npm run build

echo "==> Deploying to production…"
# One-time on a fresh machine: `npx vercel login` and `npx vercel link`.
npx vercel deploy --prod --yes

echo "==> Done. Your changes are live."
