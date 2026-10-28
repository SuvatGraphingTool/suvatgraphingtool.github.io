// questions.js — the past-paper library, as data.
//
// EVERY ENTRY IS A REFERENCE AND A PARAPHRASE. Exam questions are copyrighted,
// so nothing here is the paper's wording: `says` is this site's own sentence
// about what happens, with the numbers the paper gives, written in a shape of
// its own rather than as an edited copy of the paper's sentence. `asks` names
// ONLY what this app works out and shows; `beyond`, when there is one, says
// plainly which parts of the question it does not answer. The full catalogue — every question looked at,
// built, covered or out of scope, and why — is design/library/catalogue.md.
//
// `opens` is the scenario that answers it, by id (js/scenarios.js, or one of
// the library's own). `fill` is what a student would type from the paper and
// nothing more, keyed the way js/app.js keys its boxes:
//   given   the five — s u v t, and g for the acceleration box
//   theta   the angle of projection in degrees, when the paper gives one
//   h       the launch height, when it starts above the ground
//   line    a height line to stay above (Time above a line)
//   mark    a point to time it at on the road, in metres from A, or 'mid'
// `terms` are search words: the paper's own key words and their close
// synonyms (elevation for above the horizontal), one at a time and never its
// sentences, so a student with the paper in front of them finds it.
// `answers` are the published mark scheme's own figures, and nothing else:
// test/library.test.mjs solves the entry from `fill` and checks each one.
// The engine works out everything else, as it does for anything typed.
//
// Prose rules are the site's (CLAUDE.md rule 1): units as m s⁻¹, a real
// minus sign, no slash and no hyphen beside a number. test/notation.test.mjs
// sweeps this file.

export const BOARDS = [
  { id: 'edexcel', alias: 'pearson edexcel' },
  { id: 'aqa',     alias: 'aqa' },
  { id: 'ocr',     alias: 'ocr a' },
  { id: 'mei',     alias: 'ocr mei' },
  { id: 'wjec',    alias: 'wjec eduqas' },
  { id: 'cie',     alias: 'cambridge caie cie international' },
];

/* The shelves, in the order a course meets them. A shelf with nothing on it
   is not shown. `words` are what a student might search for that the shelf's
   questions do not happen to say. */
export const TOPICS = [
  { id: 'projectiles', label: 'Projectiles',
    blurb: 'Launched at an angle or flat, from the ground or from a height. The horizontal and vertical motions are solved apart and share only the time.',
    words: ['projectile', 'projectiles', 'projected', 'projection', 'trajectory', 'two', 'dimensions'] },
  { id: 'vertical', label: 'Straight up and down',
    blurb: 'Thrown up, thrown down or dropped. One line, one acceleration, and a sign convention to choose before anything else.',
    words: ['vertical', 'vertically', 'upwards', 'downwards', 'gravity', 'free fall'] },
  { id: 'line', label: 'Along a straight line',
    blurb: 'Vehicles and particles with an acceleration of their own. Speeding up, braking, or several stages one after another.',
    words: ['straight', 'line', 'constant', 'uniform', 'acceleration', 'accelerates', 'braking', 'brakes',
            'decelerates', 'deceleration', 'retardation'] },
  { id: 'graphs', label: 'Travel graphs',
    blurb: 'Speed against time and displacement against time. The gradient is one quantity and the area is another.',
    words: ['graph', 'speed', 'velocity', 'time', 'area', 'gradient', 'trapezium'] },
  { id: 'meeting', label: 'Meeting and overtaking',
    blurb: 'Two things moving at once. Where they meet, both are at the same place at the same time.',
    words: ['meet', 'meets', 'overtake', 'overtakes', 'overtaking', 'collide', 'collision', 'catch'] },
  { id: 'vectors', label: 'Vectors in i and j',
    blurb: 'The same five equations with vectors in them: position, velocity and acceleration written in i and j.',
    words: ['vector', 'vectors', 'position', 'bearing', 'north', 'east'] },
];

