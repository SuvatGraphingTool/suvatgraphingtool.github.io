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

## How it looks (the user, 29 Oct: "it has to look really good and satisfying")

The user's verdict on the library so far: un-detailed, "a bunch of BLOCKS". Correct
physics on a flat rectangle fails. Every library scenario must look like a
finished illustration, at least as rich as the stadium (`js/world/`) and the
best of the hand-built scenes.

- **A real background for every scene.** Sky with a gradient and soft clouds or
  an interior with walls and light; ground with texture (grass, tarmac with
  lane markings, rails with sleepers and ballast, sea with waves, stone with
  courses); depth: a far layer (hills, skyline, trees) behind the action.
  Backdrops are shared components in `js/render/backdrops.js`, chosen per
  scenario, never a plain fill.
- **Detailed objects, not boxes.** A car has wheels with hubs, windows, lights,
  a body with curves and shading; a train has carriages, windows, a pantograph;
  a person has a readable pose; a tower has stone courses and a parapet; a ball
  has shading and a highlight. Soft shadows on the ground under things.
  Gradients and highlights, rounded corners, consistent lighting from one side.
- **Animation when something happens.** Wheels turn with the distance covered;
  a landing kicks up dust or a splash; a bounce squashes the ball and rings the
  floor; a collision flashes; brake lights come on when it slows; a catch
  closes the hand; the moment two meet pulses. Smooth easing, nothing jerky,
  and every effect runs off the engine's times (rule 4: the engine says WHEN,
  the art only shows it).
- **The teaching layer stays clean on top.** Vectors, markers, labels and
  rulers keep the colour-is-quantity rule and the 13px floor, and stay readable
  over the richer art (halo or backing behind text where needed).
- **Draggable and zoomable, like everything else.** Every library stage uses the
  same camera as the hand-built scenes (drag to pan, wheel and pinch to zoom,
  fit and reset). No stage is a fixed picture.
- **Opens runnable.** Every scenario carries an `example` (its first paper's
  numbers) that fills the values screen on click while `PREFILL` is on.
- Build these as reusable pieces in `js/render/` (figures, backdrops, effects),
  listed in `design/components.md`, so every scenario and every future one
  gets them.

**The UI/UX critic.** Every scenario gets a second critic, separate from the
physics one, whose only job is how it looks and feels. It takes screenshots at
laptop and phone widths, at the start, mid-motion and at each event, and
compares them side by side with the hand-built scenes and the stadium. It
fails anything that looks like blocks, a flat background, an object with no
detail, a missing or jerky event animation, cramped or overlapping labels,
or a layout that feels unfinished. It reports what to draw better, not just
what is wrong. No scenario ships until it passes.

## Usage (the user's instruction, 29 Oct: do the same work with less usage, even if it takes longer)

- At most two library sessions work at once; the rest wait their turn. The lead or the watchdog says when.
- Critic and audit subagents run on Opus (the default model, no `model` override), one at a time. Give each a tight brief: the diff, the paper reference and what to try, so it doesn't re-explore the whole app. (Changed 29 Oct: the user wants Opus back for quality.)
- Check numbers and wording with `read_page`, `get_page_text` and JS measurement. Judge how it LOOKS from screenshots: that is what they are for (see "How it looks").
- At most three critic rounds. After round 3, only wrong physics, false claims and broken rules (notation, colour, 13px) block shipping; everything else goes to the audit.
- Don't re-read large files you've already read. Read only the lines you need. Keep reports to two lines.
