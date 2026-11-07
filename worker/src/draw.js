// draw.js — POST /draw: a drawing of an object, made once and kept for everyone.
//
// The composer's third rung (js/compose/things.js). A question names something
// with no figure and no curated icon: a model draws it, in the style of the icons,
// and every student from then on shares that drawing, for no further AI call.
//
// This shares a very small free AI allowance, and it is a school tool whose
// drawings everyone sees. So:
//   - only a name goes in: lower-case letters, spaces and hyphens, 30 characters.
//     Nothing else in the request ever reaches the model;
//   - a cached name costs nothing and returns at once;
//   - at most 25 NEW drawings a day across the site, 5 an hour from one address;
//   - a blocked name never reaches a model, and the model may refuse; both are
//     cached as refused and the page falls to its last rung;
//   - the SVG passes a strict allowlist here AND again in the browser
//     (js/compose/svgsafe.js), and a quality gate. A failure is cached too, so a
//     bad drawing never appears and is never paid for twice.
//
// Time is for quality: the model is given room to think, and the page waits up
// to thirty seconds from when the student asked. A drawing that finishes after
// the student has gone on is still kept (ctx.waitUntil), for whoever asks next.

import { normaliseName, thingName, isBlocked, isMaterial } from '../../js/compose/things.js';
import { sanitizeSvg, qualityIssue } from '../../js/compose/svgsafe.js';

export const NEW_PER_DAY = 25;
export const NEW_PER_HOUR_PER_IP = 5;
const DAY_MS = 86_400_000, HOUR_MS = 3_600_000;
// non-lite first: the drawing is the point, and these think
export const DRAW_MODELS_DEFAULT = 'gemini-3.8-flash:high,gemini-3.6-flash:high,gemini-3.5-flash-lite:low,gemini-3.1-flash-lite:low';
/** The Worker's own limit for one drawing; the page's deadline is 30 s from when the student asked. */
export const DRAW_DEADLINE_MS = 28_000;
const DRAW_HEDGE_MS = 16_000;

const MUG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="a" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fbfbf8"/><stop offset=".7" stop-color="#e8e6df"/><stop offset="1" stop-color="#c8c6bd"/></linearGradient></defs><path fill="#d3d1c8" d="M22 11h2.5a5.5 5.5 0 0 1 0 11H22v-2.600h2.500a2.900 2.900 0 0 0 0-5.800H22z"/><path fill="url(#a)" d="M5 7.500C5 6.700 5.700 6 6.500 6h15c.8 0 1.500.7 1.500 1.500V24a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><ellipse cx="14" cy="7.200" rx="8.400" ry="1.500" fill="#6d4427"/><ellipse cx="14" cy="7.400" rx="7.200" ry="1" fill="#8a5a36"/><path fill="#e8483f" d="M5 15h18v5H5z"/><path fill="#c7342d" d="M20 15h3v5h-3z"/><path fill="#fff" fill-opacity=".7" d="M7.200 9.500h1.600v13.300c0 .4-.4.700-.8.700s-.8-.3-.8-.7z"/></svg>';
const TV = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="s" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#4f6d8c"/><stop offset="1" stop-color="#16222e"/></linearGradient></defs><rect x="2" y="6" width="28" height="19" rx="2" fill="#2b2f35"/><rect x="3" y="7" width="26" height="17" rx="1.400" fill="#3a3f46"/><rect x="4.500" y="8.500" width="23" height="14" rx=".8" fill="url(#s)"/><path fill="#fff" fill-opacity=".16" d="M6 10h8l-4.500 11H6z"/><rect x="13" y="25" width="6" height="2.500" fill="#23262b"/><rect x="9" y="27" width="14" height="1.800" rx=".9" fill="#3a3f46"/><circle cx="25.500" cy="23.300" r=".5" fill="#7fe0a8"/></svg>';

export const DRAW_PROMPT = `You draw one object at a time as a small SVG icon for a physics app used in schools, in the style of Microsoft's Fluent Emoji Flat. Look at the examples and match that look.

THE STYLE
- viewBox exactly "0 0 32 32". The object fills most of the frame, centred, about 26 to 30 units across its longest side.
- Side view, upright, as the object would stand or lie on a table. No perspective tricks; it must read at once at 40 px on any background.
- Built like a good icon: a clear silhouette first; then flat colour areas; then shading down one side (the light comes from the upper left), a highlight on the lit side, and the dark details that make it unmistakably that object. Use 20 to 60 shapes.
- A linear or radial gradient or two for roundness; otherwise flat fills. Real colours for the object. Dark edges are drawn as shapes, not outlines round everything.
- Nothing but the object: no ground, no shadow under it, no background, no frame, no sparkles, no motion lines.

THE RULES
- Only these elements: svg, g, path, circle, ellipse, rect, polygon, polyline, line, defs, linearGradient, radialGradient, stop.
- Only presentation and geometry attributes: fill, stroke, opacity, d, x, y, cx, cy, r, rx, ry, width, height, points, transform, gradient attributes and ids. A fill may be url(#id) for a gradient in this same SVG.
- No text. No script, style, image, use, clipPath, filter, mask or href. No letters or numbers drawn on it. Keep it under 18000 characters.

REFUSE, with "refuse": true and no svg, if the name is a person or character, a part of a body, a weapon, a drug, anything sexual, rude, frightening or unkind, a brand or logo, or if it is not a physical object you could hold or drop.

Say what it is mostly made of, in "material": one of glass, china, soft (soft fruit, cake, anything that bursts), rubber, metal, stone, wood, paper, cloth, plastic, animal.

Answer with ONE JSON object and nothing else: {"svg": "<svg ...>...</svg>", "material": "...", "refuse": false}

EXAMPLES
Draw: mug
{"svg":${JSON.stringify(MUG)},"material":"china","refuse":false}

Draw: television
{"svg":${JSON.stringify(TV)},"material":"glass","refuse":false}

Draw: pistol
{"refuse":true}`;

