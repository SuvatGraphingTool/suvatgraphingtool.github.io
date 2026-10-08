// The stadium behind the flight, and what is under the ground. Item 10.
const fly = async (page, wait, band) => {
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
  if (band) await page.click(`#band-seg button[data-band="${band}"]`);
  await wait(900);
  return page.locator('#scene');
};
const dark = async (page) => { await page.click('#theme-btn'); };
export default [
  { name: 'item10-stadium', run: (p, { wait }) => fly(p, wait, 'stadium') },
  { name: 'item10-district', run: (p, { wait }) => fly(p, wait, 'district') },
  { name: 'item10-pitch', run: (p, { wait }) => fly(p, wait, 'pitch') },
  { name: 'item10-stadium-dark', run: async (p, { wait }) => { await dark(p); return fly(p, wait, 'stadium'); } },
];
