// things.js — a word for something the app has no figure of, as an object.
//
// The user, 7 Nov: "the objects thrown are endless, could even be glass." The
// composer's ladder for what moves, best first:
//
//   1. a hand-built figure (js/compose/registry.js FIGURES): always wins
//   2. a curated icon (js/compose/icons.json, fetched only when needed)
//   3. a drawing made on request and shared by every student (worker/src/draw.js)
//   4. a clean rounded shape with the object's name on it
//
// An object is never refused and never silently replaced by a dot. This file is
// the part of that with no canvas and no network: which words name an object at
// all, how to find one in a question, what must not be drawn, what it is made
// of and what landing does to it. The Worker imports it too. Nothing here
// calculates (CLAUDE.md rule 4): an object rests or breaks on the stage, and the
// engine's numbers do not change.

/** Past this real size no one is drawn throwing it: it falls by itself. */
export const BIG_M = 1.1;
export const MAX_NAME = 30;

/* ── a name ──────────────────────────────────────────────────────────────── */
/** Lower-case letters, single spaces and hyphens, at most 30 characters: all
    that ever reaches a model, a database or a picture's label. */
export function normaliseName(x) {
  return String(x ?? '').toLowerCase().replace(/[^a-z\- ]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME).trim();
}
const ADJECTIVES = /^(?:large|small|big|little|tiny|huge|giant|massive|heavy|light|old|new|empty|full|broken|fragile|delicate|uniform|smooth|round|red|blue|green|yellow|black|white|pink|orange|purple|brown|grey|gray|single|whole|certain|same|second|first|falling|wet|dry|hot|cold|ripe|fresh|expensive|cheap|pet|toy|model|plastic|wooden|metal|steel|iron|ceramic|china)$/;
const STAY_PLURAL = /^(?:scissors|glasses|sunglasses|goggles|trousers|jeans|tongs|pliers|binoculars|headphones|skis|dice|chopsticks|maracas|shears|scales|peanuts|cherries|grapes|flowers|socks|books|nuts|chips|fries|sweets|tweezers)$/;
function singular(w) {
  if (STAY_PLURAL.test(w) || /(?:ss|us|is)$/.test(w) || w.length < 4) return w;
  if (/ies$/.test(w)) return `${w.slice(0, -3)}y`;
  if (/(?:ch|sh|x|ss|zz)es$/.test(w) || /(?:tomato|potato|mango)es$/.test(w)) return w.slice(0, -2);
  return w.endsWith('s') ? w.slice(0, -1) : w;
}
/** "a large glass vase" → "glass vase"; "two watermelons" → "watermelon". What
    moves, as a label and a cache key. */
export function thingName(x) {
  let w = normaliseName(x).replace(/^(?:an?|the|some|one|two|three|his|her|their|my|our|your|this|that|these|those|pair of|bunch of)\s+/, '');
  // what came along after the noun: "ball thrown off", "glass from a roof"
  w = w.replace(/\s+(?:is|was|are|were|being|thrown|dropped|kicked|launched|fired|that|which|who|from|off|at|on|in|into|onto|by|with|for)\b.*$/, '');
  const words = w.split(' ').filter(Boolean);
  // an "of" phrase keeps what it says: a glass of water, a bar of soap
  const of = words.indexOf('of');
  const head = of > 0 ? words.slice(0, of) : words;
  while (head.length > 1 && ADJECTIVES.test(head[0])) head.shift();
  const tail = of > 0 ? words.slice(of) : [];
  if (!tail.length && head.length) head[head.length - 1] = singular(head[head.length - 1]);
  return normaliseName([...head, ...tail].join(' '));
}
/** The noun a phrase is about: "car battery" is a battery, "cup of tea" a cup. */
export function headOf(name) {
  const w = String(name).split(' of ')[0].trim().split(' ');
  return w[w.length - 1] || '';
}
export const article = (name) => (/^[aeiou]/.test(name) && !/^(?:one|uni|use|eu)/.test(name) ? 'an' : 'a');

