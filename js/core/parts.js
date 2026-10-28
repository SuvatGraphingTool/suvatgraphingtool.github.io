// parts.js — a question in parts, one motion for each part that needs one.
//
// An exam question is often (a), (b), (c), and the parts are not always the
// same motion: (a) asks for the time to the top of a vertical throw, (b) for
// how long it spends above a line; a lorry accelerates in (a), cruises in (b)
// and brakes in (c). The reader returns each part as a reading of its own
// (worker/src/schema.js, `parts`), and this file turns that list into the
// motions the app plays one after another.
//
// TWO RULES, BOTH CLAUDE.md RULE 4.
//   · A part that is the same motion as the one before it is not a new
//     motion. Parts that differ only in what they ask are merged, so a
//     question whose parts all ask about one flight is still one flight.
//   · "Use your answer to (a)" is a CARRY: a value a later part takes from
//     the ENGINE's answer to an earlier part. The model names which value and
//     where it comes from; the number itself is read off the engine's own
//     solution here, never written by the model. A carry whose earlier part
//     the engine could not solve is left empty, for the engine to say so.

/** What a later part may take from an earlier part's solution. */
export const TAKES = {
  u: 'the starting speed', v: 'the final speed', s: 'the displacement', t: 'the time',
  a: 'the acceleration', apex: 'the greatest height', tApex: 'the time to the top',
  tMark: 'the time to that point', vMark: 'the speed there',
};
/** Where in the later part it may go — the reading's own field names. */
export const INTO = ['u', 'v', 's', 't', 'a', 'h', 'heightLine'];

const MAX_PARTS = 6;
const isNum = (x) => typeof x === 'number' && isFinite(x);
/** "(b)", "b", "B)", "part b" → "b"; "(ii)" → "ii". */
export function labelKey(l) {
  const k = String(l ?? '').toLowerCase().replace(/^part\s*/, '').replace(/[^a-z0-9]/g, '');
  return k.slice(0, 4);
}
/** ['a'] → "(a)"; ['a', 'b'] → "(a) and (b)". */
export function partName(labels) {
  const p = labels.map((l) => `(${l})`);
  return p.length > 1 ? `${p.slice(0, -1).join(', ')} and ${p[p.length - 1]}` : p[0];
}

// Everything about a part that is not the motion itself.
const NOT_MOTION = new Set(['label', 'labels', 'asks', 'summary', 'note', 'confidence', 'understood']);
function motionOf(p) {
  return JSON.stringify(Object.keys(p).filter((k) => !NOT_MOTION.has(k)).sort().map((k) => [k, p[k]]));
}

/**
 * The parts of a reading, ready to apply one at a time.
 * @param x  the reader's extraction
 * @returns  [] when there are no parts; otherwise one reading per distinct
 *           motion, each { ...fields, labels: ['a'], understood: true }
 */
export function splitParts(x) {
  if (!x || typeof x !== 'object' || x.understood === false || !Array.isArray(x.parts)) return [];
  const seen = new Set();
  const list = x.parts
    .filter((p) => p && typeof p === 'object' && typeof p.scenario === 'string')
    .slice(0, MAX_PARTS)
    .map((p, i) => {
      let key = labelKey(p.label) || String.fromCharCode(97 + i);
      if (seen.has(key)) key = String.fromCharCode(97 + i);
      seen.add(key);
      const { label, ...rest } = p;
      // g is often said once, for the whole question.
      const g = isNum(p.g) ? p.g : isNum(x.g) ? x.g : undefined;
      return { ...rest, ...(g !== undefined ? { g } : {}), understood: true, labels: [key],
               confidence: p.confidence ?? x.confidence,
               // the question's own summary heads the first part, not every part
               summary: p.summary || (i === 0 ? x.summary || '' : '') };
    });
  const out = [];
  for (const p of list) {
    const prev = out[out.length - 1];
    if (prev && motionOf(prev) === motionOf(p)) {
      prev.labels.push(...p.labels);
      prev.asks = [...(prev.asks || []), ...(p.asks || [])];
    } else out.push(p);
  }
  return out;
}

/** One value off the engine's own solution (js/core/solve.js, road.js). */
export function engineValue(solved, take) {
  if (!solved?.ok || !(take in TAKES)) return null;
  const five = solved.five?.[take]?.value;
  if (isNum(five)) return five;
  const extra = (solved.extras || []).find((e) => e.key === take)?.value;
  return isNum(extra) ? extra : null;
}

/**
 * A part with its carries filled in from the engine's earlier answers.
 * @param part     one entry of splitParts()
 * @param answers  { [label]: solved } for the parts already applied
 * @returns { reading, carried: [{ into, from, take, value }], missing: [{ into, from, take }] }
 */
export function carryInto(part, answers) {
  const reading = { ...part };
  delete reading.carries;
  const carried = [], missing = [], marks = {};
  for (const c of Array.isArray(part.carries) ? part.carries : []) {
    if (!c || !INTO.includes(c.into) || !(c.take in TAKES)) continue;
    const from = labelKey(c.from);
    const value = engineValue(answers[from], c.take);
    // The model's own number for this field, if it wrote one, is not used:
    // the carry is the engine's.
    delete reading[c.into];
    if (value == null) { missing.push({ into: c.into, from, take: c.take }); continue; }
    // A speed, a time, a distance or a height carries as a size. Only an
    // acceleration along a road keeps its sign: negative is braking.
    reading[c.into] = c.into === 'a' ? value : Math.abs(value);
    marks[c.into] = { from, take: c.take };
    carried.push({ into: c.into, from, take: c.take, value: reading[c.into] });
  }
  if (carried.length) reading.carried = marks;
  return { reading, carried, missing };
}
