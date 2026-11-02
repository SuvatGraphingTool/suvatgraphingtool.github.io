#!/usr/bin/env bash
# sync-redesign.sh — carry what has just shipped on `ai` into the redesign site.
#
#   https://suvat-redesign.suvatgraphingtool.workers.dev   ← redesign = ai + the new look
#
# Run it after scripts/deploy-ai.sh. It merges origin/ai into origin/redesign in
# a DETACHED worktree of its own — never the shared `ai` checkout, and never the
# `redesign` worktree someone may be designing in — runs every suite, pushes the
# merge to `redesign` fast-forward, and deploys exactly that commit the way
# scripts/deploy-redesign.sh does. A merge conflict stops it with nothing
# pushed: the redesign's own files are resolved by hand, so it says so.
set -euo pipefail
cd "$(dirname "$0")/.."
common=$(git rev-parse --path-format=absolute --git-common-dir)
wt="$(dirname "$common")/.claude/worktrees/redesign-sync"
wrangler="$(dirname "$common")/worker/node_modules/.bin/wrangler"

git fetch -q origin ai redesign
[ -d "$wt" ] || git worktree add -q --detach "$wt" origin/redesign
cd "$wt"
git checkout -q --detach origin/redesign

if git merge-base --is-ancestor origin/ai HEAD; then
  echo "redesign already has everything on ai."
else
  if ! git merge -q --no-edit origin/ai -m "Merge origin/ai into redesign"; then
    git merge --abort
    echo "CONFLICT merging ai into redesign — nothing pushed or deployed. Resolve it by hand." >&2
    exit 1
  fi
  for t in test/*.test.mjs; do node "$t" >/dev/null || { echo "FAILED on redesign: $t — nothing pushed." >&2; exit 1; }; done
  GH_TOKEN=$(gh auth token -u SuvatGraphingTool) git push -q origin HEAD:redesign
fi

# Deployed exactly as scripts/deploy-redesign.sh does: the pages AND the
# accounts API (site/). Deploying the pages alone would take the API down.
out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT
mkdir "$out/public"
git archive HEAD | tar -x -C "$out/public"
cp -R "$out/public/site/." "$out/"
rm -rf "$out/public/worker" "$out/public/test" "$out/public/docs" "$out/public/design" "$out/public/.github" \
       "$out/public/scripts" "$out/public/tools" "$out/public/.claude" "$out/public/site"
msg=$(git log -1 --format='%h %s' | cut -c1-100)
cd "$out"
"$wrangler" deploy --message "$msg"
