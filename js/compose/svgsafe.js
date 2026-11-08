// svgsafe.js — a picture of an object, made safe, before anything shows it.
//
// The composer draws objects from SVG: a curated icon (js/compose/icons.json),
// or a drawing a model made on request (worker/src/draw.js) that every student
// then shares. A model's SVG is untrusted input in a school tool, so it is held
// to a strict allowlist on the server AND again in the browser, by this one
// file: nothing here touches the DOM, so the Worker runs it too.
//
// It is a parser, not a filter. It reads the source tag by tag, and writes a
// NEW document from only what it understood: the listed elements with the
// listed attributes, every value checked against what that attribute may hold.
// Anything else — script, style, image, use, foreignObject, animate, text, an
// event handler, href, an external url(), an entity, a comment hiding markup, a
// doctype — refuses the whole picture rather than being cleaned out of it. A
// picture that needed cleaning is not one we want to show.

export const VIEWBOX = '0 0 32 32';
/** The largest picture accepted, in bytes of source. */
export const MAX_BYTES = 20 * 1024;

const ELEMENTS = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline', 'line', 'defs', 'linearGradient', 'radialGradient', 'stop']);
/** What draws. A <g> or <defs> holds things; a shape shows them. */
const SHAPES = new Set(['path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline', 'line']);
const MAX_DEPTH = 10, MAX_ELEMENTS = 400;

