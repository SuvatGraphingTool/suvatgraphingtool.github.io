// index.js — Cloudflare Worker: the only place the API key exists.
//
// The static site on GitHub Pages cannot hold a key. This sits in front of
// Gemini, holds the key as a secret, and refuses everything it should refuse.
//
// Free tier arithmetic: Workers allows 100,000 requests/day; the Gemini free
// tier is around 1,500/day. So the Worker is never the constraint — its job is
// to make sure ONE person cannot drink the day's model quota, and to fail in a
// way the interface can explain.

import { SYSTEM_PROMPT } from './schema.js';

const MODELS_DEFAULT = '@cf/google/gemma-4-26b-a4b-it,gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.8-flash:low,gemini-3.6-flash';
const MAX_IMAGE_BYTES = 1_500_000;      // the client resizes to ~150 KB; this is the backstop
const MAX_PDF_BYTES = 4_000_000;        // a few pages of a paper
const MAX_TEXT_CHARS = 2_000;           // a long exam question is ~600
const MAX_TURNS = 8;                    // the chat the reader is shown: four questions and answers
const PER_IP_PER_DAY = 40;              // generous for one student, useless for a scraper
const PER_IP_PER_MINUTE = 6;
const HEDGE_MS = 4_500;                 // Gemma usually answers in 2–3.5 s; past this, ask another too
const COOL_MS = 120_000;                // how long a model that stalled goes to the back of the queue

