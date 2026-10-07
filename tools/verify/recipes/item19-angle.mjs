// What the app says about the angle of projection. Item 19.
const open = async (page, wait, id = 'arc') => {
  await page.click(`.pcard[data-id="${id}"]`);
  await wait(400);
  await page.click('#guard-toggle');      // let every case be typed in full
  await wait(150);
};
const fill = async (page, pairs) => {
  for (const [k, v] of pairs) await page.fill(`#suvat input[data-k="${k}"]`, v);
};
const SAY = `(() => ({
  band: document.getElementById('mode-say').textContent.replace(/\\s+/g, ' ').trim().slice(0, 190),
  angle: (document.getElementById('theta-say') || {}).textContent?.replace(/\\s+/g, ' ').trim().slice(0, 210) || '',
}))()`;
const show = async (page, label) => {
  const r = await page.evaluate(SAY);
  console.log(`       ${label}\n         band: ${r.band}\n         angle: ${r.angle}`);
};
export default [
  { name: 'item19-derived', el: '.centre.narrow', run: async (p, { wait }) => {
      await open(p, wait);
      await fill(p, [['s', '100'], ['t', '4'], ['g', '9.81']]);
      await p.fill('#x-h', '12'); await wait(400);
      await show(p, 'from s and t'); } },

  { name: 'item19-two', el: '.centre.narrow', run: async (p, { wait }) => {
      await open(p, wait);
      await fill(p, [['s', '60'], ['u', '30'], ['g', '9.81']]);
      await p.fill('#x-h', '0'); await wait(400);
      await show(p, 'the range equation'); } },

  { name: 'item19-line', el: '.centre.narrow', run: async (p, { wait }) => {
      await open(p, wait);
      await fill(p, [['u', '25'], ['g', '9.81'], ['t', '3']]);
      await wait(400);
      await show(p, 'no angle findable'); } },

  { name: 'item19-given', el: '.centre.narrow', run: async (p, { wait }) => {
      await open(p, wait);
      await fill(p, [['u', '28'], ['g', '9.8']]);
      await p.fill('#x-theta', '45'); await p.fill('#x-h', '25'); await wait(400);
      await show(p, 'the angle given'); } },
];