const json = (obj, status, headers) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...headers } });

/** Who asked, kept only as a hash and only to count: the same address is the same hash today, and no other day. */
async function who(ip, now) {
  const day = new Date(now).toISOString().slice(0, 10);
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${day}:${ip}`));
  return [...new Uint8Array(bytes)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}
const startOfDay = (now) => now - (now % DAY_MS);

async function save(db, name, row, now) {
  await db.prepare('INSERT OR REPLACE INTO drawings (name, svg, material, status, created) VALUES (?, ?, ?, ?, ?)')
    .bind(name, row.svg ?? null, row.material ?? null, row.status, now).run();
}

/**
 * Ask the model for a drawing, gate it, and keep the answer.
 * Only an answer about the drawing itself is kept: a busy or failing model says
 * nothing about the object, so it is free to be asked again.
 */
async function make(env, name, race, models, now) {
  const payload = {
    system_instruction: { parts: [{ text: DRAW_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: `Draw: ${name}` }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 12000, responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'high' } },
  };
  const outcome = await race(env, models, payload, { hedgeMs: DRAW_HEDGE_MS, deadlineMs: DRAW_DEADLINE_MS });
  if (!outcome?.ok) return { status: 'busy' };
  const x = outcome.extraction;
  if (!x || typeof x !== 'object' || x.refuse === true || typeof x.svg !== 'string') {
    const row = { status: x?.refuse === true ? 'refused' : 'failed' };
    await save(env.DB, name, row, now);
    return row;
  }
  const clean = sanitizeSvg(x.svg);
  const issue = clean.ok ? qualityIssue(clean.info, { min: 8 }) : clean.reason;
  if (issue) {
    console.error('drawing rejected', name, issue);
    const row = { status: 'failed' };
    await save(env.DB, name, row, now);
    return row;
  }
  const row = { status: 'ok', svg: clean.svg, material: isMaterial(x.material) ? x.material : null };
  await save(env.DB, name, row, now);
  return row;
}

/**
 * The route. CORS and the origin check are the caller's (worker/src/index.js).
 * @param deps.race   the reader's race of models: (env, models, payload, options)
 * @param deps.now    a clock, for the tests
 */
export async function draw(request, env, cors, { race, ctx = null, now = Date.now() } = {}) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Body must be JSON.' }, 400, cors); }
  if (typeof body?.name !== 'string') return json({ error: 'Send a name.' }, 400, cors);
  // only this ever reaches the model, the database or a picture's label
  const name = thingName(normaliseName(body.name));
  if (!name) return json({ error: 'Send a name.' }, 400, cors);
  if (!env.DB) return json({ status: 'unavailable' }, 503, cors);

  const seen = await env.DB.prepare('SELECT svg, material, status FROM drawings WHERE name = ?').bind(name).first();
  if (seen) return json({ status: seen.status, ...(seen.status === 'ok' ? { svg: seen.svg, material: seen.material } : {}), cached: true }, 200, cors);

  const ip = await who(request.headers.get('CF-Connecting-IP') || 'unknown', now);
  const mine = await env.DB.prepare('SELECT COUNT(*) AS n FROM draw_log WHERE ip = ? AND at > ?').bind(ip, now - HOUR_MS).first();
  const overIp = (mine?.n ?? 0) >= NEW_PER_HOUR_PER_IP;

  if (isBlocked(name)) {
    // kept as refused so it is never asked about; one address cannot fill the table with them
    if (!overIp) {
      await save(env.DB, name, { status: 'refused' }, now);
      await env.DB.prepare('INSERT INTO draw_log (ip, at, spent) VALUES (?, ?, 0)').bind(ip, now).run();
    }
    return json({ status: 'refused' }, 200, cors);
  }
  if (overIp) return json({ status: 'limited', retry: 'hour' }, 200, cors);
  const today = await env.DB.prepare('SELECT COUNT(*) AS n FROM draw_log WHERE spent = 1 AND at >= ?').bind(startOfDay(now)).first();
  if ((today?.n ?? 0) >= NEW_PER_DAY) return json({ status: 'limited', retry: 'day' }, 200, cors);
  if (!env.GEMINI_API_KEY && !env.AI) return json({ status: 'unavailable' }, 503, cors);

  // counted before the call: a model that fails has still used the allowance
  await env.DB.prepare('INSERT INTO draw_log (ip, at, spent) VALUES (?, ?, 1)').bind(ip, now).run();
  await env.DB.prepare('DELETE FROM draw_log WHERE at < ?').bind(now - 2 * DAY_MS).run();

  const models = (env.DRAW_MODELS || DRAW_MODELS_DEFAULT).split(',').map((m) => m.trim()).filter(Boolean)
    .map((m) => { const [n, level] = m.split(':'); return { name: n, level: level || 'high' }; });
  const work = make(env, name, race, models, now);
  // the student may have gone on by the time it is done: it is still kept for the next one
  ctx?.waitUntil?.(work.catch(() => {}));
  const row = await work;
  return json({ status: row.status, ...(row.status === 'ok' ? { svg: row.svg, material: row.material } : {}) }, 200, cors);
}
