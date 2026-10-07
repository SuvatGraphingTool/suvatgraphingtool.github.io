// The speed chooser between the values and the flight. Item 17.
const toLaunch = async (page, wait, id = 'arc') => {
  await page.click(`.pcard[data-id="${id}"]`);
  await wait(300);
  if (id === 'arc') {
    for (const [k, v] of [['u', '25'], ['g', '9.81']]) await page.fill(`#suvat input[data-k="${k}"]`, v);
    await page.fill('#x-theta', '45');
    await wait(250);
  }
};
export default [
  { name: 'item17-card', run: async (p, { wait }) => {
      await toLaunch(p, wait);
      await p.click('#launch'); await wait(500);
      console.log('       focus is on:', await p.evaluate(`(() => document.activeElement.id)()`));
      await p.keyboard.press('ArrowLeft'); await wait(200);
      console.log('       after one ArrowLeft:', await p.evaluate(`(() => window.SUVAT.state.rate)()`));
      return p.locator('#screen-flight'); } },

  { name: 'item17-slowed', run: async (p, { wait }) => {
      await toLaunch(p, wait);
      await p.click('#launch'); await wait(400);
      await p.locator('#pace-rate').evaluate((el) => {
        el.value = '0.25'; el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await wait(300);
      return p.locator('#screen-flight'); } },

  { name: 'item17-remembered', run: async (p, { wait }) => {
      await toLaunch(p, wait);
      await p.click('#launch'); await wait(400);
      await p.locator('#pace-rate').evaluate((el) => {
        el.value = '0.5'; el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await p.click('#pace-go'); await wait(1400);
      // leave, come back, launch again — the card should offer 0.5 again
      await p.click('#steps .step[data-s="values"]'); await wait(300);
      await p.click('#launch'); await wait(400);
      const r = await p.evaluate(`(() => ({
        card: document.getElementById('pace-rate').value,
        state: window.SUVAT.state.rate,
        bar: [...document.getElementById('rate-seg').children]
               .find((b) => b.getAttribute('aria-pressed') === 'true')?.dataset.rate,
      }))()`);
      console.log('       second launch offers:', JSON.stringify(r));
      return p.locator('#screen-flight'); } },

  { name: 'item17-keyboard', run: async (p, { wait }) => {
      await toLaunch(p, wait);
      // The values screen ignores Enter while the caret is in a box, which is
      // right — filling the last field should not fire the launch under you.
      await p.locator('#x-theta').blur();
      await p.keyboard.press('Enter');          // launch from the values screen
      await wait(600);
      const mid = await p.evaluate(`(() => ({
        hidden: document.getElementById('pace').hidden,
        step: document.getElementById('app').dataset.step,
        focus: document.activeElement.id,
      }))()`);
      console.log('       after the first Enter:', JSON.stringify(mid));
      const open = !mid.hidden;
      await p.keyboard.press('Enter');          // accept and go
      await wait(600);
      const gone = await p.evaluate(`(() => ({
        hidden: document.getElementById('pace').hidden,
        playing: window.SUVAT.state.playing,
      }))()`);
      console.log(`       Enter opened the card: ${open}; Enter again -> ${JSON.stringify(gone)}`);
      if (!open || !gone.hidden || !gone.playing) throw new Error('Enter, Enter did not launch');
      return p.locator('#screen-flight'); } },

  { name: 'item17-exhibit', run: async (p, { wait }) => {
      await toLaunch(p, wait, 'bullet');
      await p.locator('.intro button', { hasText: /Run it/ }).first().click();
      await wait(500);
      return p.locator('#screen-flight'); } },
];
