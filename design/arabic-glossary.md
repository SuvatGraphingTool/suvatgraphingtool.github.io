# The Arabic glossary

Arabic mode is all Arabic. The only Latin-looking thing left on screen is a digit,
which stays Western (0–9), as the user asked. Words live in `js/i18n/ar.js`; every
symbol and unit is in **one table, `ARABIC` in `js/notation.js`**, so any of them
changes in one line, on the page and on the canvas alike.

Equations read right to left, as Arabic school maths does, with each number's
digits intact, fractions still stacked and a radical with its bar. Arabic has no
italic, so a quantity is set upright and a step heavier.

## Symbols

| Source | Arabic | What it is | Why |
|---|---|---|---|
| v | ع | velocity, final velocity | the usual letter (عجلة is ت here, not ع) |
| u | ع₀ | initial velocity | ع with a 0 below it: digits stay Western |
| U | ع₀ | initial speed, in letters | the same quantity; the two never meet in one line |
| V | عم | the steady speed a paper hides | ع with م below it, so "V − 10" still reads as a speed |
| t | ز | time | زمن |
| T | زك | total time | ز with ك below it (كلي) |
| Ten | ش | tension | شد. The source writes `Ten`, which English sets as T |
| s | ف | displacement | مسافة: ف is the school letter, and س is taken by x |
| a | ت | acceleration | تسارع |
| g | جـ | gravity | the Gulf curricula; Egypt uses د, which is a length here |
| h | ل | height | ع and ف are taken. Unsure: there is no one school letter |
| H | ح | greatest height, a height in letters | Arabic has no capitals, and h and H can share a line |
| x, y | س, ص | coordinates | universal |
| u_x, u_y | ع₀ س, ع₀ ص | components | as in the books: the direction below the letter |
| m | ك | mass | كتلة; م is the metre |
| F | ق | force | قوة |
| R, r | ر | reaction, resistance, position | رد الفعل |
| W, w | و | weight | وزن |
| I, J | دف | impulse | دفع |
| θ | هـ | the angle | the common school letter |
| α, β | أ, ب | other angles | |
| μ | مـ | coefficient of friction | م with a joining stroke, so it is never the metre |
| π | ط | pi | universal |
| Δ | Δ | change | as usual |
| i, j | سٓ, صٓ | unit vectors | the letters of the two axes with a madda above, a hat Arabic faces can draw: U+0302 has no glyph in them, and Arabic books differ here |
| b, c, d, e, k, n, p | ب, حـ, د, ي, خ, ن, غ | lengths and unknowns | letters not otherwise taken |
| τ | ز with ط below | a stage's time | |
| A B C D E | أ ب جـ د هـ | points | the geometry book's order |
| O | و | the origin | as in Arabic geometry; in prose "النقطة و", so it never reads as "and" |
| P Q S X Y Z | ن غ ض خ ي ظ | points and particles | letters not otherwise taken |
| sin cos tan | جا جتا ظا | | universal |
| sec cosec cot | قا قتا ظتا | | |
| √ | √, mirrored | | its bar runs left from the sign |
| → | ← | | it points the way the line reads |

Letters in a product are set apart and never join into a word: 2 ت ف, ع₀ ز.

## Units

| Source | Arabic |
|---|---|
| m, s, h, min | م, ث, س, د |
| m s⁻¹, m s⁻² | م/ث, م/ث² |
| km, cm, km h⁻¹ | كم, سم, كم/س |
| kg, N, N s, J, W | كجم, نيوتن, نيوتن·ث, جول, واط |

## Names

SUVAT, Suvat: سوفات. Ask Suvat: اسأل سوفات. A-level: إيه ليفل. Edexcel: إدكسل. AQA:
إيه كيو إيه. OCR: أو سي آر. CIE: سي آي إي. WJEC: دبليو جيه إي سي. Google: جوجل.
Gemini: جيميناي. Cloudflare: كلاودفلير. PDF: بي دي إف.

Left in Latin on purpose, listed by `tools/verify/arabic-sweep.cjs`: an exam paper's
own code as printed on the paper (6677/01 M1), the keys of the keyboard (Ctrl K),
and "English" on the language button, the way back for someone who cannot read
the rest.

## Physics

| English | Arabic |
|---|---|
| projectile, projectile motion | المقذوف، حركة المقذوف |
| displacement, distance | الإزاحة، المسافة |
| velocity, speed | السرعة المتجهة (السرعة where the direction is not the point)، السرعة |
| initial, final velocity | السرعة الابتدائية، السرعة النهائية |
| launch speed, landing speed | سرعة القذف، سرعة الهبوط |
| acceleration, deceleration | التسارع، التباطؤ |
| time, time of flight | الزمن، زمن الطيران |
| greatest height, range | أقصى ارتفاع، المدى |
| angle of projection, launch height | زاوية القذف، ارتفاع نقطة القذف |
| gravity, gravitational field | الجاذبية، مجال الجاذبية |
| friction, coefficient of friction | الاحتكاك، معامل الاحتكاك |
| coefficient of restitution | معامل الارتداد |
| momentum, energy, impulse | كمية الحركة، الطاقة، الدفع |
| component, horizontal, vertical | مركّبة، أفقي، رأسي |
| resolve (a vector), vector | حلّل، متجه |
| free fall, at rest, from rest | السقوط الحر، ساكن، من السكون |
| thrown up, thrown down, dropped | قذف لأعلى، قذف لأسفل، يُترك |
| braking, parachute, canopy | الكبح، المظلة |
| symmetrical, positive, negative | متماثل، موجب، سالب |
| graph, gradient, velocity–time | رسم بياني، الميل، السرعة–الزمن |
| tension, normal reaction, resultant force | الشد، رد الفعل العمودي، القوة المحصلة |
| slope, particle, bearing | المنحدر، الجسيم، الاتجاه الزاوي |
| simultaneous equations, quadratic, trapezium | معادلتان آنيتان، معادلة تربيعية، شبه المنحرف |

## The app

| English | Arabic |
|---|---|
| scenario, values, flight (the third step) | موقف، القيم، الحركة |
| the working, worked solution, the engine | خطوات الحل، الحل بالخطوات، المحرّك |
| past papers, past-paper library, exam board | أسئلة الامتحانات، مكتبة أسئلة الامتحانات، مجلس الامتحانات |
| whiteboard, launch (the button), replay | السبورة، انطلاق، إعادة |
| chat, sign in, sign out, home | محادثة، تسجيل الدخول، تسجيل الخروج، الرئيسية |
| the stage, pane, boxes | المشهد، لوحة، الخانات |
