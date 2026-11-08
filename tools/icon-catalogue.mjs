// icon-catalogue.mjs — the objects the composer has a good picture of.
//
// "The objects thrown are endless, could even be glass." Past the hand-built
// figures (js/compose/registry.js), a word first looks here: a HAND-PICKED list
// of Fluent Emoji Flat icons (MIT, Microsoft; notice in
// js/compose/ICONS-LICENSE.txt) plus a few drawn for this app in the same style
// where the emoji set has nothing good (a piano, a fridge, a plain glass). Every
// row was looked at on the contact sheet, at game size, on a dark and a light
// backdrop. Fewer good icons beat many poor ones: leave a row out rather than
// keep a picture that does not read at 40 px.
//
// No faces, people, hands, flags, signs, symbols; no skin tones; no weapons.
//
// Run, with the unpacked @iconify-json/fluent-emoji-flat package:
//   node tools/icon-catalogue.mjs <path to icons.json>
// It writes js/compose/icons.json, which the page fetches only when a question
// names something it has no figure for (js/compose/pictures.js), and which no
// modulepreload hint names.

import fs from 'node:fs';
import path from 'node:path';
import { sanitizeSvg } from '../js/compose/svgsafe.js';

const ROOT = path.resolve(import.meta.dirname, '..');

/* ── the rows ────────────────────────────────────────────────────────────
   slug, the words it answers to, its real size in metres (its longest side),
   what it is made of, and flags: `long` turns with its path and lies flat at
   rest; `pulp` is the colour it bursts in. A size past a person's reach
   (js/compose/things.js BIG_M) falls by itself: no one is drawn throwing it. */
const G = (material, rows) => rows.map(([slug, words, m, flags = {}]) => ({ slug, words, m, material, ...flags }));
const SOFT = (pulp) => ({ pulp });
const LONG = { long: true };

