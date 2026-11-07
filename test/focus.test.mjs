// focus.test.mjs — proves a question still gets the catalogue it needs. Run with:
//     node test/focus.test.mjs
//
// worker/src/focus.js sends each typed question every library scenario as one
// line, and in full only the few its words point to (the user, 3 Nov: the free
// allowance ran out after 17 questions). The claim checked here: for questions
// worded as the papers word them — written here in our own words, never the
// papers' — the scenario that fits is among those sent in full. When it is
// not, the Worker asks again with it (index.js), so a miss costs a second
// call, not a wrong reading; this file keeps those misses rare.

import { focusFor, libraryIdsIn, idsInHistory, termsOf } from '../worker/src/focus.js';
import { systemPrompt, SYSTEM_PROMPT } from '../worker/src/schema.js';
import { LIBRARY_IDS } from '../worker/src/library.js';
import reader from '../worker/src/index.js';
import { check } from '../js/compose/recipe.js';
import { namedPlace, answered } from '../worker/src/composeplace.js';
import { composeKindly, compose } from '../js/compose/recipe.js';

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}`); }
}
function group(name, fn) { console.log(`\n${name}`); fn(); }

// question (our wording) → the library scenario that fits
const CASES = [
  ['A stone is thrown horizontally at 15 m/s from the top of a cliff 40 m above the sea. How long until it hits the sea?', 'from-a-height'],
  ['Two trains pass station X at 40 m/s and 30 m/s, both decelerate uniformly and come to rest together at Y. Find T.', 'passed-at-x'],
  ['Two trains leave a station together from rest and stop together at the next station. When do they have the same speed?', 'two-trains'],
  ['A lift rises from rest, accelerates, travels at constant speed, then decelerates to rest. How far does the lift rise?', 'the-lift'],
  ['A lift carrying a passenger of mass 70 kg rises 27 m from rest. Find the tension in the cable and the force from the floor.', 'lift-cable-floor'],
  ['A particle has constant acceleration (2i − 3j) m s⁻². At t = 0 its velocity is (4i + j) m s⁻¹. When is it moving parallel to i?', 'vectors-ij'],
  ['Two ships move with constant velocities (3i + 4j) km/h and (−2i + 5j) km/h. When is one due west of the other?', 'two-in-a-plane'],
  ['A sledge of mass 30 kg is pulled across snow by a rope at 20° to the horizontal with tension 150 N, then let go.', 'pulled-by-a-rope'],
  ['A lifeboat is released from rest down a slipway 50 m long inclined at 15° and enters the sea at 12.6 m/s. Find the coefficient of friction.', 'down-a-rough-slope'],
  ['A box is projected up a rough slope inclined at 20° with speed 12 m/s. How far up does it go before coming to rest?', 'up-a-rough-slope'],
  ['A brick is released 5 m above the surface of water and sinks 4 m through the water with constant deceleration. Find the resistance.', 'into-the-water'],
  ['A ball is thrown up from 1.5 m, falls onto soft ground and sinks 2 cm into it. Find the resistance of the ground.', 'into-soft-ground'],
  ['A ball is dropped onto the ground, bounces and rebounds with half its speed. Find the impulse.', 'bounce'],
  ['A car travels from rest, accelerates, travels at constant speed then decelerates to rest; the journey takes 120 s. Sketch the speed–time graph.', 'journey-stages'],
  ['A car passes a lorry; the lorry sets off 10 s later and catches it. When are they level on the road?', 'two-on-a-road'],
  ['Ball A is thrown up at 20 m/s and ball B is dropped from 30 m at the same time, vertically above. When do they collide?', 'pair-vertical'],
  ['A ball is projected to just clear a wall 5 m high at a horizontal distance of 20 m. Find the two possible angles of projection.', 'over-the-wall'],
  ['A ball is kicked straight up in a sports hall 11.5 m high. Does it hit the ceiling?', 'under-the-ceiling'],
  ['A firework rocket accelerates upwards for 3 s then the fuel burns out. How high does it rise?', 'firework-rocket'],
  ['An aircraft starts from rest at A and takes off at C twenty seconds later. How much of the runway is left?', 'take-off'],
  ['A boat crosses a river flowing at 2 m/s, going straight across in 10 s. Find the speed through the water and the heading.', 'across-the-river'],
  ['A plane heads due north at 200 km/h in a wind blowing east at 50 km/h. Find its ground speed and bearing.', 'flying-in-a-wind'],
  ['A skydiver falls freely, opens the parachute and decelerates, then falls at a steady speed to the ground.', 'parachute-stages'],
  ['A car of mass 1250 kg drives up a hill with driving force 1200 N against resistance 350 N.', 'up-and-down-the-hill'],
  ['A cyclist freewheels down a hill, speeding up from 4 to 10 m/s over 50 m. Find the angle of the slope.', 'freewheeling'],
  ['A puck slides on ice against a constant resistance, hits the boards and bounces back.', 'back-off-the-boards'],
  ['A ball falls past a window 2 m tall in 0.1 s. From how high above the window was it dropped?', 'past-two-marks'],
  ['Two balls are thrown towards each other from A and B, one a second after the other. Do they collide?', 'thrown-towards'],
  ['The velocity–time graph of a particle has straight pieces above and below the axis. When is it back where it started?', 'vt-graph'],
  ['The displacement–time graph of a cyclist: when is the cyclist at rest?', 'xt-graph'],
  ['A car covers 100 m in the first 4 s and 120 m in the next 3 s with constant acceleration. Find its initial speed.', 'past-the-posts'],
  ['Two robots cross a square floor at constant velocities. When are they closest?', 'robots-closest'],
  ['A stone is dropped and a second stone is thrown down one second later from the same height; they land together.', 'land-together'],
  ['A ball is thrown up beside a building and is above its roof for 4 s. How tall is the building?', 'above-the-roof'],
  ['A dog chases a ball thrown along the beach and catches it. How fast must it accelerate?', 'catch-it'],
  ['A car brakes for a sign; model the driver three ways. Which reaches the sign first?', 'three-models'],
  ['A helicopter over the sea has constant acceleration; find its speed and bearing and whether it passes over the rock.', 'over-the-rock'],
];

group('The scenario that fits is sent in full', () => {
  const ids = new Set(LIBRARY_IDS);
  let hits = 0;
  for (const [q, want] of CASES) {
    if (!ids.has(want)) { ok(false, `"${want}" is a library id`); continue; }
    const got = focusFor(q).ids.has(want);
    if (got) hits++;
    ok(got, `${want}: ${q.slice(0, 70)}…`);
  }
  console.log(`  — ${hits} of ${CASES.length} in full`);
});

group('A follow-up keeps the scenario the chat is on', () => {
  const was = idsInHistory(['{"understood":true,"scenario":"library","library":"robots-closest","boxes":{}}']);
  ok(was.join() === 'robots-closest', 'the id is read from the earlier answer');
  ok(focusFor('same again but with g = 9.8', was).ids.has('robots-closest'), '"same but g = 9.8" still has it in full');
});

group('The prompt is smaller, and still whole where it must be', () => {
  const full = SYSTEM_PROMPT.length;
  const p = focusFor(CASES[0][0]);
  const n = systemPrompt(p.library, p.compose).length;
  ok(n < full * 0.6, `a typed question's prompt is ${Math.round(100 * n / full)}% of the whole (${Math.round(n / 1000)}k of ${Math.round(full / 1000)}k)`);
  ok(LIBRARY_IDS.every((id) => p.library.includes(`${id} — `)), 'every library scenario is still named, one line each');
  ok(p.ids.has('from-a-height'), 'From a height, which the rules name, is always in full');
  ok(/^engines\b/m.test(p.compose) && /numbers: /.test(p.compose), "the composer's engines are always in full");
  ok(/also: /.test(p.compose), 'pieces the question does not touch are still listed by name');
  ok(systemPrompt() === SYSTEM_PROMPT, 'with no focus, the prompt is exactly as it was');
});

