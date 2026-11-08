// arabicwords.js — an Arabic question, read for the code's reading stages.
//
// The model reads Arabic for itself. The stages that decide things from the
// question's words (worker/src/place.js, composeplace.js, js/compose/things.js,
// registry's whoIn and placeIn, sense.js) match English. Teaching every one of
// their expressions Arabic would be two languages to keep level in a hundred
// places, so instead there is one door: readArabic() turns Arabic words into the
// plain English those stages already know — "رُمي حجر من فوق جرف ارتفاعه ٢٠ م"
// comes out as "thrown stone off cliff height 20 m". It is never shown to anyone.
//
// Text with no Arabic in it goes through untouched, so English is unchanged.
// A word not in these tables stays as it is, and a stage simply does not see it.

const HAS = /[؀-ۿ]/;
export const hasArabic = (s) => HAS.test(String(s ?? ''));

const clean = (s) => s
  .replace(/[ً-ْٰـ]/g, '')       // the vowels, and the stretching line
  .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ة/g, 'ه');

// Phrases first, longest first: the words they read together.
const PHRASES = [
  ['من السكون', 'from rest'], ['بدون سرعه ابتداييه', 'from rest'], ['ناطحه سحاب', 'skyscraper'], ['ناطحه السحاب', 'skyscraper'],
  ['من فوق', 'off'], ['من علي', 'off'], ['من اعلي', 'off'], ['من حافه', 'off the edge of'], ['عن حافه', 'off the edge of'], ['من قمه', 'off the top of'], ['من سطح', 'off roof'],
  ['في قاع', 'at the bottom of'], ['الي داخل', 'into'], ['بجانب', 'beside'],
  ['ما ارتفاع', 'what is the height'], ['ما هو ارتفاع', 'what is the height'], ['كم ارتفاع', 'how high'], ['كم يبلغ ارتفاع', 'how high'], ['الي اي ارتفاع', 'how high'],
  ['ما عمق', 'how deep'], ['كم عمق', 'how deep'], ['اوجد الارتفاع', 'find the height'], ['احسب الارتفاع', 'find the height'],
  ['اوجد السرعه', 'find the speed'], ['احسب السرعه', 'find the speed'], ['ما السرعه', 'what is the speed'], ['ما سرعه', 'what is the speed'], ['كم سرعه', 'what is the speed'],
  ['اوجد الزاويه', 'find the angle'], ['احسب الزاويه', 'find the angle'], ['ما الزاويه', 'what is the angle'], ['باي زاويه', 'at what angle'],
  ['كم يستغرق', 'how long'], ['كم تستغرق', 'how long'], ['كم من الوقت', 'how long'], ['كم الزمن', 'how long'], ['ما الزمن', 'what is the time'], ['اوجد الزمن', 'find the time'], ['احسب الزمن', 'find the time'],
  ['علي اي بعد', 'how far'], ['كم يبعد', 'how far'], ['كم تبعد', 'how far'], ['اوجد المدي', 'find the range'], ['احسب المدي', 'find the range'], ['ما المدي', 'what is the range'],
  ['زمن الطيران', 'time of flight'], ['اقصي ارتفاع', 'greatest height'], ['اعلي ارتفاع', 'greatest height'],
  ['السرعه الابتداييه', 'initial speed'], ['سرعه ابتداييه', 'initial speed'], ['سرعه القذف', 'speed of projection'], ['السرعه النهاييه', 'final speed'],
  ['مسار مستقيم', 'straight'], ['كره قدم', 'football'], ['كره سله', 'basketball'], ['كره تنس', 'tennis ball'], ['حوض سباحه', 'pool'], ['لوح قفز', 'diving board'], ['منصه قفز', 'diving board'],
  ['في الثانيه', 'per second'], ['متر في الثانيه', 'm/s'], ['مترا في الثانيه', 'm/s'], ['امتار في الثانيه', 'm/s'],
  ['استخدم قيمك', 'use your own'], ['استخدم قيمك انت', 'use your own'], ['استخدم ارقامك', 'use your own'], ['اختر انت', 'you pick'], ['اختر لي', 'you pick'], ['لا اعرف', 'i do not know'], ['لا ادري', 'i do not know'], ['ما اعرف', 'i do not know'], ['لست متاكدا', 'not sure'], ['كما تشاء', 'you pick'], ['اكمل الباقي', 'fill in the rest'],
  ['لا زاويه', 'no angle'], ['بلا زاويه', 'no angle'], ['بدون زاويه', 'no angle'], ['فقط', 'just'],
].map(([a, e]) => [clean(a), e]).sort((x, y) => y[0].length - x[0].length);

