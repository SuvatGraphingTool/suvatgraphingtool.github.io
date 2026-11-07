// anything.test.mjs — draw anything: an object is never refused and never
// silently a dot. Run with: node test/anything.test.mjs

import fs from 'node:fs';

globalThis.document ??= { documentElement: { dataset: {}, getAttribute: () => null } };
globalThis.getComputedStyle ??= () => ({ getPropertyValue: () => '' });
globalThis.matchMedia ??= () => ({ matches: false });

const { figureOf, whoIn, ownWord, senderIn, namedThing, pieceOf } = await import('../js/compose/registry.js');
const { isBlocked, isUnprintable, materialOf, landingFor, settleEffects, normaliseName, floats, MATERIALS } = await import('../js/compose/things.js');
const { sanitizeSvg, qualityIssue, MAX_BYTES } = await import('../js/compose/svgsafe.js');
const { check, compose, composeSensibly, fromReading, titleOf } = await import('../js/compose/recipe.js');
const { rowOf, RUNG, DRAW_URL, DEADLINE_MS } = await import('../js/compose/pictures.js');
const { steps } = await import('../js/compose/reveal.js');
const { draw, NEW_PER_DAY, NEW_PER_HOUR_PER_IP, DRAW_PROMPT } = await import('../worker/src/draw.js');
const { READER } = await import('../js/ai/capture.js');

let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log(`  FAIL ${msg}`); } };
const group = (name, fn) => { console.log(`\n${name}`); return fn(); };
const icons = JSON.parse(fs.readFileSync(new URL('../js/compose/icons.json', import.meta.url), 'utf8'));
const licence = fs.readFileSync(new URL('../js/compose/ICONS-LICENSE.txt', import.meta.url), 'utf8');
const preload = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

group('The ladder: a word finds its rung', () => {
  ok(figureOf('car').figure === 'car' && figureOf('football').figure === 'football' && figureOf('egg').figure === 'egg', 'an exact figure always wins');
  ok(figureOf('tennis ball').figure === 'tennisBall' && figureOf('bottle').figure === 'bottle', 'and nothing about the hand-built ones changes');
  for (const w of ['glass', 'laptop', 'piano', 'watermelon', 'a large glass vase', 'car battery', 'apple pie', 'dragon']) {
    ok(figureOf(w).figure === 'thing' && figureOf(w).exact, `“${w}” is an object, not a dot`);
  }
  ok(figureOf('a large glass vase').thing === 'glass vase' && figureOf('two watermelons').thing === 'watermelon', 'a name is cut down to what it is');
  ok(rowOf(icons, 'glass') && rowOf(icons, 'wine glass') && rowOf(icons, 'watermelon') && rowOf(icons, 'piano') && rowOf(icons, 'laptop'), 'the brief’s objects have an icon');
  ok(rowOf(icons, 'cup of coffee') === rowOf(icons, 'cup') && rowOf(icons, 'kitchen glass') === rowOf(icons, 'glass'), 'a phrase finds what it is about');
  ok(rowOf(icons, 'sprocket gizmo') === null, 'something the catalogue has no picture of goes on down the ladder');
  ok(RUNG.ICON < RUNG.DRAWN && RUNG.DRAWN < RUNG.LABEL, 'the rungs in order');
  for (const w of ['body', 'a body', 'projectile', 'object', 'particle']) ok(['particle', 'stone'].includes(figureOf(w).figure), `“${w}” stays the exam’s word for it`);
  ok(check({ backdrop: 'orchard', engine: 'projectile', objects: [{ figure: 'pear' }], numbers: { h: 3, u: 0, theta: -90 } }).ok, 'no place refuses an object');
  ok(check({ backdrop: 'tower', engine: 'pair', objects: [{ figure: 'glass' }, { figure: 'mug' }], numbers: { 'A.h': 20, 'A.u': 0, 'B.h': 0, 'B.u': 10 } }).ok, 'no engine refuses one: two on a line');
  ok(check({ backdrop: 'hall', engine: 'bounce', objects: [{ figure: 'teddy' }], numbers: { h: 3, start: 'drop', e: 0.5 } }).ok, 'a bounce neither');
});