// Which models stalled lately, and until when to ask them last. It lives as
// long as this Worker instance does — minutes, usually — which is about as
// long as a spell of "high demand" lasts. Best effort: losing it costs only
// one slow answer.
const cooling = new Map();
const DEADLINE_MS = 25_000;             // the whole relay; the page itself gives up at 30 s
const MAX_IN_FLIGHT = 3;

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405, cors);
    if (!allowedOrigin(origin, env)) return json({ error: 'Not allowed from this origin.' }, 403, cors);

    const url = new URL(request.url);
    if (url.pathname !== '/extract') return json({ error: 'Not found' }, 404, cors);

    // ── rate limit ────────────────────────────────────────────────────────
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const limited = await rateLimit(env, ip);
    if (limited) {
      return json({
        error: 'rate_limited',
        message: limited.message,
        retryAfter: limited.retryAfter,
      }, 429, cors);
    }

    // ── body ──────────────────────────────────────────────────────────────
    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Body must be JSON.' }, 400, cors); }

    // Words — typed, or spoken and turned into text by the browser — and at
    // most one attachment: a photo of the question, or the paper as a PDF.
    // Either may come alone.
    const { imageBase64, mimeType = 'image/jpeg', hint, text, history } = body || {};
    const words = typeof text === 'string' ? text.trim() : '';
    const file = typeof imageBase64 === 'string' && imageBase64.length ? imageBase64 : '';
    if (!words && !file) return json({ error: 'Send text, a file, or both.' }, 400, cors);
    if (words.length > MAX_TEXT_CHARS) {
      return json({
        error: 'text_too_long',
        message: 'That is longer than a question. Keep it to the question itself.',
      }, 413, cors);
    }
    if (file && !/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(mimeType)) {
      return json({ error: 'unsupported_file', message: 'Send a photo (JPEG, PNG, WebP) or a PDF.' }, 400, cors);
    }
    const cap = mimeType === 'application/pdf' ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
    if (file && file.length * 0.75 > cap) {
      return json({
        error: 'file_too_large',
        message: mimeType === 'application/pdf'
          ? 'That PDF is too big. Send just the page with the question on it.'
          : 'That image is too big. Resize it to about 1024 px wide before sending.',
      }, 413, cors);
    }

    if (!env.GEMINI_API_KEY && !env.AI) return json({ error: 'Server is not configured.' }, 500, cors);

    // ── call the model ────────────────────────────────────────────────────
    const parts = [];
    if (file) parts.push({ inline_data: { mime_type: mimeType, data: file } });
    const say = words || (typeof hint === 'string' ? hint.trim().slice(0, 400) : '');
    const sent = mimeType === 'application/pdf' ? 'the question paper as a PDF' : 'a photo of the question';
    parts.push({ text: file
      ? `The student sends ${sent}${say ? ` and says:\n${say}` : '.'}`
      : `The student says:\n${say}` });

    // The chat so far: what the student said, and the JSON each answer was.
    // Text only — a photo is sent once, and what was read from it lives on in
    // the answer that followed. The last few turns, user and model in pairs.
    const earlier = (Array.isArray(history) ? history : [])
      .filter((h) => h && (h.role === 'user' || h.role === 'model') && typeof h.text === 'string' && h.text.trim())
      .slice(-MAX_TURNS)
      .map((h) => ({ role: h.role, parts: [{ text: h.text.slice(0, MAX_TEXT_CHARS) }] }));
    while (earlier.length && earlier[0].role !== 'user') earlier.shift();

    const payload = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [...earlier, { role: 'user', parts }],
      generationConfig: {
        temperature: 0,                         // extraction, not writing
        maxOutputTokens: 1200,
        // JSON, but NOT a responseSchema. Handed the schema, Flash-Lite answered
        // every question with the same four fields and wrote angles into u;
        // given the same fields as a list in the prompt, with examples, it read
        // all of them correctly. The app checks every field's type on arrival
        // (toApp in js/core/question.js), so nothing is lost by not enforcing it here.
        responseMimeType: 'application/json',
        // Reading printed numbers needs no deliberation, and every second
        // spent thinking is a second the student waits.
        thinkingConfig: { thinkingLevel: env.THINKING || 'minimal' },
      },
    };

    // THE FAST READERS FIRST, AND A RELAY BEHIND THEM — RUN AS A RACE.
    // Flash-Lite answers in a few seconds and, given the fields as a list
    // rather than a schema, reads these questions correctly. But on the free
    // tier any one model can be "experiencing high demand" — a 503, or worse,
    // no answer at all until the clock runs out — and each has its own 20 a
    // day. Waiting for one to give up before asking the next is what made a
    // student wait half a minute. So: ask the first; if it fails, ask the
    // next at once; if it is merely slow, ask the next ALONGSIDE it after
    // HEDGE_MS, and take whichever answers first. A second model is only ever
    // asked when the first is already late, so the quota cost is small.
    const models = (env.MODELS || MODELS_DEFAULT).split(',').map((m) => m.trim()).filter(Boolean)
      .map((m) => { const [name, level] = m.split(':'); return { name, level: level || env.THINKING || 'minimal' }; });
    const outcome = await race(env, models, payload);
    if (outcome.ok) return json({ ok: true, extraction: outcome.extraction, model: outcome.model }, 200, cors);
    const { last, lastCap, capped, gone } = outcome;

    if (lastCap && models.every((m) => capped.has(m.name) || gone.has(m.name))) {
      // Every model has hit its allowance. Usually that is the per-minute
      // one and passes in a moment; occasionally it is the day's. Either way
      // it is expected, not broken.
      // Google says which: "Please retry in 16h59m" is the day's, seconds are the minute's.
      const detail = lastCap.detail || '';
      const hours = Number(/retry in (\d+)h/i.exec(detail)?.[1]);
      const daily = /per.?day|daily|retry in \d+h/i.test(detail);
      const back = hours >= 1 ? `It will be back in about ${hours + 1} hours. ` : 'It will be back tomorrow. ';
      return json({
        error: daily ? 'quota_exhausted' : 'busy',
        message: daily
          ? `Suvat has answered all the questions it can for today. ${back}Until then, pick the scenario below and type the numbers in — everything else still works.`
          : 'Suvat is busy for a moment. Wait a few seconds and send it again.',
        upstream: { status: 429, detail },
      }, 429, cors);
    }
    if (!last || last.kind === 'unreachable' || last.status === 503 || last.status === 429) {
      return json({
        error: 'upstream_unreachable',
        // Almost always Google's free tier being swamped, not anything broken.
        message: 'Suvat is very busy right now. Try again in a minute, or pick the scenario below and type the numbers in.',
      }, 502, cors);
    }
    if (last.kind === 'unreadable') {
      return json({
        error: 'unreadable_response',
        message: 'Could not make sense of that. Try again, or type the numbers in.',
        upstream: last.detail,
      }, 502, cors);
    }
    return json({
      error: 'upstream_error',
      message: 'The reader failed. Type the numbers in instead.',
      // Google's own words, for whoever is debugging. They never carry the key.
      upstream: { status: last.status, detail: last.detail },
    }, 502, cors);
  },
};

/**
 * Ask the models in turn, overlapping a slow one with the next, and settle on
 * the first readable answer. Every request still running is then cancelled.
 * A model that cannot think at the level asked is asked once more at "low".
 */
