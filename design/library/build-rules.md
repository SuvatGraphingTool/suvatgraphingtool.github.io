# How a library scenario is built, checked and shipped

Every session that adds to the Past-paper library follows this. The lead
session holds every session to it.

## What counts

- A library scenario is NEW and playable, at the standard of the 12
  hand-built ones. It has:
  - its own stage drawing, showing every thing in the question (the cyclist,
    the train, the cliff, the traffic lights, the point above the ground)
  - values the student can change
  - a working panel with the real numbers substituted
  - s–t, v–t and a–t graphs wherever they make sense
  - the engine reproducing the paper's answers from its numbers
- Never put an exam question on screen that only points at an existing
  scenario. No shelves, lists or indexes of questions.
- A question counts as covered (ticked) only if the app does it end to end
  AND shows everything in it. If it needs a new backdrop, object or figure,
  build that.
- Out of scope: anything that needs another topic (impulse and momentum,
  forces and F = ma, friction, connected particles, calculus, energy). Mark
  that part out of scope; the rest of the question still counts.

## How

- Read CLAUDE.md first. Its four rules are absolute: notation through
  `js/notation.js`, colour is the quantity and dash is the direction, the
  13px floor (canvas labels too), and only `js/core` calculates.
- Read the memory notes in
  `/home/tr/.claude/projects/-home-tr-Projects-SUVAT-new/memory/`.
- Physics goes in `js/core`, with tests. Drawing goes in `js/render`. The
  scenario is data in `js/library.js`, wired through `js/kits/`.
- Every new piece (engine model, backdrop, figure, marker, graph overlay) is
  a general, reusable component, listed in `design/components.md`. Reuse
  before you write. Never duplicate physics that already exists.
- Never copy question text anywhere: the papers are copyrighted. Keep the
  board, paper, year, question number and your own paraphrase.
- Make no live AI calls. Don't touch Ask Suvat's chat code or `worker/`.

## The critic: every scenario, before it ships

Spawn a fresh general-purpose subagent with the Agent tool. Give it none of
your reasoning, only the question reference, the diff and the running app
(your own preview port). It must be extremely harsh. It:

1. Asks whether the scenario is genuinely new, solves the question, and looks
   like the real situation.
2. Compares it with the hand-built scenarios on design, layout, notation,
   colour, labels and polish, and fails anything second-rate.
3. Solves the paper independently and checks the app's answers against it.
4. Tries at least five other sets of numbers, including edge cases (zero,
   negative, never reaches, huge values). It hunts for wrong physics, NaN,
   false claims in the wording, overlapping labels, text under 13px, raw
   computer maths, and clipped layouts at laptop and phone widths.
5. Runs every test suite.

Fix everything and send it back until it passes. Problems are reported in
order of importance. Polish found after round 3 can wait for the audit.

**Every second scenario a session ships:** a deeper audit by another fresh
subagent. It re-tests both scenarios with new numbers, checks them for
consistency with the whole app, and checks nothing that already shipped has
broken.

## Shipping (the AI site only, never `main`)

1. `git fetch`, then rebase onto `origin/ai`.
2. Run every `test/*.test.mjs`.
3. Push fast-forward with `GH_TOKEN=$(gh auth token -u SuvatGraphingTool) git push origin HEAD:ai`.
   Never force-push. Never switch gh's active account.
4. In `/home/tr/Projects/SUVAT-new` (the `ai` checkout, shared by every
   session), run `git pull --ff-only` and then `scripts/deploy-ai.sh`. Never
   leave anything uncommitted there. If git reports a lock, wait a minute and
   retry.
5. curl https://suvat-ai.suvatgraphingtool.workers.dev and confirm the files
   match `origin/ai`. If another session pushed in between, run the deploy
   again, so the site always carries the latest `origin/ai`.
6. Update your rows in the tick list you are working from.

Several sessions push to `ai` at once. Keep commits small, rebase often, keep
edits to shared files (`js/app.js`, `js/library.js`, `js/kits/index.js`,
`js/render/graphs.js`) minimal, and never reformat code you don't own.

## Usage (the user's instruction, 29 Oct: do the same work with less usage, even if it takes longer)

- At most two library sessions work at once; the rest wait their turn. The lead or the watchdog says when.
- Critic and audit subagents run on `model: "sonnet"`, one at a time. Give each a tight brief: the diff, the paper reference and what to try, so it doesn't re-explore the whole app.
- Check with `read_page`, `get_page_text` and JS measurement. Take a screenshot only when nothing else can show the problem, at `scale` 0.5 or lower.
- At most three critic rounds. After round 3, only wrong physics, false claims and broken rules (notation, colour, 13px) block shipping; everything else goes to the audit.
- Don't re-read large files you've already read. Read only the lines you need. Keep reports to two lines.