export const ROWS = [
  // glassware and crockery: what shatters
  ...G('glass', [
    ['plain-glass', 'glass, drinking glass, pint glass, tumbler, water glass, glass of water, beaker, cup of glass', 0.14],
    ['wine-glass', 'wine glass, goblet, champagne glass, flute glass', 0.2],
    ['cocktail-glass', 'cocktail glass, martini glass', 0.17],
    ['glass-of-milk', 'glass of milk, milk, glass of juice, glass of lemonade', 0.15],
    ['light-bulb', 'light bulb, bulb, lightbulb', 0.11],
    ['mirror', 'mirror, looking glass', 0.6],
    ['window', 'window, pane of glass, glass pane, sheet of glass, window pane, glass sheet, windowpane', 1],
    ['crystal-ball', 'crystal ball, glass ball, snow globe', 0.15],
    ['test-tube', 'test tube', 0.15, LONG],
    ['alembic', 'flask, conical flask, chemical flask, glass flask, erlenmeyer flask', 0.2],
    ['jar', 'jar, glass jar, jam jar, pickle jar, mason jar', 0.16],
    ['magnifying-glass-tilted-left', 'magnifying glass, magnifier', 0.2],
    ['television', 'television, tv, telly, tv set', 0.8],
    ['glass-vase', 'vase, flower vase, glass vase', 0.3],
  ]),
  ...G('china', [
    ['mug', 'mug, coffee mug, tea mug, cup, coffee cup, tea cup, teacup', 0.1],
    ['teapot', 'teapot, tea pot', 0.22],
    ['plate', 'plate, dinner plate, dish, saucer, china plate, ceramic plate', 0.26],
    ['bowl', 'bowl, cereal bowl, soup bowl, china bowl, fruit bowl', 0.18],
    ['amphora', 'amphora, urn, ancient vase, greek vase, clay pot, pottery', 0.5],
    ['flowerpot', 'flowerpot, flower pot, plant pot, terracotta pot', 0.2],
    ['potted-plant', 'potted plant, pot plant, houseplant, house plant, plant', 0.5],
    ['toilet', 'toilet, loo, lavatory', 0.7],
  ]),
  // food, and what bursts
  ...G('soft', [
    ['watermelon', 'watermelon, water melon', 0.4, SOFT('#e8384f')],
    ['melon', 'melon, honeydew', 0.25, SOFT('#b8d96a')],
    ['tomato', 'tomato, cherry tomato', 0.08, SOFT('#d9281f')],
    ['peach', 'peach, nectarine, plum', 0.08, SOFT('#f4a261')],
    ['mango', 'mango', 0.12, SOFT('#f7a823')],
    ['tangerine', 'orange, tangerine, satsuma, clementine, mandarin', 0.08, SOFT('#f5912a')],
    ['lemon', 'lemon', 0.08, SOFT('#f7dc4d')],
    ['lime', 'lime', 0.06, SOFT('#a4cf3e')],
    ['strawberry', 'strawberry', 0.04, SOFT('#d7263d')],
    ['cherries', 'cherry, cherries', 0.05, SOFT('#b3122a')],
    ['grapes', 'grape, grapes, bunch of grapes', 0.15, SOFT('#6d3aa0')],
    ['blueberries', 'blueberry, blueberries', 0.03, SOFT('#3c4e9c')],
    ['kiwi-fruit', 'kiwi, kiwi fruit, kiwifruit', 0.07, SOFT('#8fbf3a')],
    ['pear', 'pear', 0.1, SOFT('#d6d96a')],
    ['banana', 'banana, plantain', 0.2, { ...SOFT('#f8e08e'), ...LONG }],
    ['avocado', 'avocado', 0.1, SOFT('#a9c766')],
    ['pineapple', 'pineapple', 0.3, SOFT('#f7cf3f')],
    ['birthday-cake', 'cake, birthday cake, wedding cake', 0.3, SOFT('#f6e2c2')],
    ['shortcake', 'slice of cake, shortcake, cheesecake, piece of cake', 0.12, SOFT('#f6e2c2')],
    ['cupcake', 'cupcake, muffin, fairy cake', 0.07, SOFT('#f4c1cf')],
    ['pie', 'pie, apple pie, tart, custard pie', 0.25, SOFT('#e8b65c')],
    ['custard', 'custard, flan, jelly, blancmange, pudding, trifle', 0.12, SOFT('#f6d25f')],
    ['soft-ice-cream', 'ice cream, ice cream cone, gelato', 0.15, SOFT('#f8f1e3')],
    ['hamburger', 'burger, hamburger, cheeseburger', 0.11, SOFT('#a9682c')],
    ['pizza', 'pizza, slice of pizza', 0.3, SOFT('#e8a23a')],
    ['hot-dog', 'hot dog, hotdog', 0.16, SOFT('#c5532e')],
    ['taco', 'taco', 0.14, SOFT('#e8b45c')],
    ['burrito', 'burrito, wrap', 0.18, SOFT('#d9a95f')],
    ['sandwich', 'sandwich, sarnie, toastie', 0.12, SOFT('#e6c283')],
    ['doughnut', 'doughnut, donut', 0.09, SOFT('#d48c5a')],
  ]),
  ...G('plastic', [
    ['bread', 'bread, loaf, loaf of bread', 0.25],
    ['baguette-bread', 'baguette, french stick', 0.6, LONG],
    ['croissant', 'croissant', 0.14],
    ['pretzel', 'pretzel', 0.12],
    ['waffle', 'waffle', 0.12],
    ['pancakes', 'pancake, pancakes, crepe', 0.15],
    ['cheese-wedge', 'cheese, wedge of cheese, block of cheese', 0.12],
    ['cookie', 'cookie, biscuit', 0.07],
    ['chocolate-bar', 'chocolate bar, chocolate, bar of chocolate', 0.15],
    ['candy', 'sweet, candy, boiled sweet, toffee', 0.04],
    ['lollipop', 'lollipop, lolly, sucker', 0.14],
    ['popcorn', 'popcorn, box of popcorn', 0.2],
    ['takeout-box', 'takeaway, takeaway box, takeout box, noodle box', 0.12],
    ['bento-box', 'lunch box, lunchbox, bento, bento box', 0.2],
    ['beverage-box', 'juice box, juice carton, carton, milk carton, carton of milk', 0.12],
    ['cup-with-straw', 'drink, soft drink, milkshake, fizzy drink, cup with a straw, paper cup', 0.15],
    ['bubble-tea', 'bubble tea', 0.15],
    ['carrot', 'carrot, parsnip', 0.15, LONG],
    ['potato', 'potato, spud', 0.1],
    ['onion', 'onion', 0.08],
    ['garlic', 'garlic, clove of garlic, bulb of garlic', 0.05],
    ['bell-pepper', 'pepper, bell pepper, capsicum', 0.1],
    ['hot-pepper', 'chilli, chili, chilli pepper', 0.1, LONG],
    ['cucumber', 'cucumber, courgette, gherkin', 0.25, LONG],
    ['eggplant', 'aubergine, eggplant', 0.2],
    ['broccoli', 'broccoli, cauliflower', 0.15],
    ['ear-of-corn', 'corn, corn on the cob, sweetcorn, maize', 0.2, LONG],
    ['brown-mushroom', 'mushroom, toadstool', 0.08],
    ['meat-on-bone', 'joint of meat, leg of lamb, meat, ham, gammon', 0.25],
    ['poultry-leg', 'chicken leg, drumstick, turkey leg', 0.15],
    ['cut-of-meat', 'steak, chop', 0.15],
    ['peanuts', 'peanut, peanuts, nut, nuts', 0.03],
    ['chestnut', 'chestnut, conker, acorn, hazelnut, walnut', 0.03],
    ['sushi', 'sushi', 0.05],
    ['oyster', 'oyster, clam, mussel, scallop', 0.1],
    ['spiral-shell', 'seashell, sea shell, conch, conch shell', 0.12],
    ['honey-pot', 'honey pot, pot of honey, honey jar', 0.12],
    ['canned-food', 'tin, tin of beans, tin of soup, tinned food, can of beans, baked beans, can of soup', 0.12],
    ['salt', 'salt shaker, salt cellar, salt, pepper pot', 0.1],
    ['sponge', 'sponge, loofah', 0.12],
    ['soap', 'soap, bar of soap', 0.1],
    ['lotion-bottle', 'shampoo, lotion, shampoo bottle, sun cream, hand gel', 0.18],
    ['roll-of-paper', 'toilet roll, loo roll, kitchen roll, paper towel, toilet paper', 0.12],
    ['baby-bottle', 'baby bottle, babys bottle, feeding bottle', 0.18],
    ['toothbrush', 'toothbrush', 0.18, LONG],
    ['balloon', 'balloon, party balloon, helium balloon', 0.3],
    ['puzzle-piece', 'jigsaw piece, puzzle piece', 0.04],
    ['game-die', 'die, dice', 0.02],
    ['nesting-dolls', 'russian doll, matryoshka, nesting doll, doll', 0.2],
    ['joystick', 'joystick', 0.15],
    ['video-game', 'game controller, video game, controller, gamepad, games console', 0.15],
    ['computer-mouse', 'computer mouse, optical mouse', 0.11],
    ['keyboard', 'computer keyboard, keyboard', 0.45, LONG],
    ['laptop', 'laptop, notebook computer, chromebook', 0.35],
    ['desktop-computer', 'computer, desktop computer, monitor, pc, computer screen', 0.5],
    ['printer', 'printer, photocopier', 0.45],
    ['radio', 'radio, transistor radio, boombox, ghetto blaster', 0.3],
    ['camera', 'camera, digital camera', 0.13],
    ['video-camera', 'video camera, camcorder', 0.2],
    ['telephone', 'telephone, landline, old phone', 0.22],
    ['headphone', 'headphones, headphone, headset, earphones', 0.2],
    ['loudspeaker', 'loudspeaker, tannoy', 0.25],
    ['megaphone', 'megaphone', 0.35],
    ['microphone', 'microphone, mic', 0.2, LONG],
    ['floppy-disk', 'floppy disk, floppy, diskette', 0.09],
    ['optical-disk', 'cd, compact disc, dvd, disc, blu ray', 0.12],
    ['ring-buoy', 'life ring, lifebelt, life buoy, lifebuoy, ring buoy, rubber ring, inflatable ring', 0.75],
    ['flying-saucer', 'flying saucer, ufo, spaceship, spacecraft', 6],
  ]),
  // what bounces and squashes
  ...G('rubber', [
    ['teddy-bear', 'teddy, teddy bear, soft toy, stuffed toy, cuddly toy, toy bear', 0.3],
    ['bowling', 'bowling ball', 0.22],
    ['pool-8-ball', 'pool ball, snooker ball, billiard ball, eight ball, 8 ball', 0.057],
    ['ping-pong', 'table tennis bat, ping pong bat, ping pong paddle, table tennis ball, ping pong ball, ping pong', 0.25],
    ['boxing-glove', 'boxing glove', 0.3],
    ['running-shoe', 'shoe, trainer, trainers, running shoe, sneaker, plimsoll, pump', 0.3],
    ['hiking-boot', 'boot, walking boot, hiking boot, wellington, welly, wellington boot, football boot', 0.3],
    ['high-heeled-shoe', 'high heel, stiletto, high heeled shoe', 0.25],
    ['roller-skate', 'roller skate, rollerskate', 0.3],
    ['wheel', 'tyre, wheel, tire, car tyre, car wheel, spare tyre', 0.6],
  ]),
  // metal: what clangs
  ...G('metal', [
    ['kettle', 'kettle, electric kettle, tea kettle', 0.25],
    ['anvil', 'anvil', 0.5],
    ['dumbbell', 'dumbbell, weight, barbell, gym weight, kettlebell, dumb bell', 0.35, LONG],
    ['saucepan', 'saucepan, cooking pot, pot, stock pot, casserole, pan', 0.28],
    ['frying-pan', 'frying pan, skillet, wok', 0.45],
    ['fridge', 'fridge, refrigerator, freezer', 1.8],
    ['washing-machine', 'washing machine, tumble dryer, dishwasher, washer', 0.9],
    ['microwave', 'microwave, microwave oven, oven, cooker', 0.5],
    ['spoon', 'spoon, teaspoon, tablespoon, ladle', 0.18, LONG],
    ['screwdriver', 'screwdriver', 0.22, LONG],
    ['carpentry-saw', 'saw, handsaw, hand saw, tenon saw', 0.5, LONG],
    ['pick', 'pickaxe, pick axe, pick', 0.8, LONG],
    ['nut-and-bolt', 'bolt, nut and bolt, screw, nail, rivet', 0.06],
    ['gear', 'gear, cog, gear wheel, cogwheel', 0.2],
    ['ladder', 'ladder, step ladder, stepladder', 2.2, LONG],
    ['toolbox', 'toolbox, tool box, tool kit, toolkit, box of tools', 0.45],
    ['magnet', 'magnet, horseshoe magnet', 0.1],
    ['fire-extinguisher', 'fire extinguisher, extinguisher', 0.5],
    ['hook', 'hook, grappling hook, fish hook', 0.15],
    ['oil-drum', 'barrel, oil drum, oil barrel, drum of oil, steel drum', 0.9],
    ['anchor', 'anchor, ship anchor', 1],
    ['balance-scale', 'scales, balance, weighing scales, set of scales', 0.4],
    ['shopping-cart', 'shopping trolley, trolley, shopping cart', 1],
    ['bell', 'bell, church bell, school bell, handbell', 0.3],
    ['alarm-clock', 'alarm clock, clock', 0.15],
    ['mantelpiece-clock', 'mantel clock, mantelpiece clock', 0.3],
    ['stopwatch', 'stopwatch, stop watch, pocket watch', 0.07],
    ['watch', 'watch, wristwatch', 0.2, LONG],
    ['locked', 'padlock, lock', 0.07],
    ['compass', 'compass', 0.08],
    ['trophy', 'trophy, cup trophy, fa cup, sports cup', 0.4],
    ['sports-medal', 'medal, gold medal', 0.09],
    ['crown', 'crown, tiara', 0.2],
    ['ring', 'ring, wedding ring, diamond ring, engagement ring', 0.02],
    ['battery', 'battery, car battery, aa battery', 0.1],
    ['satellite', 'satellite', 3],
    ['telescope', 'telescope, spyglass', 1.2, LONG],
    ['microscope', 'microscope', 0.4],
    ['trumpet', 'trumpet, cornet, bugle', 0.5, LONG],
    ['saxophone', 'saxophone, sax', 0.7],
    ['postal-horn', 'french horn, horn, tuba', 0.4],
    ['pushpin', 'drawing pin, pushpin, thumb tack, tack', 0.02],
    ['scissors', 'scissors, pair of scissors, shears', 0.2],
  ]),
  // stone: what thuds
  ...G('stone', [
    ['moai', 'statue, stone statue, moai, stone head', 2.5],
    ['snowman', 'snowman', 1.5],
    ['curling-stone', 'curling stone', 0.3],
    ['gem-stone', 'diamond, gem, gemstone, jewel, crystal, ruby, emerald, sapphire', 0.03],
    ['globe-showing-europe-africa', 'globe, world globe, earth, planet earth', 0.3],
  ]),
  // wood: splinters
  ...G('wood', [
    ['chair', 'chair, stool, seat, dining chair, wooden chair', 0.9],
    ['sofa', 'sofa, couch, settee, armchair', 2],
    ['wardrobe', 'wardrobe, cupboard, closet, cabinet, dresser', 2],
    ['bookcase', 'bookcase, bookshelf, book case, shelf unit', 1.9],
    ['bed', 'bed, double bed', 2],
    ['door', 'door, wooden door', 2],
    ['piano', 'piano, upright piano, grand piano, pianoforte', 1.5],
    ['guitar', 'guitar, electric guitar, acoustic guitar, bass guitar', 1, LONG],
    ['violin', 'violin, viola, fiddle, cello', 0.6, LONG],
    ['banjo', 'banjo, ukulele', 0.9, LONG],
    ['accordion', 'accordion, concertina', 0.45],
    ['drum', 'drum, snare drum, bass drum, drum kit', 0.4],
    ['long-drum', 'bongo, conga, tom tom', 0.6],
    ['flute', 'flute, recorder, clarinet, oboe, tin whistle', 0.5, LONG],
    ['maracas', 'maraca, maracas', 0.25],
    ['abacus', 'abacus', 0.3],
    ['framed-picture', 'painting, picture, picture frame, framed picture, photo frame', 0.6],
    ['wood', 'log, tree trunk, plank, block of wood, firewood, piece of wood, beam, wooden block', 1, LONG],
    ['broom', 'broom, broomstick, sweeping brush, mop', 1.4, LONG],
    ['boomerang', 'boomerang', 0.4],
    ['paintbrush', 'paintbrush, paint brush, brush', 0.25, LONG],
    ['sled', 'sled, sledge, toboggan', 1.1, LONG],
    ['canoe', 'canoe, kayak, rowing boat, dinghy', 4, LONG],
    ['field-hockey', 'hockey stick', 0.9, LONG],
    ['deciduous-tree', 'tree, oak tree, oak', 8],
    ['evergreen-tree', 'pine tree, fir tree, christmas tree, conifer', 8],
    ['basket', 'basket, laundry basket, picnic basket, wicker basket, hamper', 0.45],
    ['bone', 'bone, dog bone', 0.2, LONG],
  ]),
  // paper and cloth: flutter to rest
  ...G('paper', [
    ['page-facing-up', 'piece of paper, sheet of paper, paper, page, sheet, homework, exam paper, worksheet', 0.3],
    ['scroll', 'scroll, parchment', 0.35],
    ['newspaper', 'newspaper, tabloid, magazine', 0.4],
    ['envelope', 'envelope, letter, postcard', 0.2],
    ['clipboard', 'clipboard', 0.32],
    ['notebook', 'notebook, exercise book, jotter', 0.22],
    ['books', 'pile of books, stack of books', 0.25],
    ['spiral-calendar', 'calendar, diary', 0.25],
    ['file-folder', 'folder, file, ring binder, binder', 0.3],
    ['feather', 'feather, quill', 0.25, LONG],
    ['maple-leaf', 'leaf, maple leaf, autumn leaf', 0.1],
    ['rose', 'rose, flower, single rose', 0.3, LONG],
    ['sunflower', 'sunflower', 1, LONG],
    ['tulip', 'tulip, daffodil', 0.3, LONG],
    ['bouquet', 'bouquet, bunch of flowers, flowers', 0.4],
    ['kite', 'kite, paper kite', 0.7],
    ['umbrella', 'umbrella, parasol, brolly', 0.9],
    ['closed-umbrella', 'closed umbrella, folded umbrella', 0.9, LONG],
    ['parachute', 'parachute, canopy', 5],
    ['tent', 'tent', 2],
    ['t-shirt', 't shirt, tshirt, shirt, jersey, football shirt, top, vest', 0.6],
    ['socks', 'sock, socks, pair of socks', 0.3],
    ['scarf', 'scarf', 0.8],
    ['billed-cap', 'cap, baseball cap, hat, sun hat', 0.2],
    ['womans-hat', 'bonnet, straw hat, ladies hat', 0.3],
    ['graduation-cap', 'mortarboard, graduation cap', 0.3],
    ['rescue-workers-helmet', 'helmet, hard hat, safety helmet, crash helmet, bike helmet', 0.28],
    ['backpack', 'backpack, rucksack, school bag, schoolbag, bag, satchel', 0.45],
    ['handbag', 'handbag, purse, clutch', 0.3],
    ['shopping-bags', 'shopping bag, shopping bags, carrier bag, plastic bag', 0.4],
    ['luggage', 'suitcase, luggage, case, holdall', 0.7],
    ['briefcase', 'briefcase, attache case', 0.45],
    ['money-bag', 'money bag, bag of money, sack of money', 0.35],
    ['yarn', 'ball of wool, ball of yarn, yarn, wool', 0.1],
    ['red-paper-lantern', 'lantern, paper lantern', 0.3],
    ['wrapped-gift', 'present, gift, wrapped gift, birthday present, christmas present', 0.3],
  ]),
  // pencil case, plastic and kit that only clatters
  ...G('plastic', [
    ['pen', 'pen, biro, ballpoint, ballpoint pen', 0.14, LONG],
    ['fountain-pen', 'fountain pen, marker, marker pen, felt tip', 0.14, LONG],
    ['straight-ruler', 'ruler, metre stick, metre rule, yard stick', 0.3, LONG],
    ['triangular-ruler', 'set square, triangular ruler, protractor', 0.2],
    ['artist-palette', 'palette, artists palette, paint palette', 0.3],
    ['wastebasket', 'bin, waste bin, wastebasket, dustbin, wheelie bin, rubbish bin', 0.5],
    ['card-file-box', 'filing box, box file, storage box', 0.4],
    ['plunger', 'plunger, sink plunger', 0.45, LONG],
    ['ice-skate', 'ice skate, skate, figure skate', 0.3],
    ['skis', 'pair of skis, skis', 1.7, LONG],
    ['diving-mask', 'diving mask, snorkel, scuba mask', 0.2],
    ['goggles', 'goggles, swimming goggles, ski goggles', 0.18],
    ['tennis', 'tennis racket, tennis racquet, racket, racquet', 0.68, LONG],
    ['badminton', 'badminton racket, badminton racquet, squash racket', 0.66, LONG],
    ['lacrosse', 'lacrosse stick', 1, LONG],
    ['ice-hockey', 'ice hockey stick, puck, hockey puck', 1.2, LONG],
    ['cricket-game', 'cricket bat', 0.9, LONG],
    ['ambulance', 'ambulance', 5.5],
    ['fire-engine', 'fire engine, fire truck', 8],
    ['sailboat', 'sailing boat, sailboat, yacht', 8],
    ['airplane', 'aeroplane, airplane, airliner, jet plane', 30],
    ['small-airplane', 'light aircraft, small plane, biplane', 8],
    ['helicopter', 'helicopter', 12],
  ]),
  // what is alive lands gently: a thud and a little dust, nothing worse
  ...G('animal', [
    ['chicken', 'chicken, hen, chick', 0.4],
    ['rooster', 'rooster, cockerel', 0.5],
    ['turkey', 'turkey', 0.8],
    ['mouse', 'mouse, field mouse, gerbil, dormouse', 0.1],
    ['rat', 'rat', 0.3],
    ['hedgehog', 'hedgehog, porcupine', 0.25],
    ['bat', 'bat, fruit bat', 0.3],
    ['lady-beetle', 'ladybird, ladybug', 0.03],
    ['honeybee', 'bee, honeybee, bumblebee, wasp', 0.03],
    ['butterfly', 'butterfly, moth', 0.1],
    ['beetle', 'beetle, stag beetle', 0.05],
    ['snail', 'snail, slug', 0.06],
    ['turtle', 'tortoise, turtle, terrapin', 0.5],
    ['lizard', 'lizard, gecko, iguana', 0.3],
    ['crocodile', 'crocodile, alligator', 3.5],
    ['snake', 'snake, python, cobra', 1.2],
    ['crab', 'crab', 0.2],
    ['lobster', 'lobster, crayfish', 0.35],
    ['shrimp', 'shrimp, prawn', 0.1],
    ['octopus', 'octopus', 0.7],
    ['squid', 'squid', 0.6],
    ['blowfish', 'pufferfish, blowfish', 0.25],
    ['shark', 'shark, great white', 3],
    ['whale', 'whale, blue whale, humpback', 12],
    ['seal', 'seal, sea lion, walrus', 2],
    ['otter', 'otter', 1],
    ['pig', 'pig, piglet, hog, boar', 1.2],
    ['cow', 'cow, bull, calf, cattle', 2],
    ['ram', 'ram', 1.2],
    ['elephant', 'elephant, mammoth', 4],
    ['rhinoceros', 'rhino, rhinoceros', 3.5],
    ['hippopotamus', 'hippo, hippopotamus', 3.5],
    ['giraffe', 'giraffe', 4.5],
    ['zebra', 'zebra', 2.2],
    ['camel', 'camel, llama', 2.5],
    ['sloth', 'sloth', 0.7],
    ['t-rex', 't rex, tyrannosaurus, dinosaur, trex', 12],
    ['sauropod', 'diplodocus, brontosaurus, sauropod', 20],
    ['dragon', 'dragon', 6],
    ['unicorn', 'unicorn', 2.2],
  ]),
];

