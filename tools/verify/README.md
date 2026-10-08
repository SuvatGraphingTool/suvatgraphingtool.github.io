# tools/verify — looking at the thing

A change to a canvas is not verified by reading the diff. This drives a
headless Chromium against `dev-server.mjs` and saves what it sees to
`docs/verify/`, which is what gets reviewed on a pull request.

```
npm --prefix tools/verify install        # once; node_modules is gitignored
node tools/verify/shoot.mjs tools/verify/recipes/<name>.mjs
```

It is deliberately outside the app. Nothing in `js/` imports it, no shipping
package.json mentions it, and the repo still has no build step and no
dependencies — `tools/verify/package.json` is a local harness manifest and is
not the app's.

A recipe default-exports `[{ name, async run(page, { wait }) }]`. `name` is the
PNG filename. Shots that log a console error are reported as failures, so a
screenshot that looks right but threw on the way there does not pass quietly.