// One word: the plain form, with the prefixes and endings taken off before it is looked up.
const WORDS = {
  // places
  سطح: 'roof', سطوح: 'roof', جرف: 'cliff', هاويه: 'cliff', منحدر: 'slope', تل: 'hill', جبل: 'mountain', برج: 'tower', جسر: 'bridge', كوبري: 'bridge', طاوله: 'table', منضده: 'table', رف: 'shelf', بير: 'well',
  شجره: 'tree', غصن: 'branch', نافذه: 'window', شباك: 'window', شرفه: 'balcony', مبني: 'building', بنايه: 'building', عماره: 'building', بيت: 'house', منزل: 'house', منصه: 'platform', سلم: 'ladder', جدار: 'wall', سور: 'wall',
  بحر: 'sea', محيط: 'ocean', نهر: 'river', شاطي: 'beach', رمل: 'sand', طريق: 'road', شارع: 'street', ارض: 'ground', رافعه: 'crane', منطاد: 'balloon', مروحيه: 'helicopter', هليكوبتر: 'helicopter', طايره: 'aeroplane',
  ملعب: 'stadium', كرسي: 'chair', مكتب: 'desk', قمر: 'moon', منجم: 'mine', غرفه: 'room', صخره: 'rock', قارب: 'boat', سفينه: 'ship', مناره: 'lighthouse', سد: 'dam', كهف: 'cave', مدرسه: 'school', مسجد: 'mosque', صومعه: 'silo', ماء: 'water', ارضيه: 'floor', قاع: 'bottom', حافه: 'edge', قمه: 'top',
  // what moves
  كره: 'ball', حجر: 'stone', رجل: 'man', ولد: 'boy', فتي: 'boy', صبي: 'boy', بنت: 'girl', فتاه: 'girl', شخص: 'person', انسان: 'person', طفل: 'child', امراه: 'woman', غواص: 'diver', سياره: 'car', دراجه: 'bicycle', قطار: 'train', شاحنه: 'lorry',
  صندوق: 'box', كتاب: 'book', قلم: 'pencil', كاس: 'glass', كوب: 'mug', تفاحه: 'apple', بطيخه: 'watermelon', لابتوب: 'laptop', حاسوب: 'laptop', هاتف: 'phone', جوال: 'phone', رصاصه: 'bullet', صاروخ: 'rocket', قرد: 'monkey', كلب: 'dog', قطه: 'cat', بيضه: 'egg', ابريق: 'kettle',
  جسيم: 'particle', سهم: 'arrow', مظله: 'parachute', مظلي: 'skydiver', حذاء: 'boot', بيانو: 'piano', وزن: 'weight', مفتاح: 'key', عمله: 'coin', موزه: 'banana', برتقاله: 'orange',
  // verbs: thrown, sent off, let go
  رما: 'thrown', رمي: 'thrown', رمت: 'thrown', يرمي: 'thrown', ترمي: 'thrown', رميت: 'thrown', رميه: 'thrown', يرميها: 'thrown', القي: 'thrown', يلقي: 'thrown', تلقي: 'thrown', قذف: 'projected', قذفت: 'projected', يقذف: 'projected', تقذف: 'projected', مقذوف: 'projected',
  دفع: 'pushed', دفعت: 'pushed', يدفع: 'pushed', تدفع: 'pushed', ركل: 'kicked', ركلت: 'kicked', يركل: 'kicked', تركل: 'kicked', شوط: 'kicked', اطلق: 'fired', اطلقت: 'fired', يطلق: 'fired', تطلق: 'fired', ضرب: 'hit', ضربت: 'hit',
  سقط: 'fell', سقطت: 'fell', يسقط: 'falls', تسقط: 'falls', وقع: 'fell', وقعت: 'fell', يقع: 'falls', تقع: 'falls', هوي: 'fell', اسقط: 'dropped', اسقطت: 'dropped', اوقع: 'dropped', اوقعت: 'dropped', ترك: 'released', تركت: 'released', يترك: 'released', تترك: 'released', افلت: 'released', افلتت: 'released',
  قفز: 'jumped', قفزت: 'jumped', يقفز: 'jumps', تقفز: 'jumps', تدحرج: 'rolled', تدحرجت: 'rolled', يتدحرج: 'rolled', انزلق: 'slid', انزلقت: 'slid', ينزلق: 'slides', ارتد: 'bounced', يرتد: 'bounces', اصطدم: 'hits', اصطدمت: 'hits', يصطدم: 'hits', تصطدم: 'hits', هبط: 'lands', هبطت: 'lands', يهبط: 'lands', تهبط: 'lands', وصل: 'reaches',
  // quantities and directions
  ارتفاع: 'height', علو: 'height', عمق: 'depth', سرعه: 'speed', زاويه: 'angle', سقوط: 'fall', سقوطها: 'fall', سقوطه: 'fall', هبوط: 'landing', مسافه: 'distance', مدي: 'range', زمن: 'time', وقت: 'time', تسارع: 'acceleration', عاليا: 'upwards', اعلي: 'upwards', اسفل: 'downwards', راسيا: 'vertically', عموديا: 'vertically', افقيا: 'horizontally', افقي: 'horizontal', راسي: 'vertical', درجه: 'degrees', درجات: 'degrees', الجاذبيه: 'gravity',
  // little words the stages read
  من: 'from', الي: 'to', علي: 'on', في: 'in', فوق: 'above', تحت: 'below', عند: 'at', ثم: 'then', و: 'and', اوجد: 'find', احسب: 'find', ما: 'what is', كم: 'how much',
};
// Written with a prefix that is part of the sentence: "لأعلى" is upwards, not "to top".
const WHOLE = { لاعلي: 'upwards', لاسفل: 'downwards', للاعلي: 'upwards', للاسفل: 'downwards', لفوق: 'upwards', لتحت: 'downwards', باتجاه: 'towards', نحو: 'towards', بسرعه: 'at speed', بزاويه: 'at angle', ارتفاعه: 'height', ارتفاعها: 'height', عمقه: 'depth', عمقها: 'depth', سرعته: 'speed', سرعتها: 'speed' };
const PREFIXES = ['وبال', 'فال', 'وال', 'بال', 'كال', 'لل', 'ال', 'و', 'ف', 'ب', 'ك', 'ل'];
const ENDINGS = ['ها', 'هم', 'ه'];

