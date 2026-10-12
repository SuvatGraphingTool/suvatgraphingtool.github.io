// The stadium behind the flight, and what is under the ground. Item 10.
// One view and the wheel, so a zoom is a count of notches from the fitted
// frame rather than one of three buttons. In is negative deltaY.
const fly = async (page, wait, notches = 0) => {
  await page.click('.pcard[data-id="arc"]');
  await wait(300);
  for (const [k, v] of [['u', '25'], ['g', '9.81']]) await page.fill(`#suvat input[data-k="${k}"]`, v);
  await page.fill('#x-theta', '45');
  await wait(200);
  await page.click('#launch');
  await wait(300);
  const pace = page.locator('#pace-go');
  if (await pace.count() && await pace.isVisible()) await pace.click();
  await wait(2500);
  const see = page.locator('#done button', { hasText: /See the diagram/ });
  if (await see.count()) await see.first().click();
  await page.click('#fit-btn');
  await wait(900);
  if (notches) {
    const box = await page.locator('#scene').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let i = 0; i < Math.abs(notches); i++) await page.mouse.wheel(0, notches > 0 ? -120 : 120);
    await wait(900);
  }
  return page.locator('#scene');
};
const dark = async (page) => { await page.click('#theme-btn'); };
export default [
  { name: 'item10-fitted', run: (p, { wait }) => fly(p, wait, 0) },
  { name: 'item10-wide', run: (p, { wait }) => fly(p, wait, -14) },
  { name: 'item10-close', run: (p, { wait }) => fly(p, wait, 12) },
  { name: 'item10-fitted-dark', run: async (p, { wait }) => { await dark(p); return fly(p, wait, 0); } },
];
