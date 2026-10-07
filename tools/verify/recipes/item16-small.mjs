// Framing, from a desk-sized flight to a long one. Item 16.
const fly = (u, theta) => async (page, { wait }) => {
  await page.click('.pcard[data-id="arc"]');
  await wait(300);
  for (const [k, v] of [['u', String(u)], ['g', '9.81']]) await page.fill(`#suvat input[data-k="${k}"]`, v);
  await page.fill('#x-theta', String(theta));
  await wait(250);
  await page.click('#launch');
  await wait(300);
  const pace = page.locator('#pace-go');
  if (await pace.count() && await pace.isVisible()) await pace.click();
  await wait(2600);
  const see = page.locator('#done button', { hasText: /See the diagram/ });
  if (await see.count()) await see.first().click();
  await wait(1200);                       // let the fit travel
  const r = await page.evaluate(`(() => ({
    rung: window.SUVAT.cam.heldSpan,
    range: window.SUVAT.traj.range,
    span: (document.getElementById('scene').clientWidth) / window.SUVAT.cam.scale,
  }))()`);
  console.log(`       u=${u} θ=${theta}: range ${r.range.toFixed(2)} m, rung ${r.rung} m, span ${r.span.toFixed(1)} m`);
  return page.locator('#scene');
};
export default [
  { name: 'item16-tiny',   run: fly(1.2, 45) },
  { name: 'item16-small',  run: fly(3, 45) },
  { name: 'item16-medium', run: fly(12, 45) },
  { name: 'item16-normal', run: fly(25, 45) },
  { name: 'item16-big',    run: fly(60, 45) },

  // The band has to STICK across comparable launches and let go for one that
  // is nothing like them — that is the whole trade this item is making.
  { name: 'item16-sticky', run: async (page, { wait }) => {
      await page.click('.pcard[data-id="arc"]'); await wait(300);
      await page.fill('#suvat input[data-k="g"]', '9.81');
      const launch = async (u) => {
        await page.click('#steps .step[data-s="values"]'); await wait(200);
        await page.fill('#suvat input[data-k="u"]', String(u));
        await page.fill('#x-theta', '45');
        await wait(250);
        await page.click('#launch');
  await wait(300);
  const pace = page.locator('#pace-go');
  if (await pace.count() && await pace.isVisible()) await pace.click();
        await wait(2600);
        const d = page.locator('#done button', { hasText: /See the diagram/ });
        if (await d.count()) await d.first().click();
        await wait(1100);
        return page.evaluate(`(() => ({ span: window.SUVAT.cam.heldSpan, r: window.SUVAT.traj.range }))()`);
      };
      const out = [];
      for (const u of [25, 22, 18, 25, 3]) out.push({ u, ...await launch(u) });
      for (const o of out) console.log(`       u=${String(o.u).padStart(2)} range ${o.r.toFixed(1).padStart(6)} m -> frame ${o.span.toFixed(1)} m`);
      return page.locator('#scene'); } },

  // And the fit TRAVELS rather than cutting. Sample the scale every frame for
  // half a second after a launch that needs a very different frame.
  { name: 'item16-travel', run: async (page, { wait }) => {
      await page.click('.pcard[data-id="arc"]'); await wait(300);
      for (const [k, v] of [['u', '60'], ['g', '9.81']]) await page.fill(`#suvat input[data-k="${k}"]`, v);
      await page.fill('#x-theta', '45'); await wait(250);
      await page.click('#launch'); await wait(2600);
      const d1 = page.locator('#done button', { hasText: /See the diagram/ });
      if (await d1.count()) await d1.first().click();
      await wait(900);
      await page.click('#steps .step[data-s="values"]'); await wait(200);
      await page.fill('#suvat input[data-k="u"]', '4'); await wait(250);
      const seen = await page.evaluate(`(async () => {
        const out = [];
        document.getElementById('launch').click();
        for (let i = 0; i < 36; i++) {
          out.push(window.SUVAT.cam.scale);
          await new Promise((r) => requestAnimationFrame(r));
        }
        return out;
      })()`);
      const jumps = seen.slice(1).map((v, i) => Math.abs(Math.log(v / seen[i])));
      const biggest = Math.max(...jumps);
      const total = Math.abs(Math.log(seen[seen.length - 1] / seen[0]));
      console.log(`       scale travelled ${(total / Math.LN2).toFixed(1)} doublings over `
        + `${jumps.filter((j) => j > 1e-4).length} frames; biggest single step `
        + `${(biggest / total * 100).toFixed(0)}% of the journey`);
      if (biggest > total * 0.6) throw new Error('the fit still cuts rather than travels');
      await wait(1400);
      return page.locator('#scene'); } },
];
