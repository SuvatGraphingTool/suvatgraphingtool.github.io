# The redesign — hand-off

An experiment the user asked for on 1 November 2026: the whole app redone in
the spirit of linear.app "with a bit of our taste". It lives apart from the
real sites and they decide later which parts, if any, go back to `ai`.

## Where it lives

| | |
|---|---|
| Branch | `redesign` (worktree `.claude/worktrees/redesign`) |
| Live | https://suvat-redesign.suvatgraphingtool.workers.dev |
| Deploy | `scripts/deploy-redesign.sh` — committed `redesign` only, after every suite |
| Sync from ai | `scripts/sync-redesign.sh` — merges `origin/ai` in a detached worktree, tests, pushes, deploys |
| Push | `GH_TOKEN=$(gh auth token -u SuvatGraphingTool)` — the default gh account gets 403 |

- Redesign work goes on `redesign` **only**. Never on `ai` or `main` unless the user says so.
- Two sessions push this branch: **always `git fetch` and merge `origin/redesign` before pushing.**
- Ask Suvat works here because the redesign address is in `ALLOWED_ORIGINS` in
  `worker/wrangler.toml` **on `ai`** (commit dd96dce). If Ask Suvat ever stops
  answering here, check that line survived first.

## What was built, and where

- **`css/tokens.css`** — rewritten. Inter for the interface, Merriweather still
  the maths. Near-black night (the default) and clean day. 4 px spacing scale,
  radii 6 / 10 / 14, motion tokens (`--spring`, `--spring-soft`, `--dur-1..4`).
  The scene tokens (sky, stadium) re-lit to match. **Physics hues unchanged.**
- **`css/shell.css`** — the redesign's component layer, loaded **last**, so it
  is the final word on every control. The older CSS files are still there and
  still do the inner layout of pieces it doesn't redraw.
- **`js/shell.js`** — the sidebar's views (`data-view` = home / scenarios /
  library on `#app`), breadcrumbs, the step track, the ⌘K command menu, the
  shortcuts sheet, toasts, offline notice, phone drawer, speed popover. It
  **presses the app's own buttons** (a scenario from ⌘K is the real card,
  clicked) and calculates nothing (rule 4).
- **`js/board/ink.js`** — drawing on the whiteboard: hand / pen / highlighter /
  arrow / eraser, undo/redo, ink stored in board coordinates (pans and zooms
  with the frames), kept in localStorage `suvat-board-ink-v1`.
- **`js/app.js`**, small edits only: `launch()` goes straight to `runFlight()`
  (the "How fast?" dialog is gone, its DOM is kept hidden because app.js still
  references it); `syncRate()` also updates the speed popover's scale;
  `applyTheme()` writes `#theme-label`; the theme switch runs in a View
  Transition; default theme is dark; `initShell()` at the end.
- **`index.html`** — the header became the sidebar + top bar; every id app.js
  wires to was kept. The pane layout picker (`#lay`) moved into the Display
  panel, playback speed into the transport bar.

## The design rules it keeps

1. **Chrome is monochrome.** The primary button is ink (white on night, black
   on day), never orange. Switches, chips, the play button: ink. This is the
   house rule in `design/theme.js` — an orange control next to an orange
   velocity line stops reading as a control.
2. **The orange is the brand's only.** The logo, Ask Suvat, the focus ring, the
   current-step dot. Nothing else.
3. **Logos.** The main logo is the orange tile with a white arc ending in a ball
   (`#logo` symbol, also the favicon). The Spark (`#spark`) is the AI's mark,
   used for Ask Suvat only, always the star alone: no tile, no glow, a transparent backdrop (the user, 7 Nov). The wordmark is **SUVAT**, in capitals (the user, 1 Nov; before that it was
   "suvat", and before that "suvat ai"). The tab reads "<where you are> | SUVAT",
   e.g. "Whiteboard | SUVAT", set in js/shell.js crumbs().
4. **Type over decoration.** Big headings tight (−0.03 em), body open (1.6).
   13 px is still the floor everywhere (rule 3).
5. **Every press answers.** Buttons sink (`scale(.965)`, 80 ms in) and spring
   back; toggles travel on `--spring`; floating things spring in.
6. **Frosted glass only on what floats** over moving content (top bar, HUD,
   popovers, dialogs). Everything else is hairline borders.
7. Use **`--frost`** for chrome glass. **Never redefine `--glass`** — the canvas
   scenes read it for windows.

## Bringing in a ship from `ai`

New library scenarios, stages and kits inherit the theme through the tokens and
usually need nothing. Restyle when a ship adds or changes **chrome** (CSS,
cards, dialogs, the parts strip, Ask Suvat replies, the composer). Do it in
`css/shell.css`, not in the older files, so `ai`'s next merge doesn't conflict.

Then: every `test/*.test.mjs`, `node tools/modulepreload.mjs` if modules
changed, fetch + merge `origin/redesign`, push, `scripts/deploy-redesign.sh`,
and check the live bytes match the commit.

## Gotchas already paid for

- `.icon-btn` / `.tbtn` set `display`, so a bare `.x { display:none }` declared
  earlier loses. Hide with a more specific selector (`.top .menu-btn`).
- Anything merely faded still catches the pointer: hide with `visibility`
  (see `.bd-empty`), or drags won't pan.
- `preview_start` reads the **main** checkout's `.claude/launch.json`. Run
  `node dev-server.mjs 4188` from this worktree in the background and open
  `http://localhost:4188` by URL.
- Browser-pane screenshots often lag a frame behind a click; trust a
  `javascript_tool` read of the state over the picture.
- The browser's policy check sometimes refuses the live `workers.dev` address;
  fall back to comparing the live bytes with `curl`.

## Open

- On `ai`: a composed scene with no parts shows "This question has no parts.
  Each one stops the motion…" in the parts strip.
- Whiteboard ink is per browser (localStorage); there is no sync or export yet.
