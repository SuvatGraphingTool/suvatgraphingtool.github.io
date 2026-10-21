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

const MODELS_DEFAULT = 'gemini-3.5-flash-lite,gemini-3.5-flash';
const MAX_IMAGE_BYTES = 1_500_000;      // the client resizes to ~150 KB; this is the backstop
const MAX_PDF_BYTES = 4_000_000;        // a few pages of a paper
const MAX_TEXT_CHARS = 2_000;           // a long exam question is ~600
const PER_IP_PER_DAY = 40;              // generous for one student, useless for a scraper
const PER_IP_PER_MINUTE = 6;

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
    const { imageBase64, mimeType = 'image/jpeg', hint, text } = body || {};
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

    if (!env.GEMINI_API_KEY) return json({ error: 'Server is not configured.' }, 500, cors);

    // ── call the model ────────────────────────────────────────────────────
    const parts = [];
    if (file) parts.push({ inline_data: { mime_type: mimeType, data: file } });
    const say = words || (typeof hint === 'string' ? hint.trim().slice(0, 400) : '');
    if (say) parts.push({ text: `The student ${file ? 'adds' : 'describes the question'}:\n${say}` });

    const payload = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts }],
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

    // THE FAST READER FIRST, AND A SECOND ONE BEHIND IT. Flash-Lite answers
    // in a few seconds and, given the fields as a list rather than a schema,
    // reads these questions correctly. Flash is the backup: on the free tier
    // it is often "experiencing high demand" — a 503, or no answer at all —
    // and a busy model is not a reason to fail a student. Either one can
    // occasionally talk itself into a loop and run out of tokens; that is
    // worth one more try, a little less deterministic, before giving up.
    const models = (env.MODELS || MODELS_DEFAULT).split(',').map((m) => m.trim()).filter(Boolean);
    const tries = [...models.map((m) => [m, 0]), [models[models.length - 1], 0.4]];
    const started = Date.now();
    let last = null;
    const capped = new Set();       // each model has its own allowance
    for (const [i, [model, temperature]] of tries.entries()) {
      if (capped.has(model)) continue;
      const left = 50_000 - (Date.now() - started);
      if (left < 4_000) break;
      const final = i === tries.length - 1;
      const r = await ask(env, model, { ...payload, generationConfig: { ...payload.generationConfig, temperature } },
                          Math.min(left, final ? 25_000 : 15_000));
      if (r.ok) return json({ ok: true, extraction: r.extraction, model }, 200, cors);
      last = r;
      if (r.status === 429) capped.add(model);   // its allowance, not its answer
      console.error('reader attempt failed', model, temperature, r.status || r.kind);
    }

    if (last?.status === 429) {
      // Every model has hit its allowance. Usually that is the per-minute
      // one and passes in a moment; occasionally it is the day's. Either way
      // it is expected, not broken.
      // Google says which: "Please retry in 16h59m" is the day's, seconds are the minute's.
      const daily = /per.?day|daily|retry in \d+h/i.test(last.detail || '');
      return json({
        error: daily ? 'quota_exhausted' : 'busy',
        message: daily
          ? "Suvat has answered all the questions it can for today. Pick the scenario below and type the numbers in — everything else still works."
          : 'Suvat is busy for a moment. Wait a few seconds and send it again.',
        upstream: { status: 429, detail: last.detail },
      }, 429, cors);
    }
    if (!last || last.kind === 'unreachable') {
      return json({
        error: 'upstream_unreachable',
        message: 'Could not reach the reader. Type the numbers in instead.',
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

/** One question to one model: { ok, extraction } or { ok:false, kind, status?, detail? }. */
async function ask(env, model, payload, ms) {
  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(ms),
    });
  } catch {
    return { ok: false, kind: 'unreachable' };
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
