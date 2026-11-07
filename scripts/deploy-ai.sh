#!/usr/bin/env bash
# deploy-ai.sh — put the `ai` branch live at its own address, for trying
# Ask Suvat out away from the real site.
#
#   https://suvat-ai.suvatgraphingtool.workers.dev   ← this branch, Ask Suvat on
#     (a static-assets Worker: new Cloudflare Pages projects are Workers now)
#   https://suvatgraphingtool.github.io             ← main, untouched
#
# It deploys what is COMMITTED on `ai`, nothing in the working tree, and only
# after every suite passes — the same gate .github/workflows/pages.yml keeps
# for main. When something here is good enough, merge `ai` into main.
set -euo pipefail
cd "$(dirname "$0")/.."
root=$PWD

[ "$(git rev-parse --abbrev-ref HEAD)" = ai ] || { echo "Check out the ai branch first." >&2; exit 1; }
for t in test/*.test.mjs; do node "$t" >/dev/null || { echo "FAILED: $t — not deploying." >&2; exit 1; }; done

out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT
git archive ai | tar -x -C "$out"
rm -rf "$out/worker" "$out/test" "$out/docs" "$out/design" "$out/.github" "$out/scripts" "$out/tools"

# Run from the export, not worker/: worker/wrangler.toml is the reader's
# config, and a deploy from there would replace the reader with this site.
cd "$out"
"$root/worker/node_modules/.bin/wrangler" deploy --name suvat-ai --assets . \
  --compatibility-date 2026-09-01 --message "$(git -C "$root" log -1 --format='%h %s' ai)"
