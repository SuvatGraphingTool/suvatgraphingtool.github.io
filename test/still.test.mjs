// still.test.mjs — the unchanging opening of a stage is painted once. Run with:
//     node test/still.test.mjs
//
// A sweep in a browser compares the two ways pixel for pixel over every stage; this
// holds the logic with a pretend canvas: what is painted, what is skipped, what happens
// when the opening changes, and that a path is never lost across the join.

globalThis.document = { createElement: () => makeCanvas() };
const { stillFrame, useStill, forgetStill } = await import('../js/render/still.js');

let pass = 0, fail = 0;
const ok = (c, label) => { if (c) { pass++; console.log(`  ok   ${label}`); } else { fail++; console.log(`  FAIL ${label}`); } };

class Ctx {
  constructor(c) { this.canvas = c; this._f = '#000'; this.log = []; this.path = 0; }
  get fillStyle() { return this._f; } set fillStyle(v) { this._f = v; }
  get strokeStyle() { return '#000'; } set strokeStyle(v) {}
  get globalAlpha() { return 1; } set globalAlpha(v) {}
  get globalCompositeOperation() { return 'source-over'; } set globalCompositeOperation(v) {}
  get lineCap() { return 'butt'; } set lineCap(v) {}
  get lineJoin() { return 'miter'; } set lineJoin(v) {}
  get miterLimit() { return 10; } set miterLimit(v) {}
  get lineWidth() { return 1; } set lineWidth(v) {}
  get font() { return '10px x'; } set font(v) {}
  get textAlign() { return 'left'; } set textAlign(v) {}
  get textBaseline() { return 'alphabetic'; } set textBaseline(v) {}
  get lineDashOffset() { return 0; } set lineDashOffset(v) {}
  getLineDash() { return []; }
  beginPath() { this.path = 0; } moveTo() { this.path++; } lineTo() { this.path++; } arc() { this.path++; } rect() { this.path++; }
  bezierCurveTo() {} quadraticCurveTo() {} arcTo() {} ellipse() {} roundRect() {} closePath() {}
  fill() { this.log.push(`fill:${this.path}`); } stroke() { this.log.push(`stroke:${this.path}`); }
  fillRect(x) { this.log.push(`rect:${x}`); } strokeRect() {} clearRect() {} fillText() {} strokeText() {}
  drawImage(i) { this.log.push(i === this.canvas ? 'self' : 'picture'); }
  save() {} restore() {} translate() {} scale() {} rotate() {} transform() {} setTransform() {} resetTransform() {} setLineDash() {} clip() { this.log.push(`clip:${this.path}`); }
  createLinearGradient() { return { addColorStop() {} }; } createRadialGradient() { return { addColorStop() {} }; } createConicGradient() { return { addColorStop() {} }; }
}
function makeCanvas() {
  const c = { id: 'scene', width: 100, height: 50, getBoundingClientRect: () => ({ width: 100, height: 50 }) };
  const g = new Ctx(c);
  c.getContext = () => g;
  return c;
}

const OPENING = 60;
/** A stage: an opening of rects, then a fill-and-stroke of one path, then what moves at x. */
const stage = (c, x, first = 0) => () => {
  const g = c.getContext();
  for (let i = 0; i < OPENING; i++) g.fillRect(i + first);
  g.beginPath(); g.moveTo(1, 1); g.lineTo(2, 2); g.fill(); g.lineTo(3, 3); g.stroke();
  g.fillRect(1000 + x);
};