function race(env, models, payload) {
  const now = Date.now();
  const warm = (m) => (cooling.get(m.name) || 0) <= now;
  const queue = [...models.filter(warm), ...models.filter((m) => !warm(m))]
    .map((m) => ({ ...m, temperature: 0 }));
  const running = new Set();
  const capped = new Set(), gone = new Set();
  const done = new AbortController();
  const started = Date.now();
  let last = null, lastCap = null, inFlight = 0, retried = false, settled = false;
  const rebusy = new Set();     // a 503 is often gone a second later: one more go each

  return new Promise((resolve) => {
    const finish = (r) => {
      if (settled) return;
      settled = true; clearTimeout(hedge); clearTimeout(deadline);
      // Whatever was still thinking when another answered was the slow one.
      for (const name of running) cooling.set(name, Date.now() + COOL_MS);
      done.abort();
      resolve(r);
    };
    const fail = () => finish({ ok: false, last, lastCap, capped, gone });
    let hedge = null;
    const deadline = setTimeout(fail, DEADLINE_MS);

    function next() {
      clearTimeout(hedge);
      if (settled) return;
      const m = queue.shift();
      if (!m) { if (!inFlight) fail(); return; }
      if (capped.has(m.name) || gone.has(m.name)) return next();
      const left = DEADLINE_MS - (Date.now() - started);
      if (left < 3_000) { if (!inFlight) fail(); return; }
      inFlight++; running.add(m.name);
      const generationConfig = { ...payload.generationConfig, temperature: m.temperature,
                                 thinkingConfig: { thinkingLevel: m.level } };
      ask(env, m.name, { ...payload, generationConfig }, left, done.signal).then((r) => {
        inFlight--; running.delete(m.name);
        if (settled) return;
        if (r.status === 503 || r.kind === 'unreachable') cooling.set(m.name, Date.now() + COOL_MS);
        if (r.ok) return finish({ ok: true, extraction: r.extraction, model: m.name });
        last = r;
        console.error('reader attempt failed', m.name, m.level, m.temperature, r.status || r.kind, r.detail || '');
        if (r.status === 429) { capped.add(m.name); lastCap = r; }   // its allowance, not its answer
        else if (r.status === 404 || r.status === 403 || r.status === 415) gone.add(m.name);
        else if (r.status === 400 && /thinking level/i.test(r.detail || '') && m.level !== 'low') {
          queue.unshift({ ...m, level: 'low' });
        } else if (r.status === 503 && !rebusy.has(m.name)) {
          rebusy.add(m.name); queue.push({ ...m });
        } else if (r.kind === 'unreadable' && !retried) {
          // Talked itself into a loop and ran out of tokens: worth one more
          // try, a little less deterministic, at the back of the queue.
          retried = true; queue.push({ ...m, temperature: 0.4 });
        }
        next();
      });
      // Still waiting after HEDGE_MS? Ask the next one as well.
      if (inFlight < MAX_IN_FLIGHT) hedge = setTimeout(next, HEDGE_MS);
    }
    next();
  });
}

/** One question to one model: { ok, extraction } or { ok:false, kind, status?, detail? }. */
async function ask(env, model, payload, ms, cancel) {
  if (model.startsWith('@cf/')) return askCloudflare(env, model, payload, ms, cancel);
  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify(payload),
      signal: AbortSignal.any([AbortSignal.timeout(ms), cancel]),
    });
  } catch (e) {
    return { ok: false, kind: 'unreachable', detail: `${e?.name || 'Error'} after ${ms} ms allowed` };
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return { ok: false, kind: 'error', status: res.status, detail: googleMessage(detail) };
  }
  let data;
  try {
    data = await res.json();
    // Newer models can split an answer across parts, and put their thinking
    // in parts of its own; the answer is every part that is not.
    const text = (data?.candidates?.[0]?.content?.parts || [])
      .filter((p) => typeof p.text === 'string' && !p.thought).map((p) => p.text).join('');
    if (!text) throw new Error('no text part');
    return { ok: true, extraction: JSON.parse(text) };
  } catch {
    const c = data?.candidates?.[0];
    return { ok: false, kind: 'unreadable',
             detail: { model, finish: c?.finishReason || data?.promptFeedback?.blockReason || null } };
  }
}
/**
 * The same question to a model on Cloudflare Workers AI — Gemma, run beside
 * this Worker, so there is no key and no Google queue in the way. It takes
 * the Gemini payload as it is and says it in Cloudflare's words. It reads
 * photos but not PDFs: a PDF is a 415, and the race leaves it to Gemini.
 * The free allowance is 10,000 neurons a day, a few hundred questions.
 */
