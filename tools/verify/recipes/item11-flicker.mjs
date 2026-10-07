// The flicker. Item 11.
//
// Not a picture but a MEASUREMENT: grab the canvas as it is, then wheel,
// drag, click and hover all over it, sampling the mean brightness of the
// stands on every frame. If anything crosses a visual threshold while the
// camera is "moving", that number jumps. A still frame and a moving frame
// should differ by rounding, not by a flood fill.
const fly = async (page, wait, band = 'stadium') => {
  await page.click('.pcard[data-id="arc"]');
  await wait(300);
  for (const [k, v] of [['u', '25'], ['g', '9.81']]) await page.fill(`#suvat input[data-k="${k}"]`, v);
  await page.fill('#x-theta', '45');
  await wait(200);
  await page.click('#launch');
  await wait(2400);
  const see = page.locator('#done button', { hasText: /See the diagram/ });
  if (await see.count()) await see.first().click();
  await page.click(`#band-seg button[data-band="${band}"]`);
  await wait(900);
};

// mean luminance of a strip over the west stand, read straight off the canvas
const SAMPLE = `(() => {
  const c = document.getElementById('scene');
  const g = c.getContext('2d');
  const d = window.devicePixelRatio > 1 ? 2 : 1;
  const x = Math.round(c.width * 0.03), y = Math.round(c.height * 0.62);
  const w = Math.round(c.width * 0.16), h = Math.round(c.height * 0.2);
  const px = g.getImageData(x, y, w, h).data;
  let s = 0;
  for (let i = 0; i < px.length; i += 4) s += 0.2126*px[i] + 0.7152*px[i+1] + 0.0722*px[i+2];
  return s / (px.length / 4);
})()`;

// A coarse map of the WHOLE canvas — 24x14 cells of mean luminance. The strip
// above catches the stand flood fill; this catches everything else that rode
// the same flag: the goal net's mesh, the hoarding panels, the far-field grid
// step, and the interior columns, concourse floors and stair core appearing
// and vanishing. If any element switches on or off, its cell moves.
const GRID = `(() => {
  const c = document.getElementById('scene');
  const g = c.getContext('2d');
  const CX = 24, CY = 14, out = [];
  const cw = Math.floor(c.width / CX), ch = Math.floor(c.height / CY);
  for (let j = 0; j < CY; j++) for (let i = 0; i < CX; i++) {
    const px = g.getImageData(i * cw, j * ch, cw, ch).data;
    let s = 0;
    for (let k = 0; k < px.length; k += 4) s += 0.2126*px[k] + 0.7152*px[k+1] + 0.0722*px[k+2];
    out.push(s / (px.length / 4));
  }
  return out;
})()`;

const churn = async (page, wait) => {
  const box = await page.locator('#scene').boundingBox();
  const cx = box.x + box.width * 0.12, cy = box.y + box.height * 0.7;
  const samples = [];
  const take = async () => { samples.push(await page.evaluate(SAMPLE)); };
  await take();
  for (let i = 0; i < 10; i++) {           // single wheel ticks, the alternating case
    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, i % 2 ? 1 : -1);
    await wait(30); await take();
  }
  await page.mouse.move(cx, cy);           // a drag
  await page.mouse.down();
  for (let i = 0; i < 10; i++) { await page.mouse.move(cx + i * 6, cy + i * 2); await wait(25); await take(); }
  await page.mouse.up();
  await wait(40); await take();
  for (let i = 0; i < 8; i++) {            // plain hovering
    await page.mouse.move(cx + i * 20, cy - i * 9); await wait(30); await take();
  }
  await wait(500); await take();           // and settled
  return samples;
};

const run = (band, theme) => async (page, { wait }) => {
  if (theme === 'dark') { await page.click('#theme-btn'); await wait(200); }
  await fly(page, wait, band);

  // still, then held mid-drag, then still again
  const still = await page.evaluate(GRID);
  const box = await page.locator('#scene').boundingBox();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4 + 3, box.y + box.height * 0.6 + 1);
  await wait(60);
  const held = await page.evaluate(GRID);
  await page.mouse.up();
  await wait(400);

  const cell = Math.max(...still.map((v, i) => Math.abs(v - held[i])));
  const s = await churn(page, wait);
  const lo = Math.min(...s), hi = Math.max(...s);
  const swing = hi - lo;
  console.log(`       ${theme} ${band}: stands ${swing.toFixed(1)}/255 over ${s.length} frames `
    + `· worst cell while dragging ${cell.toFixed(1)}/255`);
  if (swing > 12) throw new Error(`the stands change tone by ${swing.toFixed(1)}/255 while the camera moves`);
  if (cell > 18) throw new Error(`a part of the frame changes by ${cell.toFixed(1)}/255 the moment a drag starts`);
  return page.locator('#scene');
};

export default [
  { name: 'item11-light-stadium', run: run('stadium', 'light') },
  { name: 'item11-dark-stadium',  run: run('stadium', 'dark') },
  { name: 'item11-light-pitch',   run: run('pitch', 'light') },
  { name: 'item11-dark-district', run: run('district', 'dark') },
];
