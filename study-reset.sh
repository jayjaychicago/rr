#!/usr/bin/env bash
# study-reset.sh — revert the codebase to the clean baseline and redeploy everything.
#
# Scope (exactly what you asked for):
#   1. codebase  -> git hard-reset to the `study-baseline` tag + clean untracked edits
#   2. Vercel    -> redeploy nino + gino (their linked prod projects)
#   3. Fly       -> redeploy resiresi-backend, nino-pizza-api, gino-api
#
# It does NOT touch apiblaze proxies/teams/keys — those are expected to survive.
# It does NOT wipe any database (see the note printed at the end).
#
# Usage:
#   ./study-reset.sh            # everything: code + vercel + fly
#   ./study-reset.sh code       # only revert the codebase, no deploys
#   ./study-reset.sh vercel     # revert code + redeploy Vercel only
#   ./study-reset.sh fly        # revert code + redeploy Fly only
set -uo pipefail

REPO="/home/ubuntu/code/rr"
TAG="study-baseline"
WHAT="${1:-all}"
cd "$REPO"

FAILED=()

# ---------------------------------------------------------------------------
# 1. Revert the codebase
# ---------------------------------------------------------------------------
if ! git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  echo "❌ No '$TAG' tag found. Run ./study-snapshot.sh first." >&2
  exit 1
fi

echo "==> Reverting codebase to '$TAG'…"
git reset --hard "$TAG"
# Remove untracked files added since the snapshot (e.g. the widget) but leave
# git-ignored files (.vercel/ links, *.local secrets) untouched.
git clean -fd
echo "    now at: $(git log -1 --oneline)"

[ "$WHAT" = "code" ] && { echo "✅ Codebase reverted (deploys skipped)."; exit 0; }

# ---------------------------------------------------------------------------
# 2. Redeploy Vercel (nino, gino)
# ---------------------------------------------------------------------------
deploy_vercel() {
  local dir="$1" name="$2"
  echo "==> Vercel deploy: $name"
  ( cd "$REPO/$dir" && vercel deploy --prod --yes ) \
    && echo "    ✅ $name deployed" \
    || { echo "    ❌ $name FAILED"; FAILED+=("vercel:$name"); }
}

if [ "$WHAT" = "all" ] || [ "$WHAT" = "vercel" ]; then
  deploy_vercel nino nino
  deploy_vercel gino gino
fi

# ---------------------------------------------------------------------------
# 3. Redeploy Fly (resiresi-backend, nino-pizza-api, gino-api)
# ---------------------------------------------------------------------------
deploy_fly() {
  local dir="$1" config="$2" app="$3"
  echo "==> Fly deploy: $app"
  ( cd "$REPO/$dir" && fly deploy -c "$config" -a "$app" ) \
    && echo "    ✅ $app deployed" \
    || { echo "    ❌ $app FAILED"; FAILED+=("fly:$app"); }
}

if [ "$WHAT" = "all" ] || [ "$WHAT" = "fly" ]; then
  deploy_fly resiresi-backend  fly.toml       resiresi-backend
  deploy_fly restaurant-backend fly.nino.toml  nino-pizza-api
  deploy_fly restaurant-backend fly.gino.toml  gino-api
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo
if [ ${#FAILED[@]} -eq 0 ]; then
  echo "✅ Reset complete. Code reverted and all deploys succeeded."
else
  echo "⚠️  Reset finished, but these deploys failed (re-run or check auth):"
  printf '     - %s\n' "${FAILED[@]}"
fi
echo
echo "NOTE: Fly Postgres data is NOT reset by a redeploy. Any reservations/keys a"
echo "      tester created in the resiresi/nino/gino backend databases still exist."
echo "      To wipe those too, re-seed each backend (fly ssh console -a <app> -C \"npm run seed\")."
[ ${#FAILED[@]} -eq 0 ] || exit 1