group('What the catalogue leaves out', () => {
  const slugs = Object.keys(icons.icons), words = Object.keys(icons.words);
  ok(slugs.length >= 250, `several hundred objects: ${slugs.length}`);
  const banned = /gun|pistol|rifle|knife|dagger|sword|bomb|grenade|axe$|crossed-swords|firecracker|cigarette|syringe|pill|coffin|skull|flag|-face|^man-|^man$|^woman-|^woman$|^person|^people|heart$|hand|dark|medium|light$/;
  const hit = slugs.filter((s) => banned.test(s) && !/light-bulb|handbag/.test(s));
  ok(!hit.length, `no faces, people, hands, flags, skin tones or weapons: ${hit.join(', ')}`);
  ok(words.every((w) => !isUnprintable(w)), 'and nothing rude answers to one');
  ok(slugs.every((s) => sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${icons.icons[s].b}</svg>`).ok), 'every icon passes the same allowlist as a model’s drawing');
  ok(slugs.every((s) => MATERIALS.includes(icons.icons[s].mat) && icons.icons[s].m > 0), 'every icon says what it is made of, and its size');
  ok(/MIT License/.test(licence) && /Microsoft/.test(licence), 'the licence notice is there');
  ok(!/compose\/icons\.json/.test(preload), 'the catalogue is no modulepreload hint: the first load does not grow by it');
});

group('The word arrives', () => {
  const said = [
    ['a glass is dropped off a rooftop', 'glass'], ['a piano falls from a crane', 'piano'], ['someone throws a watermelon off a bridge', 'watermelon'],
    ['laptop thrown off a table', 'laptop'], ['a laptop thrown off a table', 'laptop'], ['throw a laptop off a table', 'laptop'], ['I drop my tablet from a bridge', 'tablet'],
    ['a 2 kg vase falls', 'vase'], ['a cup of tea is dropped', 'cup of tea'], ['A seagull drops a shell from 80 m.', 'shell'],
    ['A girl on a bridge throws a large watermelon', 'watermelon'], ['a dog knocks a vase off a table', 'vase'],
  ];
  for (const [t, w] of said) ok(whoIn(t) === w, `“${t}”: ${w}, got ${whoIn(t)}`);
  const none = ['A ball is thrown', 'a stone falls from a tree', 'A particle is projected at 20 m/s', 'A body falls', 'a man falls from a ladder', 'the speed drops', 'the temperature falls', 'A dolphin leaps out of the water', 'a car falls off a cliff', 'A diver jumps from a board', 'a person jumping off a diving board', 'the time taken falls', 'dropped from a height of 3 m'];
  for (const t of none) ok(namedThing(t) === null, `“${t}” names no new object: got ${namedThing(t)}`);
  ok(whoIn('A ball is thrown') === 'ball' && figureOf(whoIn('a particle is projected')).figure === 'particle', 'a ball and a particle stay as they are');
  ok(whoIn('a man falls from a ladder') === 'man', 'a person falling from a ladder is the person');
});

group('The student’s word beats the model’s ball (“laptop thrown off a table”)', () => {
  // the model answers figure "ball" and no who, and gives no height
  const answer = (backdrop = 'table') => ({ understood: true, scenario: 'compose', summary: 'A ball is thrown off it.', recipe: { title: 'A ball off it', backdrop, engine: 'projectile', objects: [{ figure: 'ball', name: 'the ball' }], numbers: {} } });
  for (const [text, thing, backdrop] of [['laptop thrown off a table', 'laptop', 'table'], ['a glass thrown off a table', 'glass', 'table'], ['a piano is pushed off a table', 'piano', 'table'], ['a watermelon is thrown off a table', 'watermelon', 'table']]) {
    const x = ownWord(answer(backdrop), text);
    ok(x.who === thing, `${text}: who is ${thing}`);
    const c = compose(x.recipe);
    ok(c.ok && c.scenario.recipe.objects[0].figure === 'thing' && c.scenario.recipe.objects[0].thing === thing, `${text}: the ${thing} is what is drawn, not refused for its missing height`);
    ok(!/\bball\b/i.test(c.scenario.name) && !/\bball\b/i.test(x.summary), `${text}: no ball in the title or the summary: ${c.scenario.name} / ${x.summary}`);
    const s = composeSensibly(x.recipe, text);
    ok(s.ok && s.scenario.recipe.objects[0].thing === thing && s.scenario.recipe.numbers.h > 0, `${text}: common sense fills in the height, and the ${thing} is still there`);
  }
  ok(ownWord(answer(), 'a ball thrown off a table').recipe.objects[0].figure === 'ball', 'a ball thrown off a table stays a ball');
  const pa = ownWord({ ...answer(), recipe: { ...answer().recipe, objects: [{ figure: 'particle' }] } }, 'a particle is thrown off a table');
  ok(pa.recipe.objects[0].figure === 'particle', 'a particle stays a particle');
  ok(ownWord({ understood: true, scenario: 'dropped', h: 5, who: 'bottle' }, 'a glass bottle is dropped').who === 'bottle', 'a figure the model named stands');
  const twelve = fromReading({ understood: true, scenario: 'dropped', words: 'a glass is dropped off a rooftop', who: 'ball', h: 30, summary: 'A ball is dropped.' });
  ok(twelve?.recipe?.objects[0].figure === 'glass' && twelve.recipe.backdrop === 'city', 'one of the twelve read as a ball: composed, the glass on the rooftop');
  ok(titleOf(check(twelve.recipe).recipe) === 'A glass dropped from a rooftop', `its title: ${titleOf(check(twelve.recipe).recipe)}`);
  ok(fromReading({ understood: true, scenario: 'platform', h: 20, u: 5, who: 'stone', words: 'a stone is thrown' }) === null, 'a stone stays where it was');
  // what a reopened chat carries is read back the same
  const saved = JSON.parse(JSON.stringify(check(compose(ownWord(answer(), 'laptop thrown off a table').recipe).scenario.recipe).recipe));
  ok(compose(saved).scenario.recipe.objects[0].thing === 'laptop', 'a saved chat’s recipe reopens as the laptop');
  const notes = compose(ownWord(answer(), 'laptop thrown off a table').recipe).scenario.recipe.notes.join(' ');
  ok(!/Drawn as|nearest|no laptop figure/.test(notes), 'and no note says it is drawn as something else');
});

group('Everything named appears: who sends it off', () => {
  const S = (t) => senderIn(t);
  ok(S('a human pushed off a cliff by another human')?.kind === 'person' && S('a human pushed off a cliff by another human').verb === 'push', 'pushed by another human');
  ok(S('a girl throws a ball')?.kind === 'person' && S('a girl throws a ball').verb === 'throw', 'a girl throws');
  ok(S('a man drops a parcel from a bridge')?.verb === 'drop' && S('a boy kicks a ball off a cliff')?.verb === 'kick', 'a man drops, a boy kicks');
  ok(S('a dog knocks a vase off a table')?.figure === 'dog' && S('a dog knocks a vase off a table').verb === 'knock', 'a dog knocks');
  ok(S('a ball is pushed off a roof by a man')?.kind === 'person', 'pushed by a man');
  ok(S('A girl on a bridge throws a large watermelon')?.kind === 'person', 'a girl on a bridge throws');
  ok(S('a cat is knocked off a shelf by an elephant')?.kind === 'thing', 'a picture can send it too');
  for (const t of ['a ball is thrown by', 'a ball is thrown', 'a stone is dropped from a bridge', 'a person jumps off a cliff', 'a diver pushes off the board', 'a ball is pushed by the wind', 'a ball is thrown by hand',
    'a man falls off a ladder', 'a ball is dropped by 3 m', 'a girl drops from a ledge', 'a ball is thrown and is caught by a girl', 'a bird drops a fish', 'a helicopter drops a parcel', 'it is thrown']) {
    ok(S(t) === null, `no one sends it in “${t}”: ${JSON.stringify(S(t))}`);
  }
  const words = 'a human pushed off a cliff by another human';
  const r = fromReading(ownWord({ understood: true, scenario: 'library', library: 'from-a-height', boxes: { place: 'cliff', h: 40, u: 3, theta: 0 }, summary: 'A person is pushed off.' }, words));
  ok(r?.recipe?.objects[0].figure === 'diver' && r.recipe.sender?.verb === 'push', 'a person pushed off a cliff: one falls, one pushes');
  const c = check(r.recipe).recipe;
  ok(c.sender?.kind === 'person' && titleOf(c) === 'A person pushed off a cliff', `its title: ${titleOf(c)}`);
  ok(/second person at the edge/.test(steps(c).map((x) => x.say).join(' ')), 'the veil stands the second person at the edge');
  ok(!check({ backdrop: 'cliff', engine: 'projectile', objects: [{ figure: 'ball' }], numbers: { h: 10, u: 1, theta: 0 } }).recipe.sender, 'no sender named, none added');
  ok(!check({ backdrop: 'cliff', engine: 'projectile', launcher: 'cannon', sender: { kind: 'person', verb: 'throw' }, objects: [{ figure: 'ball' }], numbers: { h: 10, u: 1, theta: 0 } }).recipe.sender, 'a launcher is its own sender');
  const before = compose({ backdrop: 'cliff', engine: 'projectile', objects: [{ figure: 'diver' }], numbers: { h: 40, u: 3, theta: 0 } });
  const after = compose({ backdrop: 'cliff', engine: 'projectile', sender: { kind: 'person', verb: 'push' }, objects: [{ figure: 'diver' }], numbers: { h: 40, u: 3, theta: 0 } });
  ok(before.kit.solve(before.kit.read(before.boxes)).T === after.kit.solve(after.kit.read(after.boxes)).T, 'drawing only: the engine’s numbers do not change');
});

group('The veil says what is really happening', () => {
  const glass = check({ backdrop: 'city', engine: 'projectile', objects: [{ figure: 'glass' }], numbers: { h: 30, u: 0, theta: -90 } }).recipe;
  const lines = steps(glass, { solve: () => {}, prepared: Promise.resolve() });
  ok(lines[0].say === 'Building the city…' && lines.some((l) => l.say === 'Drawing the glass…' && l.work) && lines.some((l) => l.say === 'Working out the motion…' && l.work), lines.map((l) => l.say).join(' / '));
  const car = steps(check({ backdrop: 'cliff', engine: 'projectile', objects: [{ figure: 'car' }], numbers: { h: 30, u: 5, theta: 0 } }).recipe);
  ok(car.find((l) => l.say === 'Drawing the car…') && !car.find((l) => l.say === 'Drawing the car…').work, 'a figure that needs nothing fetched waits for nothing');
  const src = fs.readFileSync(new URL('../js/compose/reveal.js', import.meta.url), 'utf8');
  ok(!/cr-chips|cr-bar|cr-title/.test(src), 'no pills, no progress bar, no title on the veil');
});

group('Safe to show: the sanitiser with hostile SVG', () => {
  const wrap = (s) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${s}</svg>`;
  const good = wrap('<defs><linearGradient id="a"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient></defs><g fill="#123"><path fill="url(#a)" d="M1 1h4v4z"/><circle cx="3" cy="3" r="2"/></g>');
  ok(sanitizeSvg(good).ok, 'a clean picture passes');
  ok(!/href|script/.test(sanitizeSvg(good).svg) && /width="256"/.test(sanitizeSvg(good).svg), 'and is written anew');
  const hostile = {
    script: wrap('<script>alert(1)</script>'), style: wrap('<style>*{fill:red}</style>'), image: wrap('<image href="x.png"/>'), use: wrap('<use href="#a"/>'),
    foreign: wrap('<foreignObject><div/></foreignObject>'), animate: wrap('<circle r="1"><animate attributeName="r"/></circle>'), set: wrap('<set attributeName="x"/>'),
    onload: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" onload="alert(1)"/>', onclick: wrap('<rect onclick="alert(1)" width="1" height="1"/>'),
    href: wrap('<a href="javascript:alert(1)"><circle r="1"/></a>'), xlink: wrap('<linearGradient id="a" xlink:href="#b"/>'), external: wrap('<rect fill="url(https://evil.example/x)" width="1" height="1"/>'),
    externalHash: wrap('<rect fill="url(http://evil.example/#a)" width="1" height="1"/>'), noTarget: wrap('<rect fill="url(#nope)" width="1" height="1"/>'), text: wrap('<text>hi</text>'), bareText: wrap('hello<circle r="1"/>'),
    styleAttr: wrap('<rect style="fill:url(https://evil.example)" width="1" height="1"/>'), entity: wrap('<rect fill="&#x72;ed" width="1" height="1"/>'), doctype: '<!DOCTYPE svg [<!ENTITY x "y">]>' + wrap(''), comment: wrap('<!-- <script> --><circle r="1"/>'),
    cdata: wrap('<![CDATA[<script>]]>'), pi: wrap('<?xml-stylesheet href="x"?>'), viewBox: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"/>', noViewBox: '<svg xmlns="http://www.w3.org/2000/svg"/>',
    twoRoots: wrap('<svg viewBox="0 0 32 32"/>'), unclosed: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><g>', mismatched: wrap('<g></path>'), attrTwice: wrap('<rect width="1" width="2" height="1"/>'),
    transform: wrap('<g transform="url(#a)"><rect width="1" height="1"/></g>'), pathScript: wrap('<path d="javascript:alert(1)"/>'), fillJs: wrap('<rect fill="javascript:alert(1)" width="1" height="1"/>'), upper: wrap('<SCRIPT>alert(1)</SCRIPT>'),
    ns: wrap('<svg:script>alert(1)</svg:script>'), big: wrap(`<path d="M0 0${'h1'.repeat(MAX_BYTES)}"/>`), notString: 42,
  };
  for (const [name, svg] of Object.entries(hostile)) ok(!sanitizeSvg(svg).ok, `refused: ${name}`);
  ok(qualityIssue(sanitizeSvg(wrap('<circle r="1" fill="#000"/><circle r="2" fill="#fff"/>')).info), 'too few shapes');
  ok(qualityIssue(sanitizeSvg(wrap('<circle r="1" fill="#000"/>'.repeat(8))).info) === 'a single colour', 'a single colour');
  ok(qualityIssue(sanitizeSvg(wrap(`<rect width="32" height="32" fill="#000"/>${'<circle r="1" fill="#fff"/>'.repeat(8)}`)).info) === 'a background', 'a background');
  ok(qualityIssue(sanitizeSvg(wrap(`${'<circle r="1" fill="#000"/>'.repeat(8)}<circle r="1" fill="#fff"/>`)).info) === null, 'a good one passes');
});

await group('POST /draw, with a fake model and a fake database', async () => {
  // a fake D1: just enough SQL for what draw.js says
  function fakeDb() {
    const drawings = new Map(), log = [];
    const db = {
      drawings, log,
      prepare(sql) {
        return { bind(...a) {
          return {
            first: async () => {
              if (/FROM drawings/.test(sql)) return drawings.get(a[0]) ?? null;
              if (/spent = 1/.test(sql)) return { n: log.filter((r) => r.spent === 1 && r.at >= a[0]).length };
              if (/FROM draw_log/.test(sql)) return { n: log.filter((r) => r.ip === a[0] && r.at > a[1]).length };
              throw new Error(`first: ${sql}`);
            },
            run: async () => {
              if (/INTO drawings/.test(sql)) drawings.set(a[0], { name: a[0], svg: a[1], material: a[2], status: a[3], created: a[4] });
              else if (/INTO draw_log/.test(sql)) log.push({ ip: a[0], at: a[1], spent: /, 1\)/.test(sql) ? 1 : 0 });
              else if (/DELETE/.test(sql)) { /* old rows */ } else throw new Error(`run: ${sql}`);
            },
          };
        } };
      },
    };
    return db;
  }
  const PICTURE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${'<circle cx="16" cy="16" r="9" fill="#123456"/>'.repeat(9)}<rect width="9" height="9" fill="#fedcba"/></svg>`;
  const model = (extraction) => { const f = async (env, models, payload, options) => { f.calls.push({ models, payload, options }); return extraction === null ? { ok: false } : { ok: true, extraction }; }; f.calls = []; return f; };
  const ask = async (env, name, race, ip = '1.1.1.1', now = 1_800_000_000_000) => {
    const res = await draw(new Request('https://x.test/draw', { method: 'POST', headers: { 'CF-Connecting-IP': ip }, body: JSON.stringify({ name }) }), env, {}, { race, now });
    return { code: res.status, ...(await res.json()) };
  };
  const envOf = () => ({ DB: fakeDb(), GEMINI_API_KEY: 'test' });

  let env = envOf(), race = model({ svg: PICTURE, material: 'china', refuse: false });
  let r = await ask(env, 'Sprocket Gizmo!!', race);
  ok(r.status === 'ok' && r.material === 'china' && race.calls.length === 1, 'a new name is drawn, once');
  ok(/width="256"/.test(r.svg), 'and what comes back was written by the sanitiser');
  const user = race.calls[0].payload.contents.map((c) => c.parts.map((p) => p.text).join(' ')).join(' ');
  ok(user === 'Draw: sprocket gizmo', `only the normalised name reaches the model: ${user}`);
  ok(race.calls[0].payload.system_instruction.parts[0].text === DRAW_PROMPT && !/COMPOSING A SCENE/.test(DRAW_PROMPT), 'with its own small prompt, not the reader’s');
  ok(race.calls[0].payload.generationConfig.thinkingConfig.thinkingLevel === 'high' && race.calls[0].options.deadlineMs >= 20_000 && race.calls[0].options.deadlineMs < DEADLINE_MS, 'room to think, inside the page’s deadline');
  ok(/gemini/.test(race.calls[0].models[0].name), 'Gemini first');
  r = await ask(env, 'sprocket gizmo', race);
  ok(r.status === 'ok' && r.cached && race.calls.length === 1, 'a cached name costs no model call');
  r = await ask(env, 'a sprocket gizmos', race, '9.9.9.9');
  ok(r.cached && race.calls.length === 1, 'the same object in other words, from anyone, is the same drawing');

  for (const bad of [{}, { name: 42 }, { name: '' }, { name: '123 !!' }]) {
    const res = await draw(new Request('https://x.test/draw', { method: 'POST', body: JSON.stringify(bad) }), envOf(), {}, { race });
    ok(res.status === 400, `refuses a body with ${JSON.stringify(bad)}`);
  }
  ok(normaliseName('<script>Alert(1)</script> a very long name indeed that keeps on going') === 'script alert script a very lon', `normalised: ${normaliseName('<script>Alert(1)</script> a very long name indeed that keeps on going')}`);

  // the limits
  env = envOf(); race = model({ svg: PICTURE, material: 'wood' });
  for (let i = 0; i < NEW_PER_HOUR_PER_IP; i++) ok((await ask(env, `gadget ${'abcdefgh'[i]}`, race)).status === 'ok', `new drawing ${i + 1} from one address`);
  r = await ask(env, 'gadget z', race);
  ok(r.status === 'limited' && race.calls.length === NEW_PER_HOUR_PER_IP, `five an hour from one address: then ${r.status}`);
  r = await ask(env, 'gadget a', race);
  ok(r.status === 'ok' && r.cached, 'and what is cached still comes back');
  r = await ask(env, 'gadget z', race, '1.1.1.1', 1_800_000_000_000 + 2 * 3_600_000);
  ok(r.status === 'ok', 'an hour on, that address may ask again');
  env = envOf(); race = model({ svg: PICTURE, material: 'wood' });
  const az = 'abcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < NEW_PER_DAY; i++) await ask(env, `gizmo${az[i]}`, race, `10.0.0.${i}`);
  ok(race.calls.length === NEW_PER_DAY, `${NEW_PER_DAY} new drawings`);
  r = await ask(env, 'gizmoz', race, '10.0.1.1');
  ok(r.status === 'limited' && race.calls.length === NEW_PER_DAY, 'and no more that day, from anyone');

  // the blocklist, and refusal
  env = envOf(); race = model({ svg: PICTURE, material: 'wood' });
  for (const name of ['grenade', 'hand grenade', 'pistol', 'a teacher', 'human', 'cocaine', 'fuck', 'f u c k', 'penis', 'swastika', 'knife', 'head']) {
    r = await ask(env, name, race, `20.0.0.${name.length}`);
    ok(r.status === 'refused' && !r.svg, `${name}: refused`);
  }
  ok(race.calls.length === 0, 'and never reached a model');
  ok(env.DB.drawings.get('grenade')?.status === 'refused', 'cached as refused');
  ok(isUnprintable('fuck') && !isUnprintable('duck') && !isUnprintable('scunthorpe bus'), 'the worst words are not even printed, and a duck is a duck');
  ok(pieceOf({ figure: 'thing', thing: 'fuck' }).label === 'an object', 'the last rung prints “object” for it');
  ok(!isBlocked('glass') && !isBlocked('laptop') && !isBlocked('cocktail glass') && !isBlocked('sprocket gizmo'), 'an ordinary name is not');
  race = model({ refuse: true });
  r = await ask(env, 'creepy thing', race, '30.0.0.1');
  ok(r.status === 'refused' && env.DB.drawings.get('creepy thing')?.status === 'refused', 'the model may refuse: cached as refused');
  r = await ask(env, 'creepy thing', race, '30.0.0.1');
  ok(r.cached && race.calls.length === 1, 'and not asked again');

  // the quality gate
  for (const [why, svg] of [['script', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><script>x</script></svg>`], ['few shapes', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle r="1" fill="#000"/><circle r="1" fill="#fff"/></svg>'],
    ['one colour', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${'<circle r="1" fill="#000"/>'.repeat(12)}</svg>`], ['wrong viewBox', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${'<circle r="1" fill="#000"/>'.repeat(12)}</svg>`]]) {
    env = envOf(); race = model({ svg, material: 'wood' });
    r = await ask(env, 'widget', race);
    ok(r.status === 'failed' && !r.svg && env.DB.drawings.get('widget')?.status === 'failed', `${why}: failed, and cached`);
    r = await ask(env, 'widget', race);
    ok(r.status === 'failed' && race.calls.length === 1, `${why}: a bad drawing is not paid for twice`);
  }
  // a busy model says nothing about the object
  env = envOf(); race = model(null);
  r = await ask(env, 'widget', race);
  ok(r.status === 'busy' && !env.DB.drawings.has('widget'), 'a busy model is not cached: it can be asked again');
  // a material from outside the list is no material
  env = envOf(); race = model({ svg: PICTURE, material: 'unobtainium' });
  r = await ask(env, 'widget', race);
  ok(r.status === 'ok' && r.material === null, 'an unknown material is none');
  ok((await draw(new Request('https://x.test/draw', { method: 'POST', body: '{"name":"widget"}' }), {}, {}, { race })).status === 503, 'with no database it says so, and the page goes on');
  ok(new URL(DRAW_URL).origin === new URL(READER).origin && DRAW_URL.endsWith('/draw') && /^https:/.test(DRAW_URL), 'called by the reader’s full address, on github.io and workers.dev alike');

  // the route itself, its CORS and origin rules
  const worker = (await import('../worker/src/index.js')).default;
  const post = (origin, env2) => worker.fetch(new Request('https://x.test/draw', { method: 'POST', headers: { Origin: origin }, body: JSON.stringify({ name: 'grenade' }) }), env2, { waitUntil() {} });
  const routeEnv = { ...envOf(), ALLOWED_ORIGINS: 'https://suvatgraphingtool.github.io' };
  ok((await post('https://evil.example', routeEnv)).status === 403, 'another site is refused, as on /extract');
  const fine = await post('https://suvatgraphingtool.github.io', routeEnv);
  ok(fine.status === 200 && fine.headers.get('Access-Control-Allow-Origin') === 'https://suvatgraphingtool.github.io' && (await fine.json()).status === 'refused', 'the site is answered, with its CORS');
});

