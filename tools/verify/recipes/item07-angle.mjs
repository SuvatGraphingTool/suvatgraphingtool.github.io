// The angle of projection control, on the values screen. Item 7.
const open = async (page, wait, id = 'platform-angle') => {
  await page.click(`.pcard[data-id="${id}"]`);
  await wait(400);
  for (const [k, v] of [['u', '28'], ['g', '9.81']]) {
    await page.fill(`#suvat input[data-k="${k}"]`, v);
  }
  await page.fill('#x-h', '25');
  await wait(250);
};
const atAngle = (deg) => async (page, { wait }) => {
  await open(page, wait);
  await page.fill('#x-theta', String(deg));
  await wait(350);
};
export default [
  { name: 'item07-angle-45',  el: '.xrow[data-x="theta"]', run: atAngle(45) },
  { name: 'item07-angle-neg', el: '.xrow[data-x="theta"]', run: atAngle(-32) },
  { name: 'item07-angle-precise', el: '.xrow[data-x="theta"]', run: atAngle('38.123456') },
  { name: 'item07-angle-capped', el: '.xrow[data-x="theta"]', run: atAngle(720) },
  { name: 'item07-angle-row', el: '#extra', run: atAngle(45) },
  { name: 'item07-angle-blurred', el: '.xrow[data-x="theta"]', run: async (p, { wait }) => {
      await open(p, wait);
      await p.fill('#x-theta', '38.123456');
      await p.locator('#x-theta').blur();
      await wait(350); } },
  { name: 'item07-angle-slider', el: '.xrow[data-x="theta"]', run: async (p, { wait }) => {
      await open(p, wait);
      // drag the slider rather than typing, and see the box follow at 2 dp
      const b = await p.locator('#theta-slider').boundingBox();
      await p.mouse.move(b.x + b.width * 0.5, b.y + b.height / 2);
      await p.mouse.down();
      await p.mouse.move(b.x + b.width * 0.72, b.y + b.height / 2, { steps: 8 });
      await p.mouse.up();
      await wait(350); } },
];