const NUMBER = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d{1,3})?$/;
const number = (v) => NUMBER.test(v) && Math.abs(Number(v)) < 1e5;
const length = (v) => number(v.replace(/(?:px|%)$/, ''));
const nonneg = (v) => length(v) && !v.startsWith('-');
const fraction = (v) => number(v.replace(/%$/, ''));
const NAMED = new Set(['none', 'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown', 'grey', 'gray', 'silver', 'gold', 'tan', 'beige', 'navy', 'teal', 'maroon', 'olive', 'cyan', 'magenta', 'lime', 'transparent', 'currentColor']);
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB = /^rgba?\(\s*\d{1,3}%?\s*[, ]\s*\d{1,3}%?\s*[, ]\s*\d{1,3}%?\s*(?:[,/]\s*(?:0|1|0?\.\d+|\d{1,3}%)\s*)?\)$/;
const colour = (v) => HEX.test(v) || RGB.test(v) || NAMED.has(v);
/** A paint: a colour, or a gradient in this picture and nowhere else. */
const LOCAL = /^url\(#([A-Za-z_][\w-]{0,40})\)$/;
const paint = (v) => colour(v) || LOCAL.test(v);
const within = (...ok) => (v) => ok.includes(v);
const TRANSFORM = /^(?:\s*(?:matrix|translate|scale|rotate|skewX|skewY)\(\s*[-+0-9.eE,\s]{1,120}\)\s*,?)+$/;
const transform = (v) => v.length <= 300 && TRANSFORM.test(v);
const PATH = /^[MmZzLlHhVvCcSsQqTtAa0-9eE.,\s+-]+$/;
const pathData = (v) => /^\s*[Mm]/.test(v) && PATH.test(v);
const POINTS = /^[0-9eE.,\s+-]+$/;
const dash = (v) => v === 'none' || /^[0-9.,\s]+$/.test(v);
const anId = (v) => /^[A-Za-z_][\w-]{0,40}$/.test(v);

/** The presentational attributes any shape or group may carry. */
const PRESENT = {
  fill: paint, stroke: paint, opacity: fraction, 'fill-opacity': fraction, 'stroke-opacity': fraction,
  'stroke-width': nonneg, 'stroke-linecap': within('butt', 'round', 'square'), 'stroke-linejoin': within('miter', 'round', 'bevel'),
  'stroke-miterlimit': number, 'stroke-dasharray': dash, 'stroke-dashoffset': number,
  'fill-rule': within('nonzero', 'evenodd'), 'clip-rule': within('nonzero', 'evenodd'), transform, id: anId,
};
const GRADIENT = { id: anId, gradientUnits: within('userSpaceOnUse', 'objectBoundingBox'), gradientTransform: transform, spreadMethod: within('pad', 'reflect', 'repeat') };
const ATTRS = {
  // (a stray xlink namespace is harmless on its own: href itself is refused everywhere, and the root is rewritten)
  svg: { viewBox: (v) => v === VIEWBOX, xmlns: (v) => v === 'http://www.w3.org/2000/svg', 'xmlns:xlink': (v) => v === 'http://www.w3.org/1999/xlink', version: (v) => v === '1.1', width: nonneg, height: nonneg, fill: paint },
  g: PRESENT,
  defs: {},
  path: { ...PRESENT, d: pathData },
  circle: { ...PRESENT, cx: length, cy: length, r: nonneg },
  ellipse: { ...PRESENT, cx: length, cy: length, rx: nonneg, ry: nonneg },
  rect: { ...PRESENT, x: length, y: length, width: nonneg, height: nonneg, rx: nonneg, ry: nonneg },
  polygon: { ...PRESENT, points: (v) => POINTS.test(v) },
  polyline: { ...PRESENT, points: (v) => POINTS.test(v) },
  line: { ...PRESENT, x1: length, y1: length, x2: length, y2: length },
  linearGradient: { ...GRADIENT, x1: fraction, y1: fraction, x2: fraction, y2: fraction },
  radialGradient: { ...GRADIENT, cx: fraction, cy: fraction, r: fraction, fx: fraction, fy: fraction, fr: fraction },
  stop: { offset: fraction, 'stop-color': colour, 'stop-opacity': fraction },
};
const PARENT_ONLY = { stop: new Set(['linearGradient', 'radialGradient']), linearGradient: new Set(['defs']), radialGradient: new Set(['defs']) };

const TAG = /^<(\/?)([A-Za-z][A-Za-z0-9:_-]*)((?:\s+[A-Za-z_:][\w:.-]*\s*=\s*(?:"[^"<>]*"|'[^'<>]*'))*)\s*(\/?)>/;
const ATTR = /([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const refuse = (reason) => ({ ok: false, reason });

/**
 * Hold a picture to the allowlist.
 * @param source  the SVG as a string, from wherever it came
 * @returns {{ ok: true, svg, info } | { ok: false, reason }} — `svg` is a new
 *   document written from what was understood; `info` is what the quality gate
 *   reads: { shapes, colours, big, viewBox }
 */
export function sanitizeSvg(source) {
  if (typeof source !== 'string') return refuse('not text');
  if (source.length > MAX_BYTES) return refuse('too big');
  // anything that is not a plain tag, kept out before reading a single one:
  // entities (&…;), doctypes, CDATA, processing instructions, comments
  let s = source.trim().replace(/^<\?xml[^<>?]*\?>\s*/, '');
  if (/&|<!|<\?|\u0000/.test(s)) return refuse('markup that is not a plain tag');

  const out = [], stack = [], ids = new Set(), used = new Set();
  const info = { shapes: 0, colours: new Set(), big: false, viewBox: false };
  let elements = 0;
  while (s.length) {
    if (s[0] !== '<') {
      // text is refused: "no text", and nothing can hide between the tags
      const gap = s.match(/^\s+/);
      if (!gap) return refuse('text in the picture');
      s = s.slice(gap[0].length);
      continue;
    }
    const m = s.match(TAG);
    if (!m) return refuse('a tag that does not parse');
    s = s.slice(m[0].length);
    const [, close, name, rawAttrs, self] = m;
    if (close) {
      if (rawAttrs || self || stack.pop() !== name) return refuse('tags that do not match');
      out.push(`</${name}>`);
      continue;
    }
    if (!ELEMENTS.has(name)) return refuse(`no <${name.slice(0, 20)}>`);
    if (name === 'svg' ? stack.length : !stack.length) return refuse('one <svg>, outermost');
    if (PARENT_ONLY[name] && !PARENT_ONLY[name].has(stack[stack.length - 1])) return refuse(`<${name}> in the wrong place`);
    if (stack.length >= MAX_DEPTH || ++elements > MAX_ELEMENTS) return refuse('too deep or too long');
    const allow = ATTRS[name], seen = new Set(), kept = [], values = {};
    for (const a of rawAttrs.matchAll(ATTR)) {
      const key = a[1], value = (a[2] ?? a[3] ?? '').trim();
      if (seen.has(key)) return refuse('an attribute given twice');
      seen.add(key);
      if (!Object.hasOwn(allow, key) || !allow[key](value)) return refuse(`no ${key.slice(0, 20)} on <${name}>, or not that value`);
      values[key] = value;
      // the root's own are written by this file, not copied
      if (name !== 'svg') kept.push(`${key}="${value}"`);
    }
    if (name === 'svg') {
      if (values.viewBox !== VIEWBOX) return refuse('a viewBox that is not 0 0 32 32');
      info.viewBox = true;
      out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" width="256" height="256"${values.fill ? ` fill="${values.fill}"` : ''}${self ? '/' : ''}>`);
    } else {
      out.push(`<${name}${kept.length ? ` ${kept.join(' ')}` : ''}${self ? '/' : ''}>`);
    }
    if (values.id) { if (ids.has(values.id)) return refuse('an id given twice'); ids.add(values.id); }
    for (const k of ['fill', 'stroke']) {
      const ref = values[k]?.match(LOCAL);
      if (ref) used.add(ref[1]);
      else if (values[k] && values[k] !== 'none' && values[k] !== 'transparent') info.colours.add(values[k].toLowerCase());
    }
    if (values['stop-color']) info.colours.add(values['stop-color'].toLowerCase());
    if (SHAPES.has(name)) {
      info.shapes++;
      // a rectangle filling the frame is a background: the picture is the thing alone
      if (name === 'rect' && Number.parseFloat(values.width) >= 30 && Number.parseFloat(values.height) >= 30) info.big = true;
    }
    if (!self) stack.push(name);
  }
  if (stack.length) return refuse('a tag left open');
  if (!info.viewBox) return refuse('no <svg>');
  for (const id of used) if (!ids.has(id)) return refuse('a url(#…) to nothing in the picture');
  return { ok: true, svg: out.join(''), info: { ...info, colours: [...info.colours] } };
}

/**
 * Whether a clean picture is any good: too few shapes, one colour or a filled
 * background is a bad drawing, and a bad drawing never appears.
 * @returns {string|null} why not, or null if it passes
 */
export function qualityIssue(info, { min = 6 } = {}) {
  if (!info?.viewBox) return 'wrong viewBox';
  if (info.shapes < min) return 'too few shapes';
  if (info.colours.length < 2) return 'a single colour';
  if (info.big) return 'a background';
  return null;
}

/** The colours a clean picture uses most, for what breaks off it: most-used first. */
export function coloursIn(svg) {
  const count = new Map();
  for (const m of String(svg).matchAll(/(?:fill|stop-color)="(#[0-9a-fA-F]{3,8})"/g)) count.set(m[1], (count.get(m[1]) || 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
}

/** A clean picture as a data URL, for an Image. */
export const dataUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