function oneWord(w) {
  if (WHOLE[w]) return WHOLE[w];
  if (WORDS[w]) return WORDS[w];
  for (const p of ['', ...PREFIXES]) {
    if (p && !w.startsWith(p)) continue;
    const stem = w.slice(p.length);
    if (stem.length < 2) continue;
    if (WHOLE[stem]) return WHOLE[stem];
    if (WORDS[stem]) return WORDS[stem];
    for (const e of ENDINGS) if (stem.endsWith(e) && WORDS[stem.slice(0, -e.length)]) return WORDS[stem.slice(0, -e.length)];
  }
  return null;
}

// "دفعه رجل": pushed, by a man. "رماها الولد" likewise.
const SENT_BY = /(^|\s)(دفع|ركل|رمي|رما|قذف|اطلق|اسقط|اوقع|ترك|القي)(?:ه|ها|هما)\s+(?!من\s)(?:ال)?([؀-ۿ]+)/g;

/** The question's numbers, in the digits and units the code reads. */
export function readNumbers(text) {
  return String(text ?? '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/(\d)٫(\d)/g, '$1.$2').replace(/(\d)٬(\d)/g, '$1$2').replace(/،/g, ', ').replace(/؟/g, '?').replace(/؛/g, ';');
}

/** An Arabic question in the plain English the reading stages know. Anything else, untouched. */
export function readArabic(text) {
  const raw = String(text ?? '');
  if (!HAS.test(raw)) return raw;
  let s = clean(readNumbers(raw));
  // units, where they follow a number
  s = s.replace(/(\d)\s*(?:م\/ث²|م\/ث2|م\/ث\^2)/g, '$1 m/s²')
    .replace(/(\d)\s*(?:م\/ث|م\/س(?!\S)|مترا? ?\/ ?ث(?:انيه)?)/g, '$1 m/s')
    .replace(/(\d)\s*(?:كم\/س|كم\/ساعه|كيلومترا? في الساعه)/g, '$1 km/h')
    .replace(/(\d)\s*(?:كجم|كغ|كيلوغراما?|كيلوجراما?)(?![؀-ۿ])/g, '$1 kg')
    .replace(/(\d)\s*(?:نيوتن)(?![؀-ۿ])/g, '$1 N')
    .replace(/(\d)\s*(?:كم|كيلومترا?)(?![؀-ۿ])/g, '$1 km')
    .replace(/(\d)\s*(?:سم|سنتيمترا?)(?![؀-ۿ])/g, '$1 cm')
    .replace(/(\d)\s*(?:م|متر|مترا|امتار|مترًا)(?![؀-ۿ])/g, '$1 m')
    .replace(/(\d)\s*(?:ث|ثانيه|ثوان|ثواني)(?![؀-ۿ])/g, '$1 s')
    .replace(/(\d)\s*(?:درجه|درجات)(?![؀-ۿ])/g, '$1 degrees');
  s = s.replace(SENT_BY, (_, a, v, who) => `${a}${WORDS[v] ?? 'pushed'} by a ${oneWord(who) ?? who}`);
  for (const [a, e] of PHRASES) {
    s = s.replace(new RegExp(`(^|[\\s،.,؟?!])(?:و|ف)?${a}(?=$|[\\s،.,؟?!])`, 'g'), `$1${e}`);
  }
  return s.split(/(\s+)/).map((tok) => {
    if (!HAS.test(tok)) return tok;
    const m = tok.match(/^([^؀-ۿ]*)([؀-ۿ]+)([^؀-ۿ]*)$/);
    if (!m) return tok;
    const e = oneWord(m[2]);
    return e ? m[1] + e + m[3] : tok;
  }).join('');
}