export const QUESTIONS = [

  /* ── projectiles ──────────────────────────────────────────────────── */
  { id: 'mei-h640-1-2019-06-q9', topic: 'projectiles', opens: 'arc',
    source: { boardId: 'mei', board: 'OCR MEI', paper: 'H640 Paper 1', code: 'H640/01', session: 'June 2019', q: '9',
              url: 'https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/OCR-MEI/Paper-1/QP/June%202019%20QP.pdf' },
    says: 'A cannon on level ground fires a ball at 100 m s⁻¹, aimed 25° above the horizontal.',
    asks: 'How high the cannonball rises, and how far off it comes down.',
    terms: 'cannonball fired horizontal ground angle elevation greatest maximum height range distance time flight',
    fill: { given: { u: 100, g: 9.8 }, theta: 25, h: 0 },
    answers: [{ q: 'apex', value: 91.1, tol: 0.05 }, { q: 'range', value: 782, tol: 0.5 }] },

  { id: 'aqa-7408-1-2019-06-q4', topic: 'projectiles', opens: 'platform',
    source: { boardId: 'aqa', board: 'AQA', paper: '7408 Paper 1', code: '7408/1', subject: 'Physics', session: 'June 2019', q: '4.3', printed: '04.3',
              url: 'https://filestore.aqa.org.uk/sample-papers-and-mark-schemes/2019/june/AQA-74081-QP-JUN19.PDF' },
    says: 'A catapult lets a rock go horizontally at 18 m s⁻¹, from 7.5 m above the ground.',
    asks: 'How far out from the catapult the rock lands.',
    beyond: 'The parts on moments, and the one asking what changes if the release is not horizontal.',
    terms: 'catapult rock released horizontally horizontal distance range height time flight',
    fill: { given: { u: 18, g: 9.81 }, h: 7.5 },
    answers: [{ q: 'tFlight', value: 1.2, tol: 0.05 }, { q: 'range', value: 22, tol: 0.5 }] },

  { id: 'edx-9ma0-32-2020-10-q5', topic: 'projectiles', opens: 'platform-angle',
    source: { boardId: 'edexcel', board: 'Edexcel', paper: '9MA0 Paper 32', code: '9MA0/32', session: 'October 2020', q: '5',
              url: 'https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel/Paper-3/QP/October%202020%20QP%20(Mech).pdf' },
    says: 'From the top of a 25 m cliff a ball sets off at 45° above the horizontal and comes down on the ground 100 m out from the cliff’s base.',
    asks: 'Show it was thrown at 28 m s⁻¹, then find how high above the ground it gets.',
    beyond: 'Two modelling parts: what air resistance would change, and one further refinement to the model.',
    terms: 'projected cliff angle elevation lands horizontal distance show speed initial greatest maximum height air resistance',
    fill: { given: { s: 100, g: 9.8 }, theta: 45, h: 25 },
    answers: [{ q: 'u', value: 28, tol: 0.01 }, { q: 'apex', value: 45, tol: 0.01 }] },

  { id: 'ocr-h240-3-2023-06-q12', topic: 'projectiles', opens: 'platform-angle',
    source: { boardId: 'ocr', board: 'OCR', paper: 'H240 Paper 3', code: 'H240/03', session: 'June 2023', q: '12',
              url: 'https://www.ocr.org.uk/Images/703870-question-paper-pure-mathematics-and-mechanics.pdf' },
    says: 'Launched at 39 m s⁻¹ from a point 20 m above flat ground, at the angle whose sine is five thirteenths, which is 22.62°. This paper takes g as 10 m s⁻².',
    asks: 'Its greatest height, and how long until it lands.',
    beyond: 'A limitation of the model, and a final part where a second ball has a varying acceleration.',
    terms: 'projected angle elevation sin maximum greatest height time flight lands ground horizontal',
    fill: { given: { u: 39, g: 10 }, theta: 22.62, h: 20 },
    answers: [{ q: 'apex', value: 31.25, tol: 0.01 }, { q: 'tFlight', value: 4, tol: 0.01 }] },

  /* ── straight up and down ─────────────────────────────────────────── */
  { id: 'edx-m1-2015-06-q2', topic: 'vertical', opens: 'time-above',
    source: { boardId: 'edexcel', board: 'Edexcel', paper: 'M1 6677', code: '6677/01', session: 'June 2015', q: '2',
              url: 'https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-Edexcel/QP/June%202015%20QP.pdf' },
    says: 'A stone leaves a point O, travelling straight up at 19.6 m s⁻¹.',
    asks: 'The highest it reaches, and how long it is more than 14.7 m above O.',
    terms: 'projected vertically upwards greatest maximum height time above',
    fill: { given: { u: 19.6, g: 9.8 }, theta: 90, h: 0, line: 14.7 },
    answers: [{ q: 'apex', value: 19.6, tol: 0.01 }, { q: 'above', value: 2, tol: 0.01 }] },

  { id: 'edx-m1-2012-01-q5', topic: 'vertical', opens: 'time-above',
    source: { boardId: 'edexcel', board: 'Edexcel', paper: 'M1 6677', code: '6677/01', session: 'January 2012', q: '5',
              url: 'https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-Edexcel/QP/January%202012%20QP.pdf' },
    says: 'A stone goes straight up and lands back where it started, 3⁴⁄₇ s after it set off.',
    asks: 'The speed it was thrown at, how high it rose, and the time it spends at least 6.6 m above the start.',
    terms: 'projected vertically upwards returns speed initial velocity greatest maximum height time above',
    fill: { given: { t: 25 / 7, g: 9.8 }, theta: 90, h: 0, line: 6.6 },
    answers: [{ q: 'u', value: 17.5, tol: 0.01 }, { q: 'apex', value: 15.6, tol: 0.05 }, { q: 'above', value: 2.71, tol: 0.01 }] },

  { id: 'cie-9709-41-2019-06-q2', topic: 'vertical', opens: 'time-above',
    source: { boardId: 'cie', board: 'Cambridge', paper: '9709 Paper 41', code: '9709/41', session: 'June 2019', q: '2',
              url: 'https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/CIE/Paper-M1/QP/June%202019%20(v1)%20QP%20-%20M1.pdf' },
    says: 'Launched straight up at 25 m s⁻¹, a particle starts from 3 m above level ground. Cambridge takes g as 10 m s⁻².',
    asks: 'The time to the top, and the time it spends above 23 m. For the last part, type 1 into the time above the line: the line moves to the height it is above for exactly 1 s.',
    terms: 'particle projected vertically upwards time greatest maximum height above exactly',
    fill: { given: { u: 25, g: 10 }, theta: 90, h: 3, line: 23 },
    answers: [{ q: 'tApex', value: 2.5, tol: 0.01 }, { q: 'above', value: 3, tol: 0.01 }, { q: 'lineFor', at: 1, value: 33, tol: 0.01 }] },

  { id: 'edx-8ma0-2-2018-06-q6', topic: 'vertical', opens: 'up',
    source: { boardId: 'edexcel', board: 'Edexcel', paper: '8MA0 Paper 2', code: '8MA0/02', session: 'June 2018', q: '6',
              url: 'https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel/AS-Paper-2/QP/June%202018%20QP.pdf' },
    says: 'A tennis ball is let go 2 m above the ground while moving straight up at 9 m s⁻¹. This paper takes g as 10 m s⁻².',
    asks: 'How long until it reaches the ground.',
    terms: 'tennis ball thrown vertically upwards hits ground time',
    fill: { given: { u: 9, g: 10 }, h: 2 },
    answers: [{ q: 'tFlight', value: 2, tol: 0.01 }] },

  { id: 'edx-8ma0-22-2022-06-q1', topic: 'vertical', opens: 'up',
    source: { boardId: 'edexcel', board: 'Edexcel', paper: '8MA0 Paper 22', code: '8MA0/22', session: 'June 2022', q: '1',
              url: 'https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel/AS-Paper-2/QP/June%202022%20QP%20(Mech).pdf' },
    says: 'A stone thrown upwards from 1.8 m above the ground strikes the ground at 10 m s⁻¹, with g taken as 10 m s⁻².',
    asks: 'The speed it was thrown at, and its time in the air.',
    beyond: 'Two modelling parts: one refinement to the model, and how air resistance would change the launch speed.',
    terms: 'projected vertically upwards hits ground speed initial velocity time flight',
    fill: { given: { v: 10, g: 10 }, h: 1.8 },
    answers: [{ q: 'u', value: 8, tol: 0.01 }, { q: 'tFlight', value: 1.8, tol: 0.01 }] },

  { id: 'edx-8ma0-22-2023-06-q2', topic: 'vertical', opens: 'up',
    source: { boardId: 'edexcel', board: 'Edexcel', paper: '8MA0 Paper 22', code: '8MA0/22', session: 'June 2023', q: '2',
              url: 'https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel/AS-Paper-2/QP/June%202023%20QP%20(Mech).pdf' },
    says: 'A stone is launched straight up from a point O at 39.2 m s⁻¹ and lands on the ground below O 10 s later.',
    asks: 'How far above the ground O is. For the next part, on the flight screen press Resolve and type 24.5 into the speed box: it gives the two instants it has that speed.',
    beyond: 'How long the speed stays at or below 24.5 m s⁻¹, which is the gap between those two instants, and one refinement to the model.',
    terms: 'projected vertically upwards hits ground height speed time',
    fill: { given: { u: 39.2, t: 10, g: 9.8 } },
    answers: [{ q: 'h', value: 98, tol: 0.01 }, { q: 'atSpeed', speed: 24.5, n: 0, value: 1.5, tol: 0.01 }, { q: 'atSpeed', speed: 24.5, n: 1, value: 6.5, tol: 0.01 }] },

  { id: 'aqa-7357-2-2019-06-q13', topic: 'vertical', opens: 'dropped',
    source: { boardId: 'aqa', board: 'AQA', paper: '7357 Paper 2', code: '7357/2', session: 'June 2019', q: '13',
              url: 'https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/AQA/Paper-2/QP/June%202019%20QP.pdf' },
    says: 'Dropped from rest, a ball falls 18 m to a sensor, and the sensor reports a speed of 20 m s⁻¹.',
    asks: 'Whether the reading can be right: compare it with the speed the model says it arrives at.',
    beyond: 'The first part, a proof of the landing speed in general.',
    terms: 'released rest falls dropped sensor speed velocity faulty ground',
    fill: { given: { g: 9.8 }, h: 18 },
    answers: [{ q: 'vLand', value: 18.8, tol: 0.05 }] },

  /* ── along a straight line ────────────────────────────────────────── */
  { id: 'edx-m1-2013-06-q4', topic: 'line', opens: 'road',
    source: { boardId: 'edexcel', board: 'Edexcel', paper: 'M1 6677', code: '6677/01', session: 'June 2013', q: '4',
              url: 'https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-Edexcel/QP/June%202013%20QP.pdf' },
    says: 'A lorry is speeding up steadily. It goes past A, then past B 10 s later at 34 m s⁻¹, and AB is 240 m.',
    asks: 'Its speed at A, and how long it takes from A to the mid-point of AB.',
    terms: 'lorry constant acceleration passes speed initial velocity midpoint time',
    fill: { given: { s: 240, v: 34, t: 10 }, mark: 'mid' },
    answers: [{ q: 'u', value: 14, tol: 0.01 }, { q: 'tMark', value: 6, tol: 0.01 }] },

  { id: 'edx-m1-2017-06-q6', topic: 'line', opens: 'road',
    source: { boardId: 'edexcel', board: 'Edexcel', paper: 'M1 6677', code: '6677/01', session: 'June 2017', q: '6',
              url: 'https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-Edexcel/QP/June%202017%20QP.pdf' },
    says: 'Accelerating steadily, a cyclist goes past A and reaches B 5 s later at 10 m s⁻¹, with AB 40 m long.',
    asks: 'The acceleration, and how long it takes from A to the mid-point of AB.',
    terms: 'cyclist constant acceleration passes speed initial velocity midpoint time',
    fill: { given: { s: 40, v: 10, t: 5 }, mark: 'mid' },
    answers: [{ q: 'a', value: 0.8, tol: 0.01 }, { q: 'tMark', value: 2.8, tol: 0.02 }] },

  { id: 'edx-ial-m1-2022-06-q2', topic: 'line', opens: 'road',
    source: { boardId: 'edexcel', board: 'Edexcel', paper: 'IAL M1 WME01', code: 'WME01/01', session: 'June 2022', q: '2',
              url: 'https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel-IAL/Mechanics/M1/QP/June%202022%20QP.pdf' },
    says: 'A motorbike gaining speed at a steady rate covers the 220 m from P to Q in 10 s, passing Q at 28 m s⁻¹.',
    asks: 'Its acceleration.',
    beyond: 'The distance it covers in the fifth second after P.',
    terms: 'motorbike constant acceleration passes speed velocity distance travelled fifth second',
    fill: { given: { s: 220, v: 28, t: 10 } },
    answers: [{ q: 'a', value: 1.2, tol: 0.01 }] },

  { id: 'edx-9ma0-32-2023-06-q1', topic: 'line', opens: 'road',
    source: { boardId: 'edexcel', board: 'Edexcel', paper: '9MA0 Paper 32', code: '9MA0/32', session: 'June 2023', q: '1',
              url: 'https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel/Paper-3/QP/June%202023%20QP%20(Mech).pdf' },
    says: 'Starting from rest, a car picks up speed at 3.2 m s⁻² for 5 s.',
    asks: 'How fast it is going then, and how far it has gone.',
    terms: 'car rest constant acceleration speed velocity distance travelled',
    fill: { given: { u: 0, g: 3.2, t: 5 } },
    answers: [{ q: 'v', value: 16, tol: 0.01 }, { q: 's', value: 40, tol: 0.01 }] },

  { id: 'aqa-mm1b-2014-06-q1', topic: 'line', opens: 'road',
    source: { boardId: 'aqa', board: 'AQA', paper: 'MM1B', code: 'MM1B', session: 'June 2014', q: '1',
              url: 'https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-AQA/June%202014%20QP%20-%20M1%20AQA.PDF' },
    says: 'Already doing 14 m s⁻¹ on a straight, level road, a car accelerates at 0.8 m s⁻² for 12 s.',
    asks: 'Its speed at the end, and the distance covered.',
    beyond: 'The resistance force: forces are outside SUVAT.',
    terms: 'car accelerates constant acceleration speed final velocity distance travelled resistance force',
    fill: { given: { u: 14, g: 0.8, t: 12 } },
    answers: [{ q: 'v', value: 23.6, tol: 0.01 }, { q: 's', value: 225.6, tol: 0.01 }] },

  { id: 'aqa-mm1b-2012-06-q3', topic: 'line', opens: 'road',
    source: { boardId: 'aqa', board: 'AQA', paper: 'MM1B', code: 'MM1B', session: 'June 2012', q: '3',
              url: 'https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-AQA/June%202012%20QP%20-%20M1%20AQA.pdf' },
    says: 'Braking steadily, a car slows from 20 m s⁻¹ to 10 m s⁻¹ over 75 m.',
    asks: 'The deceleration.',
    beyond: 'The time it takes to stop altogether, and the braking forces.',
    terms: 'car brakes braking deceleration retardation comes rest stop time distance force',
    fill: { given: { u: 20, v: 10, s: 75 } },
    answers: [{ q: 'a', value: -2, tol: 0.01 }] },
];
