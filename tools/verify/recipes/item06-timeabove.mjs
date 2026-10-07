// Time above a line: the bounded region, the handle, and both boxes. Item 6.
const open = async (page, wait) => {
  await page.click('.pcard[data-id="time-above"]');
  await wait(400);
  for (const [k, v] of [['u', '24'], ['g', '9.81'], ['t', '3.2']]) {
    await page.fill(`#suvat input[data-k="${k}"]`, v);
  }
  await page.fill('#x-theta', '40');
  await page.fill('#x-h', '0.9');
  await wait(300);
};
const fly = async (page, wait) => {
  await open(page, wait);
  await page.click('#launch');
  await wait(300);
  const pace = page.locator('#pace-go');
  if (await pace.count() && await pace.isVisible()) await pace.click();
  await wait(2500);
  const see = page.locator('#done button', { hasText: /See the diagram/ });
  if (await see.count()) await see.first().click();
  await wait(400);
};
export default [
  { name: 'item06-values', el: '#extra', run: async (p, { wait }) => { await open(p, wait); } },
  { name: 'item06-region', run: async (p, { wait }) => { await fly(p, wait); return p.locator('#screen-flight'); } },
  { name: 'item06-hover-handle', run: async (p, { wait }) => {
      await fly(p, wait);
      const box = await p.locator('#scene').boundingBox();
      // Walk down the canvas until the cursor says the line is grabbable,
      // then stop there — that is the state worth photographing.
      for (let y = 20; y < box.height - 20; y += 3) {
        await p.mouse.move(box.x + 76, box.y + y);
        const c = await p.locator('#scene').evaluate((el) => el.style.cursor);
        if (c === 'ns-resize') break;
      }
      await wait(400);
      return p.locator('#screen-flight'); } },
  { name: 'item06-time-box', el: '#extra', run: async (p, { wait }) => {
      await open(p, wait);
      await p.fill('#x-above', '1.5');
      await wait(300); } },
  { name: 'item06-time-refused', el: '#extra', run: async (p, { wait }) => {
      await open(p, wait);
      await p.fill('#x-above', '9');
      await wait(300); } },
  { name: 'item06-fraction', el: '#extra', run: async (p, { wait }) => {
      await open(p, wait);
      await p.fill('#x-line', '15/2');
      await wait(300); } },
];