/* ── drawn for this app, in the same style, where the emoji set has nothing
   that reads. Ours, not Fluent's. Each is held to the same allowlist as a
   model's drawing, so each is 32 by 32, flat, with a gradient or two. */
export const OWN = {
  'plain-glass': `<g fill="none"><path fill="#c7e6f7" d="M8.7 4h14.6a1 1 0 0 1 1 1.1l-1.9 22.1a2 2 0 0 1-2 1.8h-9.8a2 2 0 0 1-2-1.8L7.7 5.1a1 1 0 0 1 1-1.1"/><path fill="#8fd0f2" d="m9.5 13.5l1.2 13.6a1 1 0 0 0 1 .9h8.6a1 1 0 0 0 1-.9l1.2-13.6z"/><path fill="#5fb4e4" d="M22.2 16.6l-1 10.5a1 1 0 0 1-1 .9h-1.7l1.5-11.4z"/><path fill="#e6f6ff" d="M9.5 13.5h13l-.1.9c-2 .9-4.200-.6-6.400 0s-4.300.9-6.400 0z"/><path fill="#fff" fill-opacity=".75" d="M10.6 6.200h1.300l1.100 19h-1.100a.5.5 0 0 1-.5-.5z"/><path stroke="#6d93a8" stroke-width="1.100" stroke-linecap="round" stroke-linejoin="round" d="M8.300 4.600h15.400l-2 23a1.500 1.500 0 0 1-1.500 1.400h-8.400a1.500 1.500 0 0 1-1.500-1.400z"/></g>`,
  'glass-vase': `<defs><linearGradient id="v" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#2a6fbd"/><stop offset=".55" stop-color="#57a4e6"/><stop offset="1" stop-color="#1f5599"/></linearGradient></defs><path fill="url(#v)" d="M12 3h8c.6 0 1 .4 1 1s-.4 1-1 1h-.4c-.1 1.800.4 3 1.700 5 1.800 2.800 3.200 5.400 3.200 8.700 0 4-2.300 7.300-4.800 9.300H12.300c-2.500-2-4.800-5.300-4.800-9.300 0-3.300 1.400-5.900 3.200-8.700 1.300-2 1.800-3.200 1.700-5H12c-.6 0-1-.4-1-1s.4-1 1-1"/><path fill="#fff" fill-opacity=".45" d="M12.500 11.500c-1.500 2.400-2.700 4.700-2.700 7.400 0 2.200.8 4.200 2 5.800.4.500 1.100-.1.800-.6-.9-1.500-1.500-3.300-1.500-5.200 0-2.300 1-4.400 2.300-6.600.4-.7-.5-1.400-.9-.8"/><path fill="#ffd66b" d="M8.300 15.200c2.400 1.100 5 1.600 7.700 1.600s5.300-.5 7.700-1.600c.3.700.5 1.400.7 2.100-2.600 1.100-5.500 1.700-8.400 1.700s-5.800-.6-8.400-1.700c.2-.7.400-1.400.7-2.100"/><path fill="#17447e" d="M12.300 3.800h7.400c.3 0 .5.200.5.500s-.2.500-.5.500h-7.400c-.3 0-.5-.2-.5-.5s.2-.5.500-.5"/><path fill="#17447e" d="M12.300 28h7.400c-.5.500-1 .9-1.500 1.300h-4.400c-.5-.4-1-.8-1.500-1.300"/>`,
  mug: `<defs><linearGradient id="m" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fbfbf8"/><stop offset=".7" stop-color="#e8e6df"/><stop offset="1" stop-color="#c8c6bd"/></linearGradient></defs><path fill="#d3d1c8" d="M22 11h2.500a5.500 5.500 0 0 1 0 11H22v-2.600h2.500a2.900 2.900 0 0 0 0-5.800H22z"/><path fill="url(#m)" d="M5 7.500c0-.8.700-1.500 1.500-1.500h15c.8 0 1.500.7 1.500 1.500V24a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><ellipse cx="14" cy="7.200" rx="8.400" ry="1.500" fill="#6d4427"/><ellipse cx="14" cy="7.400" rx="7.200" ry="1" fill="#8a5a36"/><path fill="#e8483f" d="M5 15h18v5H5z"/><path fill="#c7342d" d="M20 15h3v5h-3z"/><path fill="#fff" fill-opacity=".7" d="M7.200 9.500h1.600v13.300c0 .4-.4.700-.8.700s-.8-.300-.8-.700z"/>`,
  plate: `<defs><radialGradient id="p" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#eef0f2"/><stop offset="1" stop-color="#c9ced4"/></radialGradient></defs><circle cx="16" cy="16" r="13.500" fill="url(#p)"/><circle cx="16" cy="16" r="13.500" fill="none" stroke="#9ea7b0" stroke-width=".8"/><circle cx="16" cy="16" r="8.500" fill="#f7f8f9" stroke="#cdd3d9" stroke-width=".8"/><circle cx="16" cy="16" r="11" fill="none" stroke="#3f7fc4" stroke-width="1.100"/><circle cx="16" cy="16" r="12.200" fill="none" stroke="#3f7fc4" stroke-width=".5"/><path fill="#fff" d="M9 11.500a8.500 8.500 0 0 1 5-3.700c.5-.1.800.6.300.9a10 10 0 0 0-4.500 3.400c-.4.500-1.100 0-.8-.6"/>`,
  bowl: `<defs><linearGradient id="b" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#f9d9a6"/><stop offset=".6" stop-color="#ef9c4e"/><stop offset="1" stop-color="#c26a24"/></linearGradient></defs><ellipse cx="16" cy="11.500" rx="13" ry="3.500" fill="#8c4b18"/><ellipse cx="16" cy="11.200" rx="11.300" ry="2.500" fill="#b86a2a"/><path fill="url(#b)" d="M3 11.500c1 1.900 6.700 3.500 13 3.500s12-1.600 13-3.500c0 7-3.700 12-8.500 14v1a1.500 1.500 0 0 1-1.500 1.500h-6a1.500 1.500 0 0 1-1.500-1.500v-1C6.700 23.500 3 18.500 3 11.500"/><path fill="#fff" fill-opacity=".55" d="M6 15.500c.8 3 2.600 5.400 4.800 7 .5.400 1-.3.600-.700-1.900-1.800-3.300-4-4-6.500-.2-.6-1.500-.4-1.400.2"/><path fill="#a95b1c" d="M11.500 25.500h9v1a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1z"/>`,
  flowerpot: `<defs><linearGradient id="f" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#e88a5b"/><stop offset=".6" stop-color="#cf6a3c"/><stop offset="1" stop-color="#a54d27"/></linearGradient></defs><path fill="url(#f)" d="M7.500 12h17l-2.200 15.200a2 2 0 0 1-2 1.800h-8.600a2 2 0 0 1-2-1.800z"/><rect x="5.500" y="7" width="21" height="6" rx="1.200" fill="#de7a4b"/><rect x="21.500" y="7" width="5" height="6" rx="1.200" fill="#b95a30"/><path fill="#5a3a24" d="M7 7c1.500-1.500 4.900-2 9-2s7.500.5 9 2z"/><path fill="#fff" fill-opacity=".35" d="M7.700 8.200h2.200v3.600H7.700zm2.200 6h2l1.300 12.500h-1.700z"/><path fill="#9c4a26" d="M7.500 13h17l-.3 1.700h-16.400z"/>`,
  kettle: `<defs><linearGradient id="k" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#e9edf1"/><stop offset=".45" stop-color="#b8c1ca"/><stop offset="1" stop-color="#6f7b86"/></linearGradient></defs><path fill="#2f3439" d="M9 9.500c0-3 3-5.500 7-5.500s7 2.500 7 5.500h-2.200c0-1.700-2-3.300-4.800-3.300s-4.800 1.600-4.800 3.300z"/><path fill="#8f99a3" d="M7.400 16.500L2 11.300c-.5-.5-.2-1.300.5-1.300h2.100c.3 0 .6.100.8.300l4.100 3.900z"/><path fill="url(#k)" d="M9.500 9h13c1.100 0 2 .7 2.300 1.800L27 23.600c.5 2.600-1.500 5-4.100 5H9.100c-2.600 0-4.600-2.400-4.100-5l2.200-12.800C7.500 9.700 8.400 9 9.500 9"/><rect x="11.500" y="6.800" width="9" height="3.200" rx="1.200" fill="#5d6771"/><circle cx="16" cy="6.500" r="1.700" fill="#2f3439"/><path fill="#fff" fill-opacity=".6" d="M10.400 11h1.800l-1.500 14.500H9c-.3 0-.5-.2-.5-.5z"/><rect x="4.600" y="26" width="22.800" height="3.500" rx="1.500" fill="#3a4047"/>`,
  anvil: `<defs><linearGradient id="a" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7c8691"/><stop offset="1" stop-color="#3b424a"/></linearGradient></defs><path fill="url(#a)" d="M1.500 9h22.800c1 0 1.700.8 1.700 1.700V12c0 .8.700 1.500 1.500 1.500h1.900c.3 0 .6.300.6.600v.400c0 2.500-2 4.500-4.500 4.500h-1.300c-1.200 0-2.200 1-2.200 2.200V23h-14v-1.800c0-1.200-1-2.200-2.200-2.200C4.300 19 2 15.500 1.100 10c-.1-.5.100-1 .4-1"/><rect x="6" y="23" width="18" height="2.500" fill="#2f353b"/><rect x="4" y="25.500" width="22" height="3" rx=".8" fill="#454d55"/><path fill="#a9b3bd" d="M4 9h20.300c.8 0 1.400.6 1.400 1.400v.6H6c-1.100 0-2-.9-2-2"/><rect x="19" y="10.800" width="2" height="2" fill="#23282d"/>`,
  dumbbell: `<rect x="9" y="14" width="14" height="4" fill="#9aa3ac"/><rect x="9" y="14" width="14" height="1.500" fill="#d3d9df"/><rect x="2" y="12" width="3" height="8" rx="1.200" fill="#8a939c"/><rect x="4.500" y="8" width="5" height="16" rx="1.500" fill="#5a636c"/><rect x="5.300" y="8.800" width="1.300" height="14.400" rx=".6" fill="#aab3bc"/><rect x="27" y="12" width="3" height="8" rx="1.200" fill="#8a939c"/><rect x="22.500" y="8" width="5" height="16" rx="1.500" fill="#5a636c"/><rect x="23.300" y="8.800" width="1.300" height="14.400" rx=".6" fill="#aab3bc"/>`,
  saucepan: `<defs><linearGradient id="s" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#eef1f4"/><stop offset=".5" stop-color="#b9c2cb"/><stop offset="1" stop-color="#737f8b"/></linearGradient></defs><rect x="20" y="12" width="11" height="2.600" rx="1.300" fill="#2b2f34"/><path fill="url(#s)" d="M2 12h19v12a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"/><rect x="1" y="9.700" width="21" height="2.800" rx="1.200" fill="#8791a0"/><path fill="#2b2f34" d="M9.500 9.700c0-1.900 1-3.200 2-3.200s2 1.300 2 3.200z"/><path fill="#fff" fill-opacity=".6" d="M4 14h1.800v10.700c0 .4-.4.700-.9.700s-.9-.3-.9-.7z"/>`,
  'frying-pan': `<defs><linearGradient id="fp" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#454b52"/><stop offset="1" stop-color="#23272c"/></linearGradient></defs><rect x="19" y="14" width="12" height="3" rx="1.500" fill="#b5763a"/><rect x="19" y="14" width="12" height="1" rx=".5" fill="#d59a5e"/><path fill="url(#fp)" d="M1 14h20c0 5.500-3 9-6.500 9h-7C4 23 1 19.500 1 14"/><rect x=".5" y="13" width="21" height="2" rx="1" fill="#6b737c"/><rect x="2" y="13.300" width="18" height=".6" rx=".3" fill="#a4acb5"/><path fill="#fff" fill-opacity=".14" d="M3.500 16h2c.4 2.200 1.300 4 2.600 5.300-2.100-.8-3.900-2.700-4.600-5.300"/>`,
  fridge: `<defs><linearGradient id="r" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#e3e8ec"/><stop offset="1" stop-color="#b7c0c8"/></linearGradient></defs><rect x="7" y="2" width="18" height="27" rx="2" fill="url(#r)"/><rect x="7" y="11.500" width="18" height=".9" fill="#7b8791"/><rect x="9.500" y="6" width="1.300" height="4" rx=".65" fill="#5f6b76"/><rect x="9.500" y="14" width="1.300" height="7" rx=".65" fill="#5f6b76"/><rect x="8" y="29" width="3" height="1.500" fill="#4d565f"/><rect x="21" y="29" width="3" height="1.500" fill="#4d565f"/><rect x="21" y="2.700" width="3.300" height="25.600" rx="1" fill="#a8b2bb" fill-opacity=".5"/><circle cx="19" cy="17" r="1.100" fill="#e8483f"/><rect x="15" y="20.500" width="3.500" height="2.700" fill="#ffd66b"/>`,
  'washing-machine': `<defs><radialGradient id="w" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#d9f1ff"/><stop offset=".6" stop-color="#7fbce6"/><stop offset="1" stop-color="#3c79ad"/></radialGradient></defs><rect x="5" y="3" width="22" height="26" rx="2" fill="#f2f4f6"/><rect x="23" y="3" width="4" height="26" rx="1.500" fill="#cdd4da"/><rect x="5" y="9" width="22" height=".8" fill="#9aa5ae"/><circle cx="16" cy="19" r="7.800" fill="#7b8791"/><circle cx="16" cy="19" r="6.200" fill="url(#w)"/><path fill="#fff" fill-opacity=".7" d="M12 15.500a5.300 5.300 0 0 1 3.800-2c.5 0 .5.800 0 .9a4 4 0 0 0-2.900 1.800c-.3.500-1.200 0-.9-.7"/><circle cx="23" cy="6" r="1.700" fill="#7b8791"/><rect x="7" y="4.800" width="8" height="2.400" rx=".6" fill="#3f4a54"/><rect x="8" y="5.500" width="4" height="1" fill="#7fd0ff"/><rect x="7" y="29" width="3" height="1.200" fill="#4d565f"/><rect x="22" y="29" width="3" height="1.200" fill="#4d565f"/>`,
  microwave: `<defs><linearGradient id="mw" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#3a4750"/><stop offset="1" stop-color="#14191d"/></linearGradient></defs><rect x="2" y="7" width="28" height="18" rx="1.800" fill="#d5dae0"/><rect x="2" y="21.500" width="28" height="3.500" rx="1.500" fill="#aeb6be"/><rect x="4" y="9" width="17.500" height="12" rx="1" fill="url(#mw)"/><path fill="#fff" fill-opacity=".14" d="M5.500 10.500h6.500l-3.500 9h-3z"/><rect x="23.500" y="9.300" width="5" height="3" rx=".5" fill="#2e3a44"/><rect x="24.200" y="10.100" width="3.500" height="1.400" fill="#7fe0a8"/><circle cx="26" cy="15.300" r="1.300" fill="#7b8791"/><circle cx="26" cy="19" r="1.300" fill="#7b8791"/><rect x="4" y="25" width="3" height="1.500" fill="#4d565f"/><rect x="25" y="25" width="3" height="1.500" fill="#4d565f"/>`,
  spoon: `<defs><linearGradient id="sp" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#f2f5f7"/><stop offset="1" stop-color="#98a3ae"/></linearGradient></defs><path fill="url(#sp)" d="M16 2c3.300 0 5.500 3 5.500 6.500 0 3-1.900 5.300-4.200 6l.2 14a1.500 1.500 0 0 1-3 0l.2-14c-2.300-.7-4.200-3-4.200-6C10.500 5 12.700 2 16 2"/><ellipse cx="16" cy="8.500" rx="3.700" ry="5" fill="#8d98a3"/><ellipse cx="15.300" cy="7" rx="1.200" ry="2.500" fill="#f8fafb" fill-opacity=".85"/><path fill="#7a858f" d="M15.800 15.800h1.400l.3 13.200c0 .5-.4.800-.8.900z"/><path fill="#c7cfd6" d="M15 15.800h.6l-.1 12.500H14.800z"/>`,
  wardrobe: `<defs><linearGradient id="wa" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#b57a45"/><stop offset=".6" stop-color="#99602f"/><stop offset="1" stop-color="#6f4220"/></linearGradient></defs><rect x="5" y="3" width="22" height="25.500" rx="1" fill="url(#wa)"/><rect x="4" y="2" width="24" height="2.500" rx=".8" fill="#7b4c26"/><rect x="7" y="6" width="8.300" height="20" rx=".6" fill="#b07a48"/><rect x="16.700" y="6" width="8.300" height="20" rx=".6" fill="#a06b3c"/><rect x="8.300" y="7.500" width="5.700" height="17" rx=".4" fill="#8f5c30"/><rect x="18" y="7.500" width="5.700" height="17" rx=".4" fill="#85542b"/><circle cx="14.300" cy="16" r=".9" fill="#f2cf74"/><circle cx="17.700" cy="16" r=".9" fill="#f2cf74"/><rect x="6" y="28.500" width="3" height="2" fill="#4d2f17"/><rect x="23" y="28.500" width="3" height="2" fill="#4d2f17"/>`,
  bookcase: `<rect x="4" y="2" width="24" height="28" rx="1" fill="#8a5a30"/><rect x="24.500" y="2" width="3.500" height="28" rx="1" fill="#6e4522"/><rect x="6" y="4" width="20" height="7.500" fill="#4a2f18"/><rect x="6" y="13" width="20" height="7" fill="#4a2f18"/><rect x="6" y="21.500" width="20" height="7" fill="#4a2f18"/><path fill="#d9534f" d="M7 5.500h2.500v6H7z"/><path fill="#4a90d9" d="M9.800 6.500H12v5H9.800z"/><path fill="#f2cf74" d="M12.300 5h2.200v6.500h-2.200z"/><path fill="#57b37f" d="M14.800 6h2v5.500h-2z"/><path fill="#e8e6df" d="M18 7l1.800-.4 1.200 4.900-1.800.4z"/><path fill="#e88a5b" d="M7 14.500h2.500V20H7z"/><path fill="#9b6dd0" d="M10 15h2v5h-2z"/><path fill="#4a90d9" d="M16 14.500h2.300V20H16z"/><path fill="#d9534f" d="M18.600 15.200h2V20h-2z"/><path fill="#f2cf74" d="M8 23h2.300v5.500H8z"/><path fill="#57b37f" d="M10.600 24h2v4.500h-2z"/><path fill="#e8e6df" d="M18 24h6.500v1.300H18zm0 1.500h6v1.300h-6zm0 1.500h6.500v1.500H18z"/>`,
  sofa: `<defs><linearGradient id="so" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7cb0d9"/><stop offset="1" stop-color="#3f76a6"/></linearGradient></defs><path fill="url(#so)" d="M6 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v9H6z"/><rect x="1.500" y="13" width="6" height="13" rx="2.500" fill="#2f5f8b"/><rect x="24.500" y="13" width="6" height="13" rx="2.500" fill="#2f5f8b"/><rect x="2.300" y="13.800" width="1.600" height="9" rx=".8" fill="#5e97c5"/><rect x="25.300" y="13.800" width="1.600" height="9" rx=".8" fill="#5e97c5"/><rect x="6.500" y="17" width="9.300" height="5.500" rx="1.500" fill="#6da4d0"/><rect x="16.200" y="17" width="9.300" height="5.500" rx="1.500" fill="#6da4d0"/><rect x="6" y="22" width="20" height="4" fill="#2f5f8b"/><rect x="4" y="26" width="3" height="2.500" fill="#2b1d12"/><rect x="25" y="26" width="3" height="2.500" fill="#2b1d12"/><path fill="#fff" fill-opacity=".25" d="M9 7.500h14c.6 0 1 .4 1 1v.5H8v-.5c0-.6.4-1 1-1"/>`,
  piano: `<defs><linearGradient id="pi" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#4a3127"/><stop offset=".55" stop-color="#2e1d16"/><stop offset="1" stop-color="#1a100c"/></linearGradient></defs><rect x="4" y="3.500" width="24" height="17" rx="1" fill="url(#pi)"/><rect x="3" y="2.500" width="26" height="2.300" rx="1" fill="#5d3e31"/><rect x="11" y="6.500" width="10" height="6" rx=".5" fill="#efe9da"/><rect x="12.200" y="7.800" width="7.600" height=".6" fill="#6e6658"/><rect x="12.200" y="9.300" width="7.600" height=".6" fill="#6e6658"/><rect x="12.200" y="10.800" width="5" height=".6" fill="#6e6658"/><rect x="2.500" y="17" width="27" height="5" rx=".7" fill="#1a100c"/><rect x="3.500" y="17.600" width="25" height="3.700" fill="#f8f6ef"/><path fill="#17100c" d="M5 17.600h1v2.200H5zm2.600 0h1v2.200h-1zm3.900 0h1v2.200h-1zm2.600 0h1v2.200h-1zm2.600 0h1v2.200h-1zm3.900 0h1v2.200h-1zm2.600 0h1v2.200h-1zm2.600 0h1v2.200h-1z"/><rect x="5" y="22" width="22" height="6" fill="#2a1a13"/><rect x="4" y="22" width="2.500" height="8" fill="#3a251c"/><rect x="25.500" y="22" width="2.500" height="8" fill="#3a251c"/><rect x="13" y="27" width="2" height="1.300" rx=".3" fill="#e8c35f"/><rect x="17" y="27" width="2" height="1.300" rx=".3" fill="#e8c35f"/><rect x="4" y="29.700" width="24" height=".8" fill="#120a07"/>`,
};