/* ── what is not an object ───────────────────────────────────────────────── */
/** Exam words for "it": drawn as today, a particle, with the note saying so. */
const GENERIC = /^(?:body|projectile|particle|point|point mass|mass|object|thing|item|load|sphere|cube|block|weight|lump|piece|bead|it|something|anything|one|shape|animal|prey|creature|vehicle|boat)$/;
export const isGeneric = (name) => GENERIC.test(headOf(name)) && !/\bof\b/.test(name);
const PEOPLE = /^(?:man|men|woman|women|boy|girl|child|children|kid|baby|toddler|teenager|teen|adult|person|people|human|student|pupil|teacher|friend|mother|father|mum|mom|dad|sister|brother|son|daughter|parent|grandma|grandpa|gran|athlete|player|bowler|batter|batsman|batswoman|kicker|thrower|golfer|archer|hunter|fielder|goalkeeper|keeper|footballer|pitcher|referee|coach|pilot|driver|rider|passenger|soldier|sailor|farmer|worker|builder|fireman|firefighter|policeman|doctor|nurse|climber|hiker|skier|parachutist|skydiver|jumper|gymnast|diver|swimmer|someone|somebody|anyone|anybody|nobody|everyone|he|she|they|we|you|i|him|her|me|us|them|ali|bob|sam|tom)$/;
export const isPerson = (name) => PEOPLE.test(headOf(name));
/** Words a noun pattern can catch that are not something thrown. */
const NOT_A_THING = /^(?:speed|velocity|time|height|distance|displacement|acceleration|deceleration|temperature|price|cost|value|angle|level|rate|number|force|gravity|question|answer|part|total|sum|result|graph|line|slope|rain|snow|hail|night|day|wind|water|dust|light|sound|tide|sun|moon|sky|air|ground|floor|earth|cliff|building|tower|bridge|rooftop|roof|hill|mountain|river|sea|ocean|lake|road|street|wall|edge|top|side|bottom|height|value|what|which|this|that|these|those|there|here|each|both|all|none|other|another|from|off|out|over|into|onto|with|then|when|while|once|after|before|up|down|upwards|downwards|vertically|horizontally|straight|across|away|back|forward|forwards|hit|hits|drop|throw|fall|falls|jump|kick|launch|fire|ball-point|same|first|second|third|next|last|motion|path|flight|ride|run|race|test|experiment|example|scenario|model|system|point|end|start|beginning|gear|ranking|grade|mark|marks|score|profit|share|shares|pressure|volume)$/;
/** Words a real noun phrase never opens with: the pattern ran on into the sentence. */
const LEADS = /^(?:time|speed|distance|height|velocity|acceleration|what|which|this|that|these|those|there|here|each|both|all|none|other|another|from|off|out|over|into|onto|with|then|when|while|once|after|before|up|down|upwards|downwards|vertically|horizontally|straight|across|away|back|forward|forwards|to|in|on|at|by|for|and|is|was|are|it|its|if|so|but|or|not|no|how|why|find|work|calculate)$/;
/** What a verb looks like once a noun pattern has caught it. */
const MOVES = /^(?:dropped|thrown|kicked|launched|fired|flung|hurled|tossed|lobbed|released|projected|catapulted|knocked|pushed|rolled|shot|pitched|fell|taken|leap|jump|ride|drive|run|move|travel|go|goe|walk|swim|dive|spring|set|start|come|reach|pass|skid|slide|hover|climb|hang|stand|lean|bounce|hop|land|take|sit|lie|rise|sink|float|glide|soar|steer|race|sprint|cycle|sail|row|flying|hovering)$/;
const THINGS_IN_ING = /^(?:ring|string|king|wing|spring|swing|ceiling|painting|sling|building|earring|bowling|wedding|sewing|washing|fishing|ironing|frying|baking|rolling|sailing|rowing|climbing|skipping|walking|running|boxing|diving|writing|drawing|sling|o-ring)$/;
const isAdverb = (w) => /ly$/.test(w) && !/^(?:jelly|belly|lolly|trolley|teddy|lily|fly|butterfly|dragonfly|bully|ally|gully|holly)$/.test(w);

