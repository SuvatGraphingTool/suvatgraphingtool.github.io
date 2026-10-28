// library.js — the Past-paper library: scenarios built for exam questions
// the original twelve could not set up.
//
// Every entry here is a NEW situation with its own engine, its own stage and
// its own working — never a pointer to one of the twelve. Each names the
// papers it was built from (board, paper, session, question), and the search
// box on the home screen searches these entries. The questions themselves
// are not stored anywhere: they are copyrighted, so the catalogue keeps a
// reference and our own paraphrase (design/library/catalogue.md).
//
// A library scenario has a `kit` — the pieces js/app.js plugs in for it, see
// js/kits/ and design/components.md. `params` is for the card's sketch only;
// nothing on the values screen is pre-filled.

export const LIBRARY = [
  { id: 'pair-vertical', group: 'library', kit: 'pair',
    name: 'Two in one vertical line',
    sub: 'two clocks, one line — when, and where, do they meet?',
    note: 'Two particles share a vertical line but not a clock: one is thrown up, and a second is dropped from above it, or thrown after it, some time later. Each is SUVAT on its own; they collide at the one instant both give the same height — if that happens before either lands.',
    params: { A: { h: 0, u: 20, t0: 0 }, B: { h: 40, u: 0, t0: 1 }, g: 10 },
    place: 'One vertical line, two clocks',
    sources: [
      { board: 'CIE', paper: '9709/42', session: 'Oct/Nov 2019', q: '5' },
      { board: 'CIE', paper: '9709/43', session: 'May/Jun 2017', q: '5' },
      { board: 'CIE', paper: '9709/42', session: 'May/Jun 2021', q: '6', part: 'the collision' },
    ],
    tags: ['collide', 'collision', 'meet', 'two particles', 'vertical', 'dropped', 'projected upwards', 'later', 'same vertical line'],
    ending: {
      close: 'See the diagram',
      realTitle: 'What the model leaves out',
      realLead: 'The question is answerable because of three simplifications it makes on purpose. None of them was computed; they are what the numbers were taken to mean.',
      why: [
        ['Two points, one line', 'both particles are points on exactly the same vertical line, so they cannot pass each other without colliding. Two real balls a few centimetres apart could, and two real balls touch a radius or two before their centres are level.'],
        ['No air', 'each falls with g and nothing else, at every speed. Air resistance would slow the faster one more, and move the meeting a little.'],
        ['The collision ends the question', 'what happens after they hit depends on their masses and on how they bounce or stick — momentum, which is another chapter. The run stops at the instant they meet.'],
      ],
      caveat: 'What the engine did compute is on the left: each particle’s height as a function of time, the instant the two are equal, and both velocities then. Every figure on this card came out of that.',
    } },
];
