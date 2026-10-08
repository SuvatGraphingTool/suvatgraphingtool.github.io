// The ball, at several zooms. Item 9.
const fly = async (page, wait, band = 'pitch') => {
  await page.click('.pcard[data-id="arc"]');
  await wait(300);
  for (const [k, v] of [['u', '25'], ['g', '9.81']]) await page.fill(`#suvat input[data-k="${k}"]`, v);
  await page.fill('#x-theta', '45');
  await wait(250);
  await page.click('#launch');
  await wait(300);
  const pace = page.locator('#pace-go');
  if (await pace.count() && await pace.isVisible()) await pace.click();
  await wait(2500);
  const see = page.locator('#done button', { hasText: /See the diagram/ });
  if (await see.count()) await see.first().click();
  await page.click(`#band-seg button[data-band="${band}"]`);
  await wait(900);
  await page.locator('#scrub').evaluate((el) => {
    el.value = '0.5'; el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await wait(500);
};
export default [
  { name: 'item09-ball-pitch',   run: async (p, o) => { await fly(p, o.wait, 'pitch'); return p.locator('#scene'); } },
  { name: 'item09-ball-stadium', run: async (p, o) => { await fly(p, o.wait, 'stadium'); return p.locator('#scene'); } },
  // Far enough out that the panels must give way to the two-tone disc and
  // its magnifier ring, which is the degrade path this item must not break.
  { name: 'item09-ball-tiny', run: async (p, o) => {
      await fly(p, o.wait, 'district');
      return p.locator('#scene'); } },
  { name: 'item09-ball-zoomed',  run: async (p, o) => {
      await fly(p, o.wait, 'pitch');
      const b = await p.locator('#scene').boundingBox();
      for (let i = 0; i < 16; i++) await p.mouse.wheel(0, -120);
      await o.wait(900);
      return p.locator('#scene'); } },
];