/* ── finding it in a question ────────────────────────────────────────────
   "A glass is dropped off a rooftop", "a piano falls from a crane", "someone
   throws a watermelon off a bridge", "laptop thrown off a table". What moves,
   in the student's own word, when the reader leaves it out or calls it a ball. */
const DET = '(?:a|an|the|some|my|his|her|their|our|your|this|that|one|two|three)';
const MEASURE = '(?:\\d+(?:\\.\\d+)?\\s*(?:kg|g|kilograms?|grams?|tonnes?|tons?|cm|mm|m|metres?|meters?)(?:\\s+(?:long|tall|high|wide|heavy))?\\s+)?';
const NOUN = "((?:[a-z][a-z'-]*\\s+){0,3}?[a-z][a-z'-]*)";
const PAST = 'dropped|thrown|kicked|launched|fired|flung|hurled|tossed|lobbed|released|projected|catapulted|knocked|pushed|rolled|shot|pitched|let go|nudged|booted|chucked|yeeted';
const FALLS = 'falls?|fell|falling|tumbles?|tumbled|tumbling|plunges?|plunged|plummets?|plummeted|slips?|slipped|rolls? off|rolled off|slides? off|slid off|flies|flew|drops(?!\\s+(?:a|an|the|his|her|their|my|some)\\b)';
const THROWS = 'throws?|threw|throwing|drops?|dropping|dropped|kicks?|kicked|kicking|launch(?:es|ed|ing)?|toss(?:es|ed|ing)?|flings?|flung|hurls?|hurled|lobs?|lobbed|fires?|fired|catapults?|catapulted|knocks?(?: off)?|knocked(?: off)?|push(?:es|ed)?(?: off)?|lets? go of|releases?|released|chucks?|chucked|yeets?|yeeted';
const AFTER = "(?=\\s+(?:off|from|out|over|into|onto|at|with|up|down|across|horizontally|vertically|straight|towards?|to|through|in|on|by|and|so|which|that|for|upwards?|downwards?|then|when|while)\\b|\\s*[,.;:?!]|\\s*$)";
const AUX = '(?:(?:is|was|are|were|gets?|got|has been|had been|being|can be|could be)\\s+)?(?:(?:then|now|just|first|accidentally|gently|carefully|\\w+ly)\\s+)?';
const PATTERNS = [
  new RegExp(`\\b${DET}\\s+${MEASURE}${NOUN}\\s+${AUX}(?:${PAST})\\b`, 'g'),
  new RegExp(`\\b${DET}\\s+${MEASURE}${NOUN}\\s+(?:${FALLS})\\b`, 'g'),
  new RegExp(`\\b(?:${THROWS})\\s+(?:${DET}\\s+)?${MEASURE}${NOUN}${AFTER}`, 'g'),
  // said bare, at the start: "laptop thrown off a table", "piano from a crane"
  new RegExp(`^\\s*(?:${DET}\\s+)?${MEASURE}${NOUN}\\s+(?:(?:${AUX})(?:${PAST})|${FALLS}|off|from|out of)\\b`, 'g'),
];
/** Whether a word the patterns caught can be something moving at all. */
function plausible(name) {
  if (!name || name.length < 2) return false;
  if (NOT_A_THING.test(headOf(name)) || LEADS.test(name.split(' ')[0])) return false;
  const head = headOf(name), words = name.split(' ');
  // the pattern ran on across a clause: "dog knocks a vase"
  if (words.slice(1).some((w) => /^(?:a|an|the|is|was|are|were|his|her|their)$/.test(w))) return false;
  if (isAdverb(head) || MOVES.test(head) || (/ing$/.test(head) && !THINGS_IN_ING.test(head))) return false;
  // the pattern ran past the noun: "person jumping", "dolphin leaps out"
  if (words.some((w) => isPerson(w) || MOVES.test(w) || /ing$/.test(w) && !THINGS_IN_ING.test(w) && w !== words[0])) return false;
  return !isPerson(name);
}
/**
 * What a sentence throws, drops, kicks or launches, by the shape of the sentence
 * alone — whether or not the app has heard of it.
 * @returns the name, or null: never a person, a place or a quantity
 */