/** "wine glass, goblet" → ['wine glass', 'goblet']. */
const wordsOf = (s) => s.split(',').map((w) => w.trim()).filter(Boolean);

export function build(fluent) {
  const icons = {}, words = {}, problems = [];
  for (const row of ROWS) {
    const body = OWN[row.slug] ?? fluent.icons[row.slug]?.body;
    if (body == null) { problems.push(`${row.slug}: no such icon`); continue; }
    const clean = sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${body}</svg>`);
    if (!clean.ok) { problems.push(`${row.slug}: ${clean.reason}`); continue; }
    if (icons[row.slug]) problems.push(`${row.slug}: listed twice`);
    // the document's own header is put back by the browser's sanitiser: only the drawing is kept
    icons[row.slug] = { b: body, m: row.m, mat: row.material, ...(row.long ? { long: 1 } : {}), ...(row.pulp ? { pulp: row.pulp } : {}) };
    for (const w of wordsOf(row.words)) {
      if (words[w] && words[w] !== row.slug) problems.push(`"${w}": both ${words[w]} and ${row.slug}`);
      words[w] = row.slug;
    }
  }
  return { icons, words, problems };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const src = process.argv[2];
  if (!src || !fs.existsSync(src)) { console.error('usage: node tools/icon-catalogue.mjs <@iconify-json/fluent-emoji-flat icons.json>'); process.exit(2); }
  const { icons, words, problems } = build(JSON.parse(fs.readFileSync(src, 'utf8')));
  for (const p of problems) console.error(`  ! ${p}`);
  const out = path.join(ROOT, 'js/compose/icons.json');
  fs.writeFileSync(out, `${JSON.stringify({ icons, words })}\n`);
  console.log(`wrote js/compose/icons.json: ${Object.keys(icons).length} icons, ${Object.keys(words).length} words, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}
