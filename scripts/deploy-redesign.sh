#!/usr/bin/env bash
# deploy-redesign.sh — put the `redesign` branch live at its own address, an
# experiment in a new look that touches neither of the real sites.
#
#   https://suvat-redesign.suvatgraphingtool.workers.dev   ← this branch
#   https://suvat-ai.suvatgraphingtool.workers.dev         ← ai, untouched
#   https://suvatgraphingtool.github.io                    ← main, untouched
#
# Same gate as scripts/deploy-ai.sh: what is COMMITTED on `redesign`, and only
# after every suite passes.
set -euo pipefail
cd "$(dirname "$0")/.."
root=$PWD
wrangler=$(git rev-parse --path-format=absolute --git-common-dir)/../worker/node_modules/.bin/wrangler
[ -x "$wrangler" ] || wrangler="$root/worker/node_modules/.bin/wrangler"

[ "$(git rev-parse --abbrev-ref HEAD)" = redesign ] || { echo "Check out the redesign branch first." >&2; exit 1; }
for t in test/*.test.mjs; do node "$t" >/dev/null || { echo "FAILED: $t — not deploying." >&2; exit 1; }; done

out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT
git archive redesign | tar -x -C "$out"
rm -rf "$out/worker" "$out/test" "$out/docs" "$out/design" "$out/.github" "$out/scripts" "$out/tools" "$out/.claude"

cd "$out"
"$wrangler" deploy --name suvat-redesign --assets . \
  --compatibility-date 2026-09-01 --message "$(git -C "$root" log -1 --format='%h %s' redesign | cut -c1-100)"
