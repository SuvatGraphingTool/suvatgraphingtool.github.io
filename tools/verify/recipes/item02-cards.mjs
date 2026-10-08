// The two exhibit cards, in both themes. Item 2.
const pick = async (page, wait, theme) => {
  if (theme === 'dark') await page.click('#theme-btn');
  await wait(400);
  return page.locator('.pgroup').last();
};
export default [
  { name: 'item02-cards-light', run: (p, { wait }) => pick(p, wait, 'light') },
  { name: 'item02-cards-dark',  run: (p, { wait }) => pick(p, wait, 'dark') },
];
