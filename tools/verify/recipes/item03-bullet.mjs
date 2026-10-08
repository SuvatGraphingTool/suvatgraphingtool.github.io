// The bullet exhibit mid-flight and at rest, at three muzzle speeds. Items 3 and 4.
const open = async (page, wait) => {
  await page.click('.pcard[data-id="bullet"]');
  await wait(500);
};
const run = async (page, wait, name, settle = 2600) => {
  await open(page, wait);
  const b = page.locator('.intro button', { hasText: name });
  if (await b.count()) { await b.first().click(); await wait(250); }
  const go = page.locator('.intro button', { hasText: /Run it/ });
  if (await go.count()) { await go.first().click(); }
  await wait(300);
  const pace = page.locator('#pace-go');            // the speed card, since item 17
  if (await pace.count() && await pace.isVisible()) await pace.click();
  await wait(settle);
};
export default [
  { name: 'item03-bullet-intro',  run: (p, { wait }) => open(p, wait) },
  { name: 'item03-bullet-air',    run: (p, { wait }) => run(p, wait, 'Air rifle') },
  { name: 'item03-bullet-pistol', run: (p, { wait }) => run(p, wait, 'Pistol') },
  { name: 'item03-bullet-rifle',  run: (p, { wait }) => run(p, wait, 'Service rifle') },
];