export function thingIn(text) {
  const t = String(text ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const found = [];
  for (const re of PATTERNS) {
    re.lastIndex = 0;
    for (const m of t.matchAll(re)) found.push({ at: m.index, raw: m[1] });
  }
  found.sort((a, b) => a.at - b.at);
  for (const f of found) {
    const name = thingName(f.raw);
    if (plausible(name)) return name;
  }
  return null;
}

/* ── what must not be drawn ──────────────────────────────────────────────
   This is a school tool, and a drawing is shared with every student. A name on
   this list never reaches a model; it is cached as refused, and falls to the
   last rung. The last rung prints the name, so the worst words go further: they
   are never printed either, and the object is simply called "object". */
const NOT_DRAWN = /\b(?:gun|guns|rifle|pistol|revolver|shotgun|musket|firearm|ak|uzi|sniper|knife|knives|dagger|sword|machete|blade|axe|spear|grenade|bomb|bombs|dynamite|tnt|explosive|explosives|landmine|torpedo|missile|missiles|warhead|nuke|nuclear|shell|shells|ammo|ammunition|cartridge|taser|cocaine|heroin|meth|crack|cannabis|marijuana|weed|joint|bong|vape|cigarette|cigar|syringe|needle|ecstasy|lsd|opium|alcohol|vodka|whisky|whiskey|beer|corpse|skull|skeleton|coffin|blood|gore|poo|poop|turd|swastika|noose|nazi|hitler|isis|kkk)\b/;
const BODY = /^(?:hand|hands|head|heads|arm|arms|leg|legs|foot|feet|toe|toes|finger|fingers|thumb|eye|eyes|ear|ears|nose|mouth|tooth|teeth|tongue|lip|lips|hair|neck|chest|stomach|belly|back|bum|butt|bottom|heart|brain|lung|lungs|liver|kidney|organ|skin|body|torso|limb|limbs)$/;
const WORST = /\b(?:fuck\w*|shit|shits|shitty|cunt\w*|bitch\w*|bastard\w*|wank\w*|twat\w*|dick|dicks|cock|cocks|prick|pricks|arse|arses|arsehole\w*|asshole\w*|piss|pissed|pissing|slut\w*|whore\w*|penis\w*|vagina\w*|boob\w*|breast|breasts|tit|tits|testicle\w*|nipple\w*|dildo\w*|condom\w*|porn\w*|sex|sexy|sexual\w*|nude|nudes|naked|erotic\w*|orgasm\w*|nigg\w*|fag|fags|faggot\w*|retard\w*|spastic\w*|paki|tranny|coon|coons|chink|kike|rape|rapes|rapist\w*|paedo\w*|pedo\w*|suicide\w*)\b/;
const WORST_COMPACT = /fuck|shit|cunt|bitch|wank|nigg|faggot|penis|vagina|dildo|porn|rapist/;
/** Too rude to print on a stage a teacher projects. */
// (spelled out letter by letter only: "push it" is not a rude word run together)
export const isUnprintable = (name) => { const w = normaliseName(name); return WORST.test(w) || (/^(?:[a-z][ -])+[a-z]$/.test(w) && WORST_COMPACT.test(w.replace(/[^a-z]/g, ''))); };
/** Never to be drawn: people, body parts, weapons, drugs, and whatever is unprintable. */
export const isBlocked = (name) => {
  const w = normaliseName(name);
  return !w || isUnprintable(w) || isPerson(w) || NOT_DRAWN.test(w) || BODY.test(headOf(w));
};
/** How a name is shown: its own, unless it is unprintable. */
export const shownName = (name) => (isUnprintable(name) ? 'object' : name);

/* ── what it is made of, and what landing does ──────────────────────────── */
export const MATERIALS = ['glass', 'china', 'soft', 'rubber', 'metal', 'stone', 'wood', 'paper', 'cloth', 'plastic', 'animal'];
/** A catalogue row's own material wins; this table answers before the catalogue has come. */
const MADE_OF = [
  ['soft', /\b(?:egg|tomato|peach|plum|mango|orange|tangerine|satsuma|lemon|lime|strawberry|cherry|berry|grape|kiwi|pear|banana|avocado|pineapple|melon|watermelon|pumpkin|cake|cupcake|muffin|pie|tart|custard|jelly|trifle|ice cream|pudding|burger|hamburger|pizza|sandwich|doughnut|donut)\b/],
  ['glass', /\b(?:glass|glasses|tumbler|goblet|mirror|window|windscreen|pane|vase|bulb|lightbulb|jar|flask|beaker|test tube|lens|chandelier|aquarium|fish tank|fishbowl|television|tv|telly)\b/],
  ['china', /\b(?:china|ceramic|porcelain|pottery|crockery|mug|cup|teacup|plate|saucer|dish|bowl|teapot|urn|amphora|flowerpot|plant pot|tile|toilet|sink|ornament|gnome)\b/],
  ['animal', /\b(?:chicken|hen|duck|goose|turkey|pig|cow|bull|sheep|lamb|horse|donkey|elephant|giraffe|hippo|rhino|lion|tiger|bear|panda|koala|mouse|rat|hamster|hedgehog|badger|fox|wolf|seal|otter|whale|shark|octopus|squid|crab|lobster|turtle|tortoise|snail|lizard|snake|crocodile|bee|wasp|butterfly|moth|beetle|ant|spider|dinosaur|dragon|unicorn|bat|insect)\b/],
  ['rubber', /\b(?:rubber|tyre|tire|wheel|trainer|sneaker|shoe|boot|welly|teddy|soft toy|bowling ball|hockey puck|puck|pool ball|snooker ball|boxing glove|skate)\b/],
  ['metal', /\b(?:metal|steel|iron|tin|aluminium|copper|brass|bronze|anvil|kettle|saucepan|frying pan|pan|pot|wok|spoon|fork|ladle|spanner|wrench|screwdriver|saw|pickaxe|bolt|nail|screw|cog|gear|ladder|toolbox|magnet|extinguisher|hook|barrel|oil drum|anchor|bell|clock|watch|padlock|lock|trophy|medal|crown|ring|battery|fridge|freezer|washing machine|microwave|oven|cooker|dumbbell|barbell|kettlebell|trumpet|saxophone|tuba|horn|paperclip|scissors|shopping trolley|trolley|satellite|telescope|microscope)\b/],
  ['stone', /\b(?:stone|rock|boulder|concrete|marble|granite|slab|paving|statue|snowman|cinder block|breeze block|safe|meteor|meteorite|asteroid|diamond|gem|globe|piano stool)\b/],
  ['wood', /\b(?:wood|wooden|log|plank|beam|chair|stool|bench|table|desk|wardrobe|cupboard|cabinet|bookcase|bookshelf|shelf|door|bed|sofa|couch|piano|guitar|violin|cello|banjo|drum|flute|recorder|broom|paintbrush|baseball bat|cricket bat|hockey stick|stick|branch|tree|sledge|sled|canoe|kayak|crate|basket)\b/],
  ['paper', /\b(?:paper|page|sheet|newspaper|magazine|envelope|letter|postcard|leaflet|flyer|homework|worksheet|notebook|folder|card|cardboard|feather|leaf|flower|rose|tulip|kite|umbrella|parasol)\b/],
  ['cloth', /\b(?:cloth|shirt|t-shirt|jumper|sweater|coat|jacket|scarf|sock|sack|hat|cap|glove|towel|blanket|pillow|cushion|duvet|bag|backpack|rucksack|handbag|suitcase|tent|parachute|flag|wool|yarn)\b/],
];
/** What a word says it is made of, or null: for a name the catalogue has not answered. */
export function materialOf(name) {
  const w = normaliseName(name);
  for (const [material, re] of MADE_OF) if (re.test(w)) return material;
  return null;
}
export const isMaterial = (m) => MATERIALS.includes(m);

/** What each material does on landing on something dry and hard. */
export const LANDS = { glass: 'shatter', china: 'shatter', soft: 'splat', rubber: 'squish', metal: 'clang', stone: 'thud', wood: 'splinters', paper: 'flutter', cloth: 'flutter', plastic: 'thud', animal: 'thud' };
/** The effects only a material brings. Water always wins over all of them. */
export const MATERIAL_EFFECTS = new Set(['shatter', 'squish', 'clang', 'thud', 'splinters', 'flutter']);
/** What a landing on the place's own surface says when the object has no say. */
const PLAIN_LANDING = new Set(['dust', 'ring', 'crack', 'shockwave', 'splat', ...MATERIAL_EFFECTS]);
/** Soft ground takes the fall: a glass lands whole in snow. A burst is still a burst. */
const SOFT_GROUND = new Set(['snow', 'sand', 'mud', 'leaves', 'crater', 'divot']);
/** Whether an effect is a landing, the kind an object's material replaces. */
export const isLandingEffect = (e) => PLAIN_LANDING.has(e) || SOFT_GROUND.has(e) || e === 'splash';
/** What floats where it lands in water; the rest sinks, bubbles coming up. */
const FLOATERS = new Set(['wood', 'rubber', 'paper', 'plastic']);
export const floats = (material) => FLOATERS.has(material);

/**
 * The effect a landing makes, for what it is made of.
 * @param material   its material, or null
 * @param placeOwn   the effect the place or surface would make by itself
 * @returns the effect's name
 */
export function landingFor(material, placeOwn) {
  const own = LANDS[material];
  // (unknown stuff lands with a plain thud: the floor's ring is for what bounces, and this does not)
  if (!own) return placeOwn === 'ring' ? 'thud' : placeOwn;
  if (placeOwn === 'splash') return 'splash';
  if (SOFT_GROUND.has(placeOwn)) return own === 'splat' ? 'splat' : placeOwn;
  return own;
}
/**
 * A recipe's effects, once what its object is made of is known. Only the
 * landing it chose by itself is changed; effects the recipe asked for stand.
 * Nothing here is a number: an object rests or breaks on the stage (rule 4).
 */
export function settleEffects(R, material) {
  if (!R?.autoLanding || !material) return R;
  const fx = R.effects || [];
  const wet = fx.includes('splash');
  if (wet) {
    const sinks = !floats(material);
    R.effects = fx.filter((e) => e !== 'bubbles').concat(sinks ? ['bubbles'] : []);
    return R;
  }
  const at = fx.findIndex((e) => PLAIN_LANDING.has(e) || SOFT_GROUND.has(e));
  if (at >= 0) { R.effects = [...fx]; R.effects[at] = landingFor(material, R.autoLanding); }
  return R;
}

/* ── how big, when no catalogue row has said ─────────────────────────────── */
const BIG_WORDS = /\b(?:piano|fridge|freezer|wardrobe|cupboard|bookcase|sofa|couch|bed|door|washing machine|tumble dryer|dishwasher|cooker|oven|elephant|giraffe|hippo|rhino|whale|shark|cow|bull|horse|bear|statue|boulder|safe|anchor|container|skip|tree|tent|tank|plane|aeroplane|airplane|helicopter|spaceship|ufo|satellite|caravan|boat|yacht|ship|dinosaur|dragon|meteor|meteorite|asteroid|ambulance|fire engine|canoe|kayak|snowman|telephone box|phone box|vending machine|ladder)\b/;
export const isBigWord = (name) => BIG_WORDS.test(normaliseName(name));
/** A real size in metres, for a word no catalogue row has answered. */
export const sizeOfWord = (name) => (isBigWord(name) ? 1.6 : 0.3);

/* ── who sends it off ────────────────────────────────────────────────────
   The user, 7 Nov: "a human pushed off a cliff by another human" showed no second
   human. EVERYTHING NAMED IN THE QUESTION APPEARS IN THE SCENE: what moves, the
   place, and whoever or whatever sends it off. Read from the student's own words:
   "pushed by a man", "a girl throws", "a dog knocks a vase". Drawing only. */
const VERBS = [['push', /^(?:push|shov|nudg|bump)/], ['kick', /^(?:kick|boot)/], ['knock', /^knock/], ['drop', /^(?:drop|releas|let)/], ['throw', /./]];
const verbOf = (v) => VERBS.find(([, re]) => re.test(v))[0];
const OWNER = '(?:a|an|the|another|his|her|their|my|our|your|that|this|some|one)';
const BY = new RegExp(`\\b(pushed|shoved|nudged|bumped|thrown|tossed|flung|hurled|lobbed|chucked|kicked|booted|dropped|released|let go|knocked|fired|shot|launched|catapulted)\\b([^.;,]*?)\\bby\\s+(?:${OWNER}\\s+)?((?:[a-z'-]+\\s+){0,2}?[a-z'-]+)(?=\\s+(?:and|at|from|off|on|in|with|who|which|so|then|into|onto)\\b|\\s*[,.;:?!]|\\s*$)`, 'gi');
const NOT_THE_SENDER = /\b(?:caught|hit|hits|passed|followed|reached|struck|overtaken|seen|watched|met)\b/i;
const ACTIVE = new RegExp(`(?:^|[.;!?]\\s+|,\\s*|\\band\\s+)(?:${OWNER}\\s+)?((?:[a-zA-Z'-]+\\s+){0,2}?[a-zA-Z'-]+)(?:\\s+(?:on|at|in|from|near|standing on|standing at|stood on|standing by)\\s+[^.,;]{0,40}?)?\\s+(?:(?:then|now|\\w+ly)\\s+)?(throws?|threw|tosses|tossed|flings?|flung|hurls?|hurled|lobs?|lobbed|chucks?|chucked|pushes|pushed|shoves?|shoved|nudges?|nudged|kicks?|kicked|drops?|dropped|releases?|released|lets? go of|knocks?|knocked|fires?|fired|launches|launched)\\b(?!\\s+(?:from|off|down|into|onto|out|over|to|away|himself|herself|itself|themselves|by|at\\b))\\s*(?=\\S|$)`, 'g');
const SELF_WORDS = /^(?:it|he|she|they|this|that|which|who|what)$/;
/**
 * Who a sentence says sends it off, in their own word, or null. What kind of
 * thing they are is for js/compose/registry.js to say.
 * @returns {{ word: string, verb: 'push'|'throw'|'kick'|'drop'|'knock' }|null}
 */
export function senderWords(text) {
  const t = String(text ?? '').replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const low = t.toLowerCase();
  BY.lastIndex = 0;
  for (const m of low.matchAll(BY)) {
    if (NOT_THE_SENDER.test(m[2])) continue;
    return { word: m[3], verb: verbOf(m[1].toLowerCase()) };
  }
  ACTIVE.lastIndex = 0;
  for (const m of t.matchAll(ACTIVE)) {
    const who = m[1];
    if (who && !/^(?:a|an|the)$/i.test(who)) return { word: who, verb: verbOf(m[2].toLowerCase()) };
  }
  return null;
}
export const isSelfWord = (w) => SELF_WORDS.test(String(w).toLowerCase());

/** "a human pushed off…", "a man is thrown…": a person is what moves. */
const PERSON_MOVED = new RegExp(`\\b${DET.replace('one|two|three', 'another')}\\s+((?:[a-z'-]+\\s+){0,1}[a-z'-]+)\\s+${AUX}(?:pushed|shoved|nudged|${PAST}|falls?|fell)\\b`, 'g');
export function personMoved(text) {
  for (const m of String(text ?? '').toLowerCase().matchAll(PERSON_MOVED)) if (isPerson(m[1])) return m[1];
  return null;
}
