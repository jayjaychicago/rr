#!/usr/bin/env bash
# study-snapshot.sh — capture a clean baseline of the resiresi/nino/gino codebase
# Run this ONCE, now, BEFORE you add the widget or let any tester touch anything.
# It only touches this git repo. It does NOT deploy and does NOT touch apiblaze.
set -euo pipefail

REPO="/home/ubuntu/code/rr"
TAG="study-baseline"
cd "$REPO"

# Protect the things a reset must never delete: Vercel project links + local secrets.
# By git-ignoring them they stay as untracked working files, and `git clean` in the
# reset script will skip them (clean without -x leaves ignored files alone).
cat > .gitignore <<'EOF'
# --- study protection: never track or clean these ---
.vercel/
.env*.local
*.env.production.local
# Keeps the baseline lean and stops `git clean` from forcing a reinstall.
# (node_modules already committed in some apps stays tracked; that's harmless.)
node_modules/
EOF

git add -A
if git diff --cached --quiet; then
  echo "Nothing new to commit; tagging current HEAD as the baseline."
else
  git commit -m "study baseline snapshot ($(git rev-parse --short HEAD 2>/dev/null || echo init))" >/dev/null
fi

git tag -f "$TAG" >/dev/null
echo "✅ Baseline saved."
echo "   tag:    $TAG  ->  $(git rev-parse --short "$TAG")"
echo "   commit: $(git log -1 --oneline)"
echo
echo "Now go add the widget, deploy, and let your tester loose."
echo "When you want a clean slate again, run:  ./study-reset.sh"
