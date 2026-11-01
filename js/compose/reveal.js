// reveal.js — the moment a composed scene arrives.
//
// Ask Suvat has put a scene together from the app's pieces. Rather than cut
// to it, the stage opens behind a veil: the scene blurred and shimmering,
// the Spark (Ask Suvat's mark) large and glowing in the middle, and a line
// that names each piece as it goes in — "Placing a sea cliff", "Bringing in
// a car", "Adding a splash" — the
// recipe's own pieces, in order, each ticked off below it. Then the veil
// lifts from the top down, the way an image generator resolves its picture,
// and the motion plays.
//
// The pieces named are the ones the recipe really used (js/compose/
// registry.js); the veil claims nothing else. Reduced motion: a short fade.

import { FIGURES, EFFECTS, placeOf } from './registry.js';

/** The Spark, Ask Suvat's mark: the one `#spark` symbol in index.html. */
const SPARK = '<svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true"><use href="#spark"/></svg>';
const BELOW = { sea: 'the sea', river: 'the river', pool: 'the pool', ground: 'the ground', beach: 'the beach', road: 'the road', rails: 'the track', floor: 'the floor' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** What the veil says, step by step: [{ say, chip }], from the recipe. */
export function steps(R) {
  const B = placeOf(R), out = [];
  const bare = (s) => s.replace(/^(an?|the) /i, '');
  out.push({ say: `Placing ${B.label.toLowerCase()}`, chip: bare(B.label.toLowerCase()) });
  const below = BELOW[B.below];
  if (below && !B.label.toLowerCase().includes(B.below)) out.push({ say: `Laying out ${below}`, chip: bare(below) });
  for (const o of R.objects) out.push({ say: `Bringing in ${FIGURES[o.figure].label}`, chip: bare(FIGURES[o.figure].label) });
  out.push({ say: 'Working out the motion', chip: 'the motion' });
  for (const e of R.effects) out.push({ say: `Adding ${EFFECTS[e].label}`, chip: bare(EFFECTS[e].label) });
  out.push({ say: 'Scaling it to the numbers', chip: null });
  return out;
}

/**
 * Veil `wrap` (the stage), name the pieces, then lift.
 * @param wrap  the element the stage canvas is in
 * @param R     the checked recipe
 * @returns Promise that resolves as the veil starts to lift (play then)
 */
export function reveal(wrap, R, { per = 420 } = {}) {
  wrap.querySelector('.cmp-reveal')?.remove();
  const quiet = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const list = steps(R);
  const el = document.createElement('div');
  el.className = 'cmp-reveal';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `
    <canvas class="cr-snap" aria-hidden="true"></canvas>
    <div class="cr-blur"></div>
    <div class="cr-shimmer" aria-hidden="true"></div>
    <div class="cr-card">
      <span class="cr-mark" aria-hidden="true"><span class="cr-glow"></span><span class="ai-orb cr-orb">${SPARK}</span></span>
      <p class="cr-title">Creating your scene</p>
      <p class="cr-step"><span>${esc(list[0].say)}</span></p>
      <ul class="cr-chips" aria-hidden="true">${list.filter((s) => s.chip).map((s) => `<li>${esc(s.chip)}</li>`).join('')}</ul>
      <div class="cr-bar" aria-hidden="true"><i></i></div>
    </div>`;
  wrap.append(el);
  // the veil is the scene itself, blurred: a copy of the stage's canvas,
  // taken again while the stage settles into its new size
  const snap = el.querySelector('.cr-snap'), src = wrap.querySelector('canvas');
  // a canvas caught mid-resize is blank: such a copy is skipped, never kept
  const drawn = () => {
    try {
      const d = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
      for (let i = 3; i < d.length; i += 4 * 997) if (d[i] > 0) return true;
    } catch { return true; }
    return false;
  };
  const copy = () => {
    if (!src?.width || !drawn()) return;
    snap.width = src.width; snap.height = src.height;
    snap.getContext('2d').drawImage(src, 0, 0);
  };
  copy();
  const copier = setInterval(copy, 160);
  const step = el.querySelector('.cr-step'), chips = [...el.querySelectorAll('.cr-chips li')], bar = el.querySelector('.cr-bar i');
  const total = quiet ? 500 : Math.max(2200, list.length * per);
  el.style.setProperty('--total', `${total}ms`);
  requestAnimationFrame(() => el.classList.add('is-on'));

  return new Promise((done) => {
    let i = 0, c = 0;
    const next = () => {
      i++;
      if (i < list.length) {
        const s = document.createElement('span');
        s.textContent = list[i].say;
        step.replaceChildren(s);
      }
      // a chip ticks as the step after it begins
      const ch = list[i - 1]?.chip ? chips[c++] : null;
      ch?.classList.add('is-in');
      bar.style.transform = `scaleX(${Math.min(1, i / list.length)})`;
      if (i < list.length) setTimeout(next, total / list.length);
      else lift();
    };
    const lift = () => {
      clearInterval(copier); copy();
      chips.forEach((x) => x.classList.add('is-in'));
      el.classList.add('is-lifting');
      done();
      setTimeout(() => el.remove(), quiet ? 250 : 1300);
    };
    setTimeout(next, total / list.length);
  });
}
