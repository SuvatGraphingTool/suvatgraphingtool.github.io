// The over-filling guard. Item 18.
const open = async (page, wait) => {
  await page.click('.pcard[data-id="arc"]');
  await wait(400);
};
const fill = async (page, pairs) => {
  for (const [k, v] of pairs) await page.fill(`#suvat input[data-k="${k}"]`, v);
};
const STATE = `(() => ({
  boxes: [...document.querySelectorAll('#suvat .sbox')]
    .map((b) => b.dataset.k + (b.dataset.locked === 'true' ? ':LOCKED' : ':open')).join(' '),
  say: document.getElementById('guard-say').textContent,
  msg: document.getElementById('solve-msg').textContent.slice(0, 110),
  notes: [...document.querySelectorAll('#notes li')].map((l) => l.textContent).join(' | ').slice(0, 220),
}))()`;
export default [
  { name: 'item18-open', el: '.centre.narrow', run: async (p, { wait }) => {
      await open(p, wait);
      console.log('       nothing entered:', JSON.stringify(await p.evaluate(STATE), null, 0).slice(0, 220)); } },

  { name: 'item18-locked', el: '.centre.narrow', run: async (p, { wait }) => {
      await open(p, wait);
      await fill(p, [['u', '28'], ['g', '9.8']]);
      await p.fill('#x-theta', '45'); await p.fill('#x-h', '25');
      await wait(400);
      const r = await p.evaluate(STATE);
      console.log('       determined:', r.boxes);
      console.log('       says:', r.say); } },

  { name: 'item18-released', el: '.centre.narrow', run: async (p, { wait }) => {
      await open(p, wait);
      await fill(p, [['u', '28'], ['g', '9.8']]);
      await p.fill('#x-theta', '45'); await p.fill('#x-h', '25');
      await wait(300);
      await p.click('#guard-toggle'); await wait(300);
      const r = await p.evaluate(STATE);
      console.log('       after releasing:', r.boxes);
      console.log('       says:', r.say); } },

  { name: 'item18-redundant', el: '.centre.narrow', run: async (p, { wait }) => {
      await open(p, wait);
      await p.click('#guard-toggle'); await wait(200);      // allow over-filling
      await fill(p, [['u', '28'], ['g', '9.8'], ['s', '100']]);
      await p.fill('#x-theta', '45'); await p.fill('#x-h', '25');
      await wait(400);
      console.log('       redundant but consistent:', (await p.evaluate(STATE)).notes); } },

  { name: 'item18-conflict', el: '.centre.narrow', run: async (p, { wait }) => {
      await open(p, wait);
      await p.click('#guard-toggle'); await wait(200);
      await fill(p, [['u', '28'], ['g', '9.8'], ['s', '300']]);
      await p.fill('#x-theta', '45'); await p.fill('#x-h', '25');
      await wait(400);
      const r = await p.evaluate(STATE);
      console.log('       contradictory:', r.msg);
      console.log('       launch disabled:', await p.evaluate(`(() => document.getElementById('launch').disabled)()`)); } },
];