group('An answer that chose one it was not shown is caught', () => {
  ok(libraryIdsIn({ scenario: 'library', library: 'bounce' }).join() === 'bounce', 'its own library id');
  ok(libraryIdsIn({ parts: [{ scene: { library: 'the-lift' } }] }).join() === 'the-lift', "and a part's scene's");
  ok(termsOf('(3i + 4j) m s⁻¹').has('ijvector'), 'i and j are recognised as vectors');
});

/* The Worker itself, with a model that answers what it is told to and
   remembers every prompt it was given — no real model is asked. */
async function read(body, answer) {
  const prompts = [];
  const env = {
    MODELS: '@cf/test/model', ALLOWED_ORIGINS: '',
    AI: { run: async (model, input) => { prompts.push(input.messages[0].content); return { response: answer(input.messages[0].content) }; } },
  };
  const res = await reader.fetch(new Request('https://reader.test/extract', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), env, { waitUntil() {} });
  return { prompts, data: await res.json() };
}
const robots = (sys) => ({ understood: true, scenario: 'library', library: 'robots-closest', boxes: {} });

console.log('\nThe Worker, end to end');
{
  const shown = await read({ text: 'Two robots cross a square floor at constant velocities. When are they closest?' }, robots);
  ok(shown.prompts.length === 1 && shown.data.ok, 'the scenario it needs was in full: one call');
  ok(shown.prompts[0].length < SYSTEM_PROMPT.length * 0.6, 'and that call carried about half the prompt');

  const missed = await read({ text: 'A ball is kicked from the ground at 20 m/s at 35 degrees.' }, robots);
  ok(missed.prompts.length === 2, 'it chose one it was shown only as a line: asked once more');
  ok(!/robots-closest — [^\n]*\n {2}boxes:/.test(missed.prompts[0]) && /robots-closest — [^\n]*\n {2}boxes:/.test(missed.prompts[1]),
    'the second time, that one is in full');
  ok(missed.data.ok && missed.data.extraction.library === 'robots-closest', 'and its answer is the one returned');

  const photo = await read({ imageBase64: 'AAAA', mimeType: 'image/jpeg', text: 'two robots' }, robots);
  ok(photo.prompts[0] === SYSTEM_PROMPT, 'a photo gets the whole catalogue, as before');
}