async function askCloudflare(env, model, payload, ms, cancel) {
  if (!env.AI) return { ok: false, kind: 'error', status: 403, detail: 'no AI binding' };
  const turns = [];
  for (const c of payload.contents) {
    const content = [];
    for (const p of c.parts) {
      if (p.inline_data?.mime_type === 'application/pdf') {
        return { ok: false, kind: 'error', status: 415, detail: 'reads no PDFs' };
      }
      if (p.inline_data) {
        content.push({ type: 'image_url', image_url: { url: `data:${p.inline_data.mime_type};base64,${p.inline_data.data}` } });
      }
      if (p.text) content.push({ type: 'text', text: p.text });
    }
    turns.push({ role: c.role === 'model' ? 'assistant' : 'user',
                 content: content.length === 1 && content[0].type === 'text' ? content[0].text : content });
  }
  const run = env.AI.run(model, {
    messages: [
      { role: 'system', content: payload.system_instruction.parts[0].text },
      ...turns,
    ],
    temperature: payload.generationConfig.temperature,
    max_completion_tokens: payload.generationConfig.maxOutputTokens,
    response_format: { type: 'json_object' },
    // Gemma thinks by default, and thinking is what made it slow: a dozen
    // seconds and more, and a hello that ran out of tokens before answering.
    // Reading printed numbers needs none of it — the same call as Gemini's
    // thinkingLevel "minimal".
    chat_template_kwargs: { enable_thinking: false },
  }, { signal: AbortSignal.any([AbortSignal.timeout(ms), cancel]) });
  let data;
  try {
    data = await Promise.race([run, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);
  } catch (e) {
    const msg = String(e?.message || e);
    if (/timeout|abort/i.test(msg)) return { ok: false, kind: 'unreachable', detail: `${msg} after ${ms} ms allowed` };
    // Workers AI says "daily free allocation" when the day's neurons are spent.
    const status = /allocation|limit|quota|4006/i.test(msg) ? 429 : /not found|5007/i.test(msg) ? 404 : 502;
    return { ok: false, kind: 'error', status, detail: msg.slice(0, 900) };
  }
  // Older models answer in `response`; the newer ones in the OpenAI shape.
  const raw = data?.response ?? data?.choices?.[0]?.message?.content;
  if (raw && typeof raw === 'object') return { ok: true, extraction: raw };
  try {
    const text = String(raw || '').replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '');
    return { ok: true, extraction: JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) };
  } catch {
    return { ok: false, kind: 'unreadable', detail: { model, finish: data?.choices?.[0]?.finish_reason || null } };
  }
}

/* ── helpers ──────────────────────────────────────────────────────────── */

function googleMessage(raw) {
  try { return String(JSON.parse(raw)?.error?.message || '').slice(0, 900); }
  catch { return ''; }
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function allowedOrigin(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!allowed.length) return true;               // unset = open, for local testing
  return allowed.includes(origin);
}

function corsHeaders(origin, env) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(origin, env) ? (origin || '*') : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

/**
 * Two windows: a burst limit and a daily limit, both per IP.
 *
 * Uses KV if it is bound. KV's free tier allows 1,000 writes/day, which is
 * fewer than the model's own quota — so we only write when a counter actually
 * changes bucket, and if KV is absent we fall through rather than fail closed.
 * The model's own 429 is the real backstop; this is about politeness.
 */
async function rateLimit(env, ip) {
  if (!env.RATE_KV) return null;                  // not bound — rely on upstream 429
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  const minute = Math.floor(now / 60_000);

  try {
    const dayKey = `d:${day}:${ip}`;
    const minKey = `m:${minute}:${ip}`;

    const [dayRaw, minRaw] = await Promise.all([env.RATE_KV.get(dayKey), env.RATE_KV.get(minKey)]);
    const dayCount = Number(dayRaw || 0);
    const minCount = Number(minRaw || 0);

    if (minCount >= PER_IP_PER_MINUTE) {
      return { message: 'Slow down a moment — try again in a minute.', retryAfter: 60 };
    }
    if (dayCount >= PER_IP_PER_DAY) {
      return { message: "You've used today's AI readings. Type the numbers in instead.", retryAfter: 3600 };
    }

    await Promise.all([
      env.RATE_KV.put(dayKey, String(dayCount + 1), { expirationTtl: 172800 }),
      env.RATE_KV.put(minKey, String(minCount + 1), { expirationTtl: 120 }),
    ]);
  } catch (e) {
    console.error('rate limit store failed', e);   // never block on the limiter breaking
  }
  return null;
}
