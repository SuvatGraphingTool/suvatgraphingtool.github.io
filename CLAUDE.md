# SUVAT — house rules

An interactive projectile-motion playground for A-level physics and maths.
No build step, no dependencies: HTML, CSS and ES modules. `node dev-server.mjs`,
then http://localhost:4173.

## Where work goes — every session, new ones included

**All work happens on the dev site**: the `redesign` branch, live at
https://suvat-redesign.suvatgraphingtool.workers.dev. Work in or from
`.claude/worktrees/redesign`, and put a change live with
`git pull --ff-only && scripts/deploy-redesign.sh`.

**Leave `main` alone.** It is the live site for students
(https://suvatgraphingtool.github.io), and nothing goes onto it, or onto `ai`,
until the user says so. If this session opened on another branch, the work still
goes to `redesign`.

The two sites share a backend. `site/` (accounts) and `worker/` (the question
reader) serve the live site too, so deploying either changes it even with `main`
untouched: keep them compatible, and tell the user first.

## The four rules

Read these four before editing anything. They are the rules the codebase is
already keeping, and breaking one of them is a regression even when the tests
are silent.

### 1 · Maths is set as maths, never as code

No computer maths reaches the screen: no `^2`, no `sqrt`, no `*`, no `/` for a
division, no `<=`, no `u_y`, no `-9.81` written with a hyphen.

Every formula, rearrangement, substitution and number goes through
**[`js/notation.js`](js/notation.js)** — the only thing in the codebase that
decides what a symbol looks like:

```js
import { M, T, num, signed } from './notation.js';

M`(v^2 - u^2)/(2a)`    // typeset HTML: a stacked fraction, italic quantities
T`sqrt(u^2 + 2gh)`     // Unicode alone, for canvas labels and aria text
num(-9.81)             // −9.81, with a minus sign
signed(-9.81)          // (−9.81), bracketed and ready to substitute
```

Write the source the easy way and let the module set it. Interpolate numbers,
not prose. A sink that receives it must use `innerHTML`, not `textContent`.
Prose stays prose — a sentence with a quantity in it is not an equation.

The notation, the reasoning and the two stated limits:
**[`design/notation.md`](design/notation.md)**.
Enforced by **`node test/notation.test.mjs`**, which sweeps everything the app
can display and fails on any of it. Add a formula through `` M`` `` and the
sweep covers it for free; add one as a raw string and the sweep fails.

### 2 · Colour is the quantity, dash is the direction

Velocity, displacement and acceleration each have a hue; horizontal components
are dashed and vertical ones solid. The hues are validated together for colour
blindness — read `design/theme.js` before changing any of them, and re-run the
check.

### 3 · 13px is the floor, canvas labels included

Canvas text ignores CSS, so the floor is enforced by hand in
`js/render/util.js`. A teacher at the back of the room is the test.

### 4 · The engine calculates; nothing else does

`js/core/` computes. The working panel, the resolve card and the question reader
display what it computed, and claim nothing it did not.

## Layout

```
index.html              one screen; the scenario picker is a dropdown
css/tokens.css          design system — colours, type, spacing
css/app.css             laptop-first three-column layout
css/math.css            how a typeset equation looks
css/rtl.css             Arabic mode only: the face, and what mirrors and what does not
js/notation.js          maths set as maths — the source notation and its output
js/i18n.js              the language: lang(), t(), the switch; js/i18n/ar.js, loaded only in Arabic (design/arabic-glossary.md)
js/scenarios.js         the scenarios, as data
js/working.js           the working out, with real numbers substituted
js/core/suvat.js        the five equations and a solver that shows its working
js/core/solve.js        what the student knows -> the motion, or a reason why not
js/core/projectile.js   the idealised projectile model
js/core/descent.js      a parachute drop: three phases, each one of them SUVAT
js/core/road.js         a vehicle along a straight road: the five, with no gravity in them
js/core/stages.js       a motion in stages along one line, and when two such motions meet
js/core/pair.js         two particles in one vertical line, set off at different times
js/core/journey.js      a journey in three stages, rest to rest: the trapezium and its area
js/core/overtake.js     two on one road: when they are level, or the one number that makes them
js/core/plane.js        a particle in a plane with a constant acceleration vector, in i and j
js/core/target.js       a projectile that has to pass one point: over a wall, a net, a tree, or through a target
js/core/numeric.js      snap and fractions, shared by every engine
js/library.js           the Past-paper library: new scenarios, each naming its papers
js/kits/                a library scenario's pieces wired for the app — see design/components.md
js/core/question.js     exam question -> engine parameters
js/board/               the whiteboard: describe a motion, get a board of the app's own pieces
js/compose/             the composer: Ask Suvat's recipes, checked against the registry of pieces, and the reveal;
                        anything else a question throws (things.js, pictures.js, svgsafe.js, icons.json)
js/render/              the scene, the graphs, canvas helpers
js/world/               the stadium — and nothing outside it
worker/                 Cloudflare Worker for reading a photo of a question
design/                 tokens, notation, scenario research, preset list,
                        components.md (the library's reusable pieces), library/catalogue.md
```

## Tests

```bash
node test/engine.test.mjs       # the physics
node test/solve.test.mjs        # what the engine does with partial information
node test/question.test.mjs     # the question reader
node test/pace.test.mjs         # how fast a flight should be played back
node test/scenarios.test.mjs    # the scenarios, as data
node test/preload.test.mjs      # the modulepreload hints match the real graph
node test/notation.test.mjs     # that no computer maths reaches a student
node test/blueprint.test.mjs    # the whiteboard: the model lays out, the engine calculates
node test/compose.test.mjs      # the composer: recipes held to the registry, played by the engine's kit
node test/anything.test.mjs     # draw anything: the ladder, the word, the sender, the sanitiser, /draw, materials
node test/library.test.mjs      # the Past-paper library: each scenario against its mark schemes
node test/chats.test.mjs       # Ask Suvat's chats, kept in this browser
node test/account.test.mjs     # accounts: sign-in, sessions, chats kept per account (site/)
node test/sense.test.mjs       # common sense: everyday sentences always run, and what is assumed is said
node test/focus.test.mjs       # the reader sends each question only the catalogue it needs (worker/src/focus.js)
node test/i18n.test.mjs        # Arabic mode: the dictionary, templates, maths left to right, the toggle, the reader told the language
```
