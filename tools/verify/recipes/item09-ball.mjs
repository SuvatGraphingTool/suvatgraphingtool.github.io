// The ball, at several zooms. Item 9.
//
// Pitch / Stadium / Wide were three buttons; they are gone, and there is one
// view plus the wheel. So a zoom here is a number of wheel notches from the
// fitted frame — in is negative deltaY, out is positive, same as a mouse.
const zoom = async (page, wait, notches) => {
  const box = await page.locator('#scene').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < Math.abs(notches); i++) await page.mouse.wheel(0, notches > 0 ? -120 : 120);
  await wait(900);
};
const fly = async (page, wait, notches = 0) => {
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
  await page.click('#fit-btn');
  await wait(900);
  if (notches) await zoom(page, wait, notches);
  await page.locator('#scrub').evaluate((el) => {
    el.value = '0.5'; el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await wait(500);
};
export default [
  { name: 'item09-ball-close',   run: async (p, o) => { await fly(p, o.wait, 12); return p.locator('#scene'); } },
  { name: 'item09-ball-fitted',  run: async (p, o) => { await fly(p, o.wait, 0); return p.locator('#scene'); } },
  // Far enough out that the panels must give way to the two-tone disc and
  // its magnifier ring, which is the degrade path this item must not break.
  { name: 'item09-ball-tiny', run: async (p, o) => {
      await fly(p, o.wait, -14);
      return p.locator('#scene'); } },
  { name: 'item09-ball-zoomed',  run: async (p, o) => {
      await fly(p, o.wait, 28);
      return p.locator('#scene'); } },
];
