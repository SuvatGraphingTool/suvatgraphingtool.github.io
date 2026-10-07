// Monkey vs Hunter, rebuilt: live sliders, four verdicts, a working drag.
// Item 15.
const open = async (page, wait) => {
  await page.click('.pcard[data-id="monkey"]');
  await wait(700);
};
const slide = async (page, id, v) => {
  await page.locator(id).evaluate((el, x) => {
    el.value = String(x); el.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);
};
const play = async (page, wait) => {
  await page.click('#replay'); await wait(2600);
};
const verdict = (page) => page.evaluate(
  `(() => { const v = window.SUVAT.state.verdict; return v ? v.kind + (v.why?.length ? ' [' + v.why.join(',') + ']' : '') : 'none'; })()`);

const run = (label, setup) => async (page, { wait }) => {
  await open(page, wait);
  if (setup) await setup(page, wait);
  await play(page, wait);
  console.log(`       ${label}: ${await verdict(page)}`);
  return page.locator('#screen-flight');
};

export default [
  { name: 'item15-aimed', run: run('aimed, default speed') },
  { name: 'item15-too-high', run: run('aimed 20° over', (p) => slide(p, '#lv-theta', 56)) },
  { name: 'item15-too-low', run: run('aimed 20° under', (p) => slide(p, '#lv-theta', 16)) },
  { name: 'item15-too-slow', run: run('speed down to 5', (p) => slide(p, '#lv-u', 5)) },
  { name: 'item15-too-fast', run: run('speed up to 60', (p) => slide(p, '#lv-u', 60)) },
  { name: 'item15-re-aim', run: run('aimed wrong then re-aimed', async (p, wait) => {
      await slide(p, '#lv-theta', 60); await wait(200);
      await p.click('#lv-aim'); await wait(200); }) },
  { name: 'item15-controls', el: '.stage-bar', run: async (p, { wait }) => { await open(p, wait); } },

  // THE DRAG. exhibit.js used to install identity inverse projections, so a
  // drag wrote SCREEN PIXELS into a field measured in metres — one drag set
  // the monkey's x to about 620 m and inverted the vertical sense.
  { name: 'item15-drag', run: async (p, { wait }) => {
      await open(p, wait);
      const before = await p.evaluate(`(() => ({ ...window.SUVAT.state.markers.target }))()`);
      const box = await p.locator('#scene').boundingBox();
      const at = await p.evaluate(`(() => {
        const m = window.SUVAT.cam._map, t = window.SUVAT.state.markers.target;
        return { x: m.sx(t.x), y: m.sy(t.y) };
      })()`);
      await p.mouse.move(box.x + at.x, box.y + at.y);
      await p.mouse.down();
      await p.mouse.move(box.x + at.x + 120, box.y + at.y - 60, { steps: 10 });
      await p.mouse.up();
      await wait(400);
      const after = await p.evaluate(`(() => ({ ...window.SUVAT.state.markers.target }))()`);
      console.log(`       monkey ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
      const sane = after.x > before.x && after.x < before.x + 60
                && after.y > before.y && after.y < before.y + 60;
      if (!sane) throw new Error('the drag put the monkey somewhere impossible');
      return p.locator('#screen-flight'); } },
];
