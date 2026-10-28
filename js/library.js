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
    tags: ['collide', 'collision', 'meet', 'two particles', 'particle', 'ball', 'stone', 'vertical', 'dropped', 'released',
           'projected upwards', 'thrown up', 'later', 'same vertical line', 'mechanics', 'paper 4', 'A level', 'AS level'],
    ending: {
      close: 'See the diagram',
      realTitle: 'What the model leaves out',
      realLead: 'The question is answerable because of three simplifications it makes on purpose. None of them was computed; they are what the numbers were taken to mean.',
      why: [
        ['Two points, one line', 'both particles are points on exactly the same vertical line, so they cannot pass each other without colliding. Two real balls a few centimetres apart could, and two real balls touch a radius or two before their centres are level.'],
        ['No air', 'each falls with g and nothing else, at every speed. Air resistance would slow the faster one more, and move the meeting a little.'],
        ['The collision ends the question', 'what happens after they hit depends on their masses and on how they bounce or stick — momentum, which is another chapter. The run stops at the instant they meet.'],
      ],
      caveat: 'What the engine did compute is above: each particle’s height as a function of time, the instant the two are equal, and both velocities then. Every figure on this card came out of that.',
    } },

  { id: 'journey-3', group: 'library', kit: 'journey',
    name: 'A journey in three stages',
    sub: 'up to speed, steady, brake — the area is the distance',
    note: 'A train between two stations, a car between two sets of lights: from rest up to a top speed, steady, then braking to rest. The speed–time graph is a trapezium and its area is the distance, so the whole time and the whole distance fix whatever the paper leaves out — even the top speed, from a quadratic with one root that cannot be.',
    params: { a1: 0.5, a3: 0.25, T: 300, D: 6300 },
    place: 'A straight track from A to B',
    sources: [
      { board: 'Edexcel', paper: '6677/01 M1', session: 'Jun 2015', q: '7' },
      { board: 'Edexcel', paper: '8MA0/22', session: 'Jun 2022', q: '2' },
      { board: 'CIE', paper: '9709/43', session: 'May/Jun 2017', q: '3' },
      { board: 'Edexcel', paper: '8MA0/02', session: 'Jun 2018', q: '7' },
      { board: 'Edexcel', paper: 'WME01', session: 'Jan 2019', q: '6' },
      { board: 'Edexcel', paper: '6677/01 M1', session: 'Jan 2012', q: '6' },
      { board: 'Edexcel', paper: '6677/01 M1', session: 'Jun 2013', q: '5', part: 'the car' },
    ],
    tags: ['train', 'car', 'station', 'stations', 'traffic lights', 'journey', 'speed-time graph', 'speed time graph',
           'velocity-time graph', 'travel graph', 'trapezium', 'area under the graph', 'accelerate', 'decelerate',
           'brake', 'braking', 'constant speed', 'top speed', 'maximum speed', 'stages', 'mechanics', 'A level', 'AS level', 'M1', 'IAL'],
    ending: {
      close: 'See the diagram',
      realTitle: 'Where this stops being the real thing',
      realLead: 'The model is the paper\u2019s, and its corners are sharp on purpose. None of this was computed; it is what the numbers were taken to mean.',
      why: [
        ['The acceleration changes instantly', 'at the corners of the trapezium it jumps from one constant to the next. A real train eases in and out of each stage, so the real graph has rounded corners — the limitation mark schemes ask for by name.'],
        ['Each stage is truly constant', 'the acceleration does not fade as the train gets faster, and the brakes do not bite harder as it slows. Real ones do both.'],
        ['The train is a point', 'it is drawn at a size you can see, but A to B is measured from one point to another, not from the front of the train to the back.'],
      ],
      caveat: 'What the engine did compute is above: every stage from what was given, the one unknown from the equation left over, and the answers to the questions asked about a moment.',
    } },

  { id: 'two-on-a-road', group: 'library', kit: 'lanes',
    name: 'Two on one road',
    sub: 'one sets off later, or slows down — when is one level with the other?',
    note: 'A car and a motorbike leave the lights ten seconds apart; a car slowing down is passed by a lorry going steadily; two children race and cross the line together. Each changes speed at a steady rate and then holds it. From the same start, they are level when the areas under their speed–time graphs are equal — so the moment, or the one number the paper hides, comes out of that.',
    params: { A: { u: 20, V: 8, tau: 30 }, B: { u: 12 } },
    place: 'A straight road, two lanes',
    sources: [
      { board: 'OCR A', paper: 'H240/03', session: 'Jun 2022', q: '9' },
      { board: 'Edexcel', paper: '6677/01 M1', session: 'Jun 2013', q: '5', part: 'the motorbike' },
      { board: 'Edexcel', paper: '8MA0/22', session: 'Jun 2023', q: '1' },
      { board: 'Edexcel', paper: 'WME01', session: 'Jun 2022', q: '7' },
    ],
    tags: ['overtake', 'overtakes', 'overtaken', 'overtaking', 'pass', 'passes', 'catch up', 'chase', 'pursuit', 'meet', 'velocity-time graph', 'race', 'finish together', 'two cars', 'car', 'motorbike',
           'motorcycle', 'lorry', 'runner', 'children', 'later', 'traffic lights', 'level', 'same time', 'speed-time graph',
           'two vehicles', 'decelerate', 'deceleration', 'slows down', 'accelerate', 'mechanics', 'A level', 'AS level', 'M1', 'IAL'],
    ending: {
      close: 'See the diagram',
      realTitle: 'What the model leaves out',
      realLead: 'The papers\u2019 model, kept as it is. None of this was computed; it is what the numbers were taken to mean.',
      why: [
        ['Each is a point', 'level means the two points are level. Real cars overtake front to front, and a car is a few metres long, so the moment one is fully past is a little later than this.'],
        ['The changes of speed are instant', 'the acceleration switches on and off at the corners of each speed–time graph. Nothing real does that, and the mark schemes say so.'],
        ['Two lanes, never in each other\u2019s way', 'they are drawn side by side, and neither slows for the other.'],
      ],
      caveat: 'What the engine did compute is above: each one\u2019s position as a function of time in its stages, every moment the two are equal, and the one hidden number when the paper hides one.',
    } },

  { id: 'vectors-ij', group: 'library', kit: 'plane',
    name: 'Moving in a plane, with vectors',
    sub: 'a constant acceleration vector — when is it moving north-west?',
    note: 'A particle on a flat plane, with east and north as its two unit vectors, and a velocity and a constant acceleration both given as vectors. Every question in this family is two SUVAT equations side by side, one per direction: when is it due east of O, when is it moving south-east or parallel to a vector, where does it cross a line, how fast is it going then.',
    params: { u: { x: -1, y: 3 }, a: { x: 0.1, y: -0.2 }, at: { moving: 'NW' } },
    place: 'A plane, seen from above: east and north',
    sources: [
      { board: 'AQA', paper: 'MM1B', session: 'Jun 2012', q: '7' },
      { board: 'AQA', paper: 'MM1B', session: 'Jan 2013', q: '7' },
      { board: 'Edexcel', paper: '9MA0/32', session: 'Oct 2020', q: '2' },
      { board: 'OCR A', paper: 'H240/03', session: 'Jun 2023', q: '8' },
    ],
    tags: ['vector', 'vectors', 'i', 'j', 'ij', 'i and j', 'unit vector', 'unit vectors', 'column vector', 'position vector',
           'velocity vector', 'due east', 'due north', 'north-west', 'north west', 'northwest', 'south-east', 'south east',
           'north-east', 'north east', 'south-west', 'south west', 'NW', 'NE', 'SW', 'SE', 'due west', 'due south',
           'bearing', 'compass', 'direction', 'parallel', 'speed', 'two dimensions', '2D', 'plane', 'particle', 'constant acceleration', 'mechanics',
           'A level', 'AS level', 'M1'],
    ending: {
      close: 'See the diagram',
      realTitle: 'What the model leaves out',
      realLead: 'The papers\u2019 model, as it stands. None of this was computed; it is what the numbers were taken to mean.',
      why: [
        ['A point on a flat plane', 'the particle has no size and the plane no slope or edge; north and east are straight lines that never curve.'],
        ['The acceleration never changes', 'whatever force gives it is the same size and the same direction for as long as the question lasts.'],
        ['Nothing is watched beyond the questions', 'the path is drawn a little past the last moment asked about, and the model says nothing about what happens after.'],
      ],
      caveat: 'What the engine did compute is above: each component of the position and the velocity as a function of time, and each moment the paper asked about.',
    } },
];