/* The user, 7 Nov: "a ball dropped off a rooftop, and it's showing me a cliff". */
console.log('\nThe place the student names is the place drawn');
{
  const ball = (backdrop, numbers = { h: 20, u: 0, theta: -90 }) => ({ understood: true, scenario: 'compose', summary: 'A ball is dropped.',
    recipe: { backdrop, engine: 'projectile', objects: [{ figure: 'ball' }], numbers } });
  const drawn = (words, backdrop = 'cliff', numbers) => namedPlace(ball(backdrop, numbers), words).recipe.backdrop;
  const SAID = [
    ['a ball dropped off a rooftop', 'city'], ['a ball is dropped from a 20 m rooftop', 'city'],
    ['a ball dropped off a skyscraper', 'city'], ['a stone falls from the top of a building', 'city'],
    ['a ball dropped from the roof of a house', 'house'], ['a ball dropped off a roof', 'house'],
    ['a ball dropped from a balcony', 'house'], ['a ball dropped out of a window', 'house'],
    ['a ball dropped from a tower', 'tower'], ['a stone dropped off a bridge', 'bridge'],
    ['an apple falls from a tree', 'orchard'], ['a rock falls off a mountain', 'mountain'],
    ['a ball dropped from a lighthouse', 'lighthouse'], ['a ball dropped off a pier', 'pier'],
    ['a stone thrown from a castle wall', 'castle'], ['a ball dropped off a multi-storey car park', 'carpark'],
  ];
  for (const [words, want] of SAID) {
    const r = namedPlace(ball('cliff'), words).recipe;
    ok(r.backdrop === want && check(r).ok, `"${words}", the model says cliff: drawn as ${r.backdrop}, and it runs`);
  }
  ok(drawn('a ball dropped off a rooftop', 'rooftop') === 'city', 'the model writes "rooftop", which no backdrop is called: the city, not a refusal');
  ok(drawn('a ball dropped from 20 m', 'rooftop') === 'city', 'and with the place only in its own word');
  ok(drawn('a ball dropped off a rooftop', 'cliff', { u: 0, theta: -90 }) === 'city', 'with no height given it is still not a cliff');
  ok(drawn('a stone thrown off a cliff') === 'cliff', 'a cliff the student names stays a cliff');
  ok(drawn('a ball thrown from a cliff towards a tower', 'tower') === 'tower', 'two places named: the one the model chose of them stands');
  ok(drawn('a ball dropped off a rooftop', 'house') === 'house', 'a house is a fair rooftop: left alone');
  ok(drawn('a car drives along a road towards a bridge', 'road') === 'road', 'a road the student named stands, with a bridge ahead');
  ok(drawn('a box slides off the roof of a car', 'road') === 'road', "a car's roof is no house");
  ok(drawn('a ball is launched at 20 m/s', 'ground') === 'ground', "no place named: the model's choice stands");
  const photo = namedPlace({ ...ball('cliff'), summary: 'A ball dropped off a rooftop.' }, '');
  ok(photo.recipe.backdrop === 'city', 'a photo, with no words typed: its summary says where');

  const said = 'a ball dropped off a rooftop';
  ok(focusFor(said).compose.split('\n').some((l) => /^ {2}city — .*rooftop/.test(l)), 'the model is shown the city in full when the question says rooftop');
  const live = await read({ text: said }, () => ball('cliff'));
  ok(live.data.extraction.recipe.backdrop === 'city', 'through the Worker, end to end: the city');
}

