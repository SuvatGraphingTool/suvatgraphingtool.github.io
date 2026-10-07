// Monkey vs Hunter: the single-frame exhibit path. Items 3 (regression) and 15.
const run = (preset, at) => async (page, { wait }) => {
  await page.click('.pcard[data-id="monkey"]');
  await wait(400);
  if (preset) {
    const b = page.locator('.intro button', { hasText: preset });
    if (await b.count()) { await b.first().click(); await wait(200); }
  }
  const go = page.locator('.intro button', { hasText: /Run it/ });
  if (await go.count()) await go.first().click();
  await wait(2200);
  const see = page.locator('#done button', { hasText: /See the diagram/ });
  if (await see.count()) await see.first().click();
  await wait(300);
  if (at != null) {
    await page.locator('#scrub').evaluate((el, v) => {
      el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true }));
    }, at);
    await wait(400);
  }
  return page.locator('#screen-flight');
};
export default [
  { name: 'item15-monkey-intro', run: async (p, { wait }) => {
      await p.click('.pcard[data-id="monkey"]'); await wait(600);
      return p.locator('#screen-flight'); } },
  { name: 'item15-monkey-throw', run: run('Throw') },
  { name: 'item15-monkey-mid',   run: run('Throw', 0.55) },
  { name: 'item15-monkey-lob',   run: run('Lob') },
];
