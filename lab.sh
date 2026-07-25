#!/usr/bin/env bash
# ResiResi × APIblaze guided lab (macOS / Linux).
# Explains, runs, and pauses at every step. Just: ./lab.sh
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

command -v node >/dev/null 2>&1 || { echo "Node.js 20+ is required — https://nodejs.org"; exit 1; }
command -v npx >/dev/null 2>&1  || { echo "npx is required (ships with Node.js) — https://nodejs.org"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required — https://docker.com/get-started"; exit 1; }

exec node "$DIR/lab/run.mjs" "$@"