await group('It survives the conversation', async () => {
  const { answered, namedPlace, toFigure, toComposed } = await import('../worker/src/composeplace.js');
  // "20 m", in answer to "how high?": the object stays
  const first = ownWord({ understood: true, scenario: 'compose', summary: 'A ball goes.', recipe: { backdrop: 'table', engine: 'projectile', objects: [{ figure: 'ball' }], numbers: {} } }, 'laptop thrown off a table');
  const next = answered('2 m', [{ role: 'model', parts: [{ text: JSON.stringify(first) }] }]);
  ok(next?.recipe?.numbers?.h === 2 && next.recipe.objects[0].figure === 'laptop', 'a follow-up height keeps the laptop');
  // the Worker's stages in their order: the word is still there at the end
  const w = 'a watermelon is dropped from the top of a tower';
  const x = namedPlace(toComposed(toFigure(ownWord({ understood: true, scenario: 'compose', summary: 'A ball.', recipe: { backdrop: 'cliff', engine: 'projectile', objects: [{ figure: 'ball' }], numbers: { h: 10 } } }, w), w), w), w);
  ok(x.recipe.objects[0].figure === 'watermelon' && x.recipe.backdrop === 'tower' && x.who === 'watermelon', 'through the Worker’s stages: the student’s object, in the student’s place');
  const pv = toComposed(toFigure({ understood: true, scenario: 'library', library: 'pair-vertical', boxes: { 'A.h': 20, 'A.u': 0, 'B.h': 0, 'B.u': 10 }, summary: 'Two things.' }, 'a mug is dropped from the top of a tower'), 'a mug is dropped from the top of a tower');
  ok(pv.recipe?.objects?.[0]?.figure === 'mug' && compose(pv.recipe).ok, 'two on a line, as the object named');
  // a part with a scene of its own
  const { scenesOf } = await import('../js/compose/recipe.js');
  const { scenes } = scenesOf([{ label: 'c', asks: 'how far', answer: 'distance', recipe: { backdrop: 'ground', engine: 'projectile', objects: [{ figure: 'teapot' }], numbers: { h: 0, u: 10, theta: 40 } } }]);
  ok(scenes[0].c.ok && scenes[0].c.scenario.recipe.objects[0].thing === 'teapot', 'a part’s own scene can have one');
  // a saved chat, with the whole composed recipe in it
  const again = compose(JSON.parse(JSON.stringify(compose({ backdrop: 'cliff', engine: 'projectile', sender: { kind: 'person', word: 'man', verb: 'push' }, objects: [{ figure: 'piano' }], numbers: { h: 20, u: 2, theta: 0 } }).scenario.recipe)));
  ok(again.ok && again.scenario.recipe.objects[0].thing === 'piano' && again.scenario.recipe.sender.verb === 'push' && again.scenario.recipe.autoLanding === 'splash', 'read back: the object, its sender and its landing');
  ok(compose({ backdrop: 'cliff', engine: 'projectile', objects: [{ figure: 'thing' }], numbers: { h: 5, u: 1, theta: 0 } }).scenario.recipe.objects[0].figure === 'particle', 'an object with no name is the exam’s particle, never a crash');
  ok(!(await import('../worker/src/compose.js')).COMPOSE_GUIDE.includes('shatter') && !(await import('../worker/src/compose.js')).COMPOSE_GUIDE.includes('thing —'), 'the reader’s list has grown by nothing');
});

