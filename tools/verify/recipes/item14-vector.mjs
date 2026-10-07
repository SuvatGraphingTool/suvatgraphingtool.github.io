// The resultant velocity vector, and what hovering does to it. Item 14.
const fly = async (page, wait) => {
  await page.click('.pcard[data-id="arc"]');
  await wait(300);
  for (const [k, v] of [['u', '25'], ['g', '9.81']]) await page.fill(`#suvat input[data-k="${k}"]`, v);
  await page.fill('#x-theta', '55');
  await wait(200);
  await page.click('#launch');
  await wait(2400);
  const see = page.locator('#done button', { hasText: /See the diagram/ });
  if (await see.count()) await see.first().click();
  await page.locator('#scrub').evaluate((el) => {
    el.value = '0.3'; el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await wait(500);
  return page.locator('#scene');
};
// The renderer publishes the object's screen position on cam._map for the
// pointer code, and app.js already exposes cam — so the harness can point at
// the ball exactly rather than hunting for it.
const BALL = `(() => { const b = window.SUVAT.cam._map.ball; return { x: b.x, y: b.y }; })()`;

const hoverAt = async (page, wait, where) => {
  const box = await page.locator('#scene').boundingBox();
  const b = await page.evaluate(BALL);
  // back along the arc already flown, which is also clickable — and which
  // used to light up the object instead of itself
  const at = where === 'object' ? b : await page.evaluate(`(() => {
    const m = window.SUVAT.cam._map, tr = window.SUVAT.traj, t = window.SUVAT.state.t;
    const q = tr.pos(t * 0.4);
    return { x: m.sx(q.x), y: m.sy(q.y) };
  })()`);
  await page.mouse.move(box.x + at.x, box.y + at.y);
  await wait(300);
  const cur = await page.locator('#scene').evaluate((el) => el.style.cursor);
  console.log(`       pointer on the ${where}: cursor is "${cur}"`);
  return page.locator('#scene');
};

export default [
  { name: 'item14-rest', run: (p, { wait }) => fly(p, wait) },
  { name: 'item14-hover-object', run: async (p, { wait }) => {
      await fly(p, wait); return hoverAt(p, wait, 'object'); } },
  { name: 'item14-hover-path', run: async (p, { wait }) => {
      await fly(p, wait); return hoverAt(p, wait, 'path'); } },
];
