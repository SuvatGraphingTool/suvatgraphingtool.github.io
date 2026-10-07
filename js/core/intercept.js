// intercept.js — did the thrown object meet the falling one, and if not, how?
//
// This is the monkey and hunter, stated as arithmetic. The hunter throws from
// the origin at height h; the monkey hangs at (target.x, target.y) and lets go
// at the same instant. Both are then in free fall under the same g, and the
// question is what the thrown object is doing at the moment it arrives.
//
// WHY THIS EXISTS AT ALL. Until now the app modelled exactly one way to fail:
// "too slow". That was not a simplification, it was a consequence — the angle
// was COMPUTED from the monkey's position, so the aim could not be wrong and
// a vertical miss was geometrically impossible. Give the student an angle to
// set and it becomes possible, which is the whole point: being able to aim
// wrong is how you find out that aiming right always works.
//
// So there are four answers now, and the renderer displays whichever comes
// back. It does not work any of them out itself — house rule 4.

/** Tolerance in metres: close enough that a banana and a monkey touch. */
const TOUCH = (target) => Math.max(0.35, target.x * 0.02);

/**
 * @param {object} f        the thrown object's flight (js/core/projectile.js)
 * @param {{x:number,y:number}} target  where the falling object starts
 * @param {number} g        the same gravity for both
 * @returns {{kind, t, fall, gap, reach, landed}}
 *   kind    'caught' · 'high' · 'low' · 'short'
 *   t       when it arrived at the target's horizontal distance, or null
 *   fall    how far BOTH had fallen below where they would have been without
 *           gravity by then — the quantity the whole demonstration is about
 *   gap     signed metres between them at that moment, thrown minus falling
 *   reach   how far the throw got horizontally before it landed
 *   landed  when the falling object reaches the ground
 */
export function intercept(f, target, g) {
  const landed = g > 1e-9 ? Math.sqrt((2 * Math.max(0, target.y)) / g) : Infinity;
  const reach = isFinite(f.range) ? f.range : f.horiz * f.tMax;

  // No horizontal speed at all, or it lands before it gets there: it was
  // never a question of aim.
  if (!(f.horiz > 1e-9)) {
    return { kind: 'short', t: null, fall: 0, gap: null, reach: 0, landed };
  }
  const t = target.x / f.horiz;
  if (!(t > 0) || t > f.tMax + 1e-9 || t > landed + 1e-9) {
    return { kind: 'short', t: null, fall: 0, gap: null, reach, landed };
  }

  const thrown = f.pos(t).y;
  const falling = target.y - 0.5 * g * t * t;
  const gap = thrown - falling;
  const fall = 0.5 * g * t * t;
  const tol = TOUCH(target);

  return {
    kind: Math.abs(gap) <= tol ? 'caught' : gap > 0 ? 'high' : 'low',
    t, fall, gap, reach, landed,
  };
}

/**
 * Which of the demonstration's awkward corners this run has landed in.
 *
 * Some settings appear to break the rule that the two always meet, and a
 * student left to guess why will conclude the physics failed. Each of these
 * names a reason the picture is misleading rather than the result being
 * wrong — except `slow`, which is the one real boundary there is.
 *
 * @param {{y:number}} target  the falling object's starting height, which
 *   sets the size of the picture and therefore what counts as "too small to
 *   see" — a 26 cm shared fall is obvious in a one-metre frame and invisible
 *   in a twelve-metre one, so the test has to be relative, not absolute.
 * @returns {string[]} keys into the scenario's own explanations, in order
 */
export function corners(v, g, aimed, target) {
  const out = [];
  if (v.kind === 'short') out.push('slow');
  if (g <= 1e-9) out.push('nog');
  else if (v.kind === 'caught' && v.fall < Math.max(0.12, (target?.y ?? 0) * 0.04)) out.push('fast');
  if (aimed && v.kind !== 'short') out.push('aimed');
  return out;
}