{
  console.log('\nResolve on hover: the hit area is what was drawn');
  const { noteMover, moverAt, clearMovers, movers, arrow } = await import('../js/render/util.js');
  const ctx = (a = 1, e = 0, f = 0, dpr = 1) => ({ _dpr: dpr, getTransform: () => ({ a, b: 0, c: 0, d: a, e, f }), save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {}, closePath() {}, setLineDash() {} });
  clearMovers();
  noteMover(ctx(), 100, 100, 30, { strong: true });
  ok(moverAt(100, 100) && moverAt(125, 100) && !moverAt(135, 100), 'it follows the drawn size: inside, on the rim, and not past it');
  clearMovers();
  noteMover(ctx(2, 10, 20, 2), 50, 50, 20, { strong: true });   // zoomed view at dpr 2: a canvas px is half a CSS px
  ok(moverAt(55, 60) && Math.abs(movers.list[0].r - 20) < 1e-9, 'and the pan and zoom it was drawn through');
  clearMovers();
  noteMover(ctx(), 10, 10, 20);
  noteMover(ctx(), 200, 200, 20, { strong: true });
  ok(!moverAt(10, 10) && moverAt(200, 200), 'an exact report beats what a stage says in passing');
  clearMovers();
  ok(moverAt(10, 10) === null, 'a new frame starts empty');
  globalThis.getComputedStyle = () => ({ getPropertyValue: (k) => ({ '--vel-vec': '#fb923c', '--vel': '#ea580c', '--second': '#db2777' })[k] || '' });
  arrow(ctx(), 40, 40, 90, 40, { color: '#fb923c' });
  arrow(ctx(), 90, 40, 90, 90, { color: '#fb923c' });
  arrow(ctx(), 300, 300, 330, 300, { color: '#7c3aed' });
  ok(movers.list.length === 1 && moverAt(40, 40), 'a velocity arrow starts on what moves; head to tail, or another quantity’s, says nothing');
  clearMovers();
}