/* The user, 7 Nov: "the AI should see what we need first, not straight up give us a NO". */
console.log('\nNever a flat no');
{
  const P = { engine: 'projectile', backdrop: 'city', objects: [{ figure: 'ball' }] };
  ok(!compose({ ...P, numbers: { h: 0, u: 0, theta: -90 } }).ok && composeKindly({ ...P, numbers: { h: 0, u: 0, theta: -90 } }).ok, 'off a rooftop with the height written as 0: set up, not refused');
  ok(composeKindly({ ...P, numbers: { h: 0, u: 0, theta: -90 } }).boxes.h == null, 'and the height is blank, to be asked for, never 0');
  ok(composeKindly({ ...P, numbers: { h: 0, u: 7, theta: -90 } }).boxes.u === 7, 'what it did give is kept');
  ok(composeKindly({ ...P, numbers: { h: -20 } }).boxes.h === 20, 'a height written as a depth is that height');
  const BROKEN = {
    'a value that is not a number': { ...P, numbers: { h: 'high', u: 5 } }, 'a value the engine has no use for': { ...P, numbers: { h: 20, mass: 3 } },
    'an angle out of range': { ...P, numbers: { h: 20, u: 5, theta: 200 } }, 'no engine': { backdrop: 'city', objects: [{ figure: 'ball' }], numbers: { h: 20 } },
    'an engine that does not exist': { ...P, engine: 'teleport', numbers: { h: 20 } }, 'nothing that moves': { engine: 'projectile', backdrop: 'city', numbers: { h: 20 } },
    'a place that does not exist': { ...P, backdrop: 'atlantis', numbers: { h: 20 } }, 'an effect that does not exist': { ...P, numbers: { h: 20 }, effects: ['fireworks'] },
    'three things for an engine of two': { engine: 'pair', backdrop: 'tower', objects: [{ figure: 'ball' }, { figure: 'ball' }, { figure: 'ball' }], numbers: { 'A.h': 10 } },
    'an empty recipe': {}, 'no recipe at all': null,
  };
  for (const [what, r] of Object.entries(BROKEN)) ok(composeKindly(r).ok, `${what}: still a scene`);

  const asked = [{ role: 'user', parts: [{ text: 'a ball dropped off a rooftop' }] },
    { role: 'model', parts: [{ text: JSON.stringify({ understood: true, scenario: 'compose', summary: 'A ball.', recipe: { ...P, numbers: { h: 0, u: 0 } } }) }] }];
  for (const said of ['20 m', '20', 'about 20 metres', "it's 20 m high", 'h = 20']) ok(answered(said, asked)?.recipe.numbers.h === 20, `"${said}" fills in the height, with no model`);
  for (const said of ['20 m/s', 'what about 20 m/s?', 'make it a tennis ball', '0 m']) ok(answered(said, asked) === null, `"${said}" is not a height: it goes to the model`);
  const have = [asked[0], { role: 'model', parts: [{ text: JSON.stringify({ understood: true, scenario: 'compose', recipe: { ...P, numbers: { h: 30 } } }) }] }];
  ok(answered('20 m', have) === null, 'a reading that has its height goes to the model');
  const chat = await read({ text: '20 m', history: [{ role: 'user', text: 'a ball dropped off a rooftop' }, { role: 'model', text: asked[1].parts[0].text }] }, () => { throw new Error('asked the model'); });
  ok(chat.prompts.length === 0 && chat.data.extraction.recipe.numbers.h === 20, 'through the Worker: answered without one AI call');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