console.log('\nThe opening is painted once');
{
  const c = makeCanvas(), g = c.getContext();
  stillFrame(c, stage(c, 1)); ok(g.log.length === OPENING + 3, 'the first frame paints everything');
  g.log.length = 0; stillFrame(c, stage(c, 1)); ok(g.log.length === OPENING + 3, 'an identical frame: nothing yet says where the opening ends');
  g.log.length = 0; stillFrame(c, stage(c, 2)); ok(g.log.length === OPENING + 3, 'the frame that first differs still paints everything, and keeps a picture');
  g.log.length = 0; stillFrame(c, stage(c, 3));
  ok(g.log[0] === 'picture' && g.log.at(-1) === 'rect:1003' && g.log.length === 2, `then the picture and what moves: ${g.log.join(' ')}`);
  g.log.length = 0; stillFrame(c, stage(c, 4)); ok(g.log[0] === 'picture' && g.log.length === 2, 'and so on');
}
console.log('\nThe opening changes');
{
  const c = makeCanvas(), g = c.getContext(); let again = 0;
  stillFrame(c, stage(c, 1)); stillFrame(c, stage(c, 2)); stillFrame(c, stage(c, 3));
  g.log.length = 0; stillFrame(c, stage(c, 4, 7), () => { again++; });
  ok(again === 1 && g.log.filter((x) => x === 'rect:7').length === 1 && g.log.at(-1) === 'rect:1004', 'a changed opening is drawn again in full, that frame');
  g.log.length = 0; stillFrame(c, stage(c, 5, 7)); ok(g.log.length === OPENING + 3, 'and watched afresh');
  stillFrame(c, stage(c, 6, 7));
  g.log.length = 0; stillFrame(c, stage(c, 7, 7)); ok(g.log[0] === 'picture' && g.log.length === 2, 'and kept again');
}
console.log('\nThe join');
{
  // the first thing that differs is a stroke of a path whose fill the picture holds
  const c = makeCanvas(), g = c.getContext();
  const s = (w) => () => { for (let i = 0; i < OPENING; i++) g.fillRect(i); g.beginPath(); g.moveTo(1, 1); g.lineTo(2, 2); g.fill(); g.lineWidth = w; g.stroke(); };
  stillFrame(c, s(1)); stillFrame(c, s(2));
  g.log.length = 0; stillFrame(c, s(3));
  ok(g.log.join(' ') === 'picture stroke:2', `a stroke after the join still has the path built before it: ${g.log.join(' ')}`);
}
{
  // a clip in the opening needs its path, picture or no picture
  const c = makeCanvas(), g = c.getContext();
  const s = (x) => () => { g.beginPath(); g.rect(0, 0, 1, 1); g.clip(); for (let i = 0; i < OPENING; i++) g.fillRect(i); g.fillRect(1000 + x); };
  stillFrame(c, s(1)); stillFrame(c, s(2));
  g.log.length = 0; stillFrame(c, s(3));
  ok(g.log.includes('clip:1'), 'a clip keeps its path');
}
console.log('\nLeft alone');
{
  const c = makeCanvas(), g = c.getContext();
  const s = (x) => () => { g.fillRect(x); for (let i = 0; i < OPENING; i++) g.fillRect(i); };
  for (let i = 0; i < 12; i++) stillFrame(c, s(i));
  ok(!g.log.includes('picture'), 'an opening that changes from its first call never gets a picture');
  g.log.length = 0; stillFrame(c, s(99)); ok(g.log.length === OPENING + 1, 'and is painted in full');
}
{
  const c = makeCanvas(), g = c.getContext();
  stillFrame(c, stage(c, 1)); stillFrame(c, stage(c, 2)); stillFrame(c, stage(c, 3));
  forgetStill(c); g.log.length = 0; stillFrame(c, stage(c, 4)); ok(!g.log.includes('picture'), 'a webfont arrived: the picture is forgotten');
  useStill(false); g.log.length = 0; stillFrame(c, stage(c, 5)); ok(g.log.length === OPENING + 3, 'turned off: everything, the plain way');
  useStill(true);
}
{
  const c = makeCanvas(), g = c.getContext();
  stillFrame(c, stage(c, 1)); stillFrame(c, stage(c, 2));
  c.getBoundingClientRect = () => ({ width: 200, height: 50 });
  g.log.length = 0; stillFrame(c, stage(c, 3)); ok(!g.log.includes('picture'), 'a new size: no picture from the old one');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
