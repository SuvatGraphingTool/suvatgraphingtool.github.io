// The small things. Item 20.
export default [
  // Card shadows: --shadow was declared twice, and the scenery colour won, so
  // every box-shadow in the app resolved to an invalid value and drew nothing.
  { name: 'item20-shadows', el: '.pgroup:nth-child(2)', run: async (p, { wait }) => {
      await wait(600);
      const v = await p.evaluate(`(() => {
        const s = getComputedStyle(document.documentElement);
        return { shadow: s.getPropertyValue('--shadow').trim(),
                 scene: s.getPropertyValue('--scene-shadow').trim(),
                 card: getComputedStyle(document.querySelector('.pcard')).boxShadow };
      })()`);
      console.log('       --shadow:', JSON.stringify(v.shadow),
                  ' --scene-shadow:', JSON.stringify(v.scene),
                  ' card draws:', JSON.stringify(v.card)); } },

  // Controls that cannot work are not offered on an exhibit.
  { name: 'item20-exhibit-bar', el: '.stage-bar', run: async (p, { wait }) => {
      await p.click('.pcard[data-id="bullet"]'); await wait(600);
      const v = await p.evaluate(`(() => ({
        band: document.getElementById('band-seg').hidden,
        shows: document.getElementById('shows').hidden,
        bounce: document.querySelector('.ck.inline').hidden,
        place: document.getElementById('place').textContent,
      }))()`);
      console.log('       on an exhibit:', JSON.stringify(v)); } },

  { name: 'item20-stadium-bar', el: '.stage-bar', run: async (p, { wait }) => {
      await p.click('.pcard[data-id="arc"]'); await wait(300);
      for (const [k, x] of [['u', '25'], ['g', '9.81']]) await p.fill(`#suvat input[data-k="${k}"]`, x);
      await p.fill('#x-theta', '45'); await wait(200);
      await p.click('#launch'); await wait(300);
      await p.click('#pace-go'); await wait(1200);
      const v = await p.evaluate(`(() => ({
        band: document.getElementById('band-seg').hidden,
        shows: document.getElementById('shows').hidden,
        place: document.getElementById('place').textContent,
      }))()`);
      console.log('       at the stadium:', JSON.stringify(v)); } },
];
