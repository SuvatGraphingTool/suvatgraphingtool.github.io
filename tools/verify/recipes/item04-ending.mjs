// The range exhibit's own ending card, and the overview behind it. Item 4.
const toEnd = (name) => async (page, { wait }) => {
  await page.click('.pcard[data-id="bullet"]');
  await wait(400);
  const b = page.locator('.intro button', { hasText: name });
  if (await b.count()) { await b.first().click(); await wait(200); }
  await page.locator('.intro button', { hasText: /Run it/ }).first().click();
  await wait(300);
  const pace = page.locator('#pace-go');
  if (await pace.count() && await pace.isVisible()) await pace.click();
  await wait(2400);
};
export default [
  { name: 'item04-ending-rifle', run: toEnd('Service rifle') },
  { name: 'item04-ending-air',   run: toEnd('Air rifle') },
  { name: 'item04-overview', run: async (p, o) => {
      await toEnd('Service rifle')(p, o);
      await p.click('#exdone-all');
      await o.wait(600);
      return p.locator('#screen-flight'); } },
];