group('What it is made of, and what landing does', () => {
  const cases = [['glass', 'glass'], ['wine glass', 'glass'], ['vase', 'glass'], ['teapot', 'china'], ['plate', 'china'], ['watermelon', 'soft'], ['tomato', 'soft'], ['tyre', 'rubber'], ['trainer', 'rubber'], ['kettle', 'metal'], ['anvil', 'metal'], ['boulder', 'stone'], ['statue', 'stone'], ['chair', 'wood'], ['piano', 'wood'], ['newspaper', 'paper'], ['t-shirt', 'cloth'], ['elephant', 'animal']];
  for (const [w, m] of cases) ok(materialOf(w) === m, `${w}: ${m}, got ${materialOf(w)}`);
  ok(materialOf('sprocket gizmo') === null, 'no word for it: none');
  ok(landingFor('glass', 'dust') === 'shatter' && landingFor('china', 'ring') === 'shatter' && landingFor('soft', 'dust') === 'splat' && landingFor('rubber', 'dust') === 'squish' && landingFor('metal', 'dust') === 'clang' && landingFor('stone', 'dust') === 'thud' && landingFor('wood', 'dust') === 'splinters' && landingFor('paper', 'dust') === 'flutter' && landingFor('cloth', 'ring') === 'flutter', 'each its own landing');
  for (const m of MATERIALS) ok(landingFor(m, 'splash') === 'splash', `water always wins: ${m}`);
  ok(landingFor('glass', 'snow') === 'snow' && landingFor('soft', 'sand') === 'splat', 'soft ground takes the fall; what bursts still bursts');
  ok(landingFor(null, 'dust') === 'dust' && landingFor(null, 'ring') === 'thud', 'unknown: the place’s own, never a bounce ring nothing bounced for');
  ok(floats('wood') && floats('rubber') && !floats('glass') && !floats('metal'), 'wood floats, glass sinks');
  const landed = (figure, backdrop = 'city', below) => check({ backdrop, ...(below ? { below } : {}), engine: 'projectile', objects: [{ figure }], numbers: { h: 30, u: 0, theta: -90 } }).recipe;
  ok(landed('glass').effects.join() === 'shatter', 'a glass off a rooftop shatters');
  ok(landed('watermelon', 'tower').effects.join() === 'splat', 'a watermelon splats');
  ok(landed('glass', 'cliff').effects.includes('splash') && landed('glass', 'cliff').effects.includes('bubbles'), 'over the sea it splashes, and sinks');
  ok(!landed('log', 'cliff').effects.includes('bubbles'), 'a log floats');
  ok(check({ backdrop: 'city', engine: 'projectile', effects: ['dust'], objects: [{ figure: 'glass' }], numbers: { h: 30, u: 0, theta: -90 } }).recipe.effects.join() === 'dust', 'effects the recipe asked for stand');
  // the material a catalogue row or a drawing says, once it comes
  const R = landed('sprocket gizmo');
  ok(R.effects.join() === 'dust', 'before it is known: the place’s own');
  settleEffects(R, 'metal');
  ok(R.effects.join() === 'clang', 'and then what it is');
  settleEffects(R, 'glass');
  ok(R.effects.join() === 'shatter', 'whatever it turns out to be');
  // the engine is untouched
  const a = compose({ backdrop: 'city', engine: 'projectile', objects: [{ figure: 'glass' }], numbers: { h: 30, u: 0, theta: -90 } });
  const b = compose({ backdrop: 'city', engine: 'projectile', objects: [{ figure: 'ball' }], numbers: { h: 30, u: 0, theta: -90 } });
  const sa = a.kit.solve(a.kit.read(a.boxes)), sb = b.kit.solve(b.kit.read(b.boxes));
  ok(sa.T === sb.T && sa.vL === sb.vL, 'drawing only: a glass falls as a ball does');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
