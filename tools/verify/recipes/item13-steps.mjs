// The three step chips. Item 13.
const EXPECT = `(() => [...document.querySelectorAll('#steps .step')].map((b) =>
  b.dataset.s + (b.getAttribute('aria-disabled') === 'true' ? ' OFF' : ' on')
             + (b.getAttribute('aria-current') ? ' <-here' : '')).join(' | '))()`;
export default [
  { name: 'item13-steps-fresh', el: 'header.top', run: async (p, { wait }) => {
      await wait(500);
      console.log('       fresh:', JSON.stringify(await p.evaluate(EXPECT))); } },

  { name: 'item13-steps-chosen', el: 'header.top', run: async (p, { wait }) => {
      await p.click('.pcard[data-id="arc"]'); await wait(400);
      console.log('       scenario chosen, no values:', JSON.stringify(await p.evaluate(EXPECT))); } },

  { name: 'item13-steps-ready', el: 'header.top', run: async (p, { wait }) => {
      await p.click('.pcard[data-id="arc"]'); await wait(300);
      for (const [k, v] of [['u', '25'], ['g', '9.81']]) await p.fill(`#suvat input[data-k="${k}"]`, v);
      await p.fill('#x-theta', '45'); await wait(400);
      console.log('       values in:', JSON.stringify(await p.evaluate(EXPECT))); } },

  { name: 'item13-steps-hover', el: 'header.top', run: async (p, { wait }) => {
      await p.click('.pcard[data-id="arc"]'); await wait(300);
      await p.hover('#steps .step[data-s="scenario"]'); await wait(300); } },

  { name: 'item13-steps-focus', el: 'header.top', run: async (p, { wait }) => {
      await p.click('.pcard[data-id="arc"]'); await wait(300);
      await p.locator('#brand').focus();
      await p.keyboard.press('Tab');
      await wait(300);
      console.log('       focus is on:', await p.evaluate(
        `(() => document.activeElement.className + ' ' + (document.activeElement.dataset.s || ''))()`)); } },
];
