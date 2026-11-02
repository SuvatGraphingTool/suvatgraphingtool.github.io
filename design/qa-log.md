# Ask Suvat — the QA log

A running check-up of Ask Suvat. Each row has the question as a student would type
it, what happened, and the fix with its test (`test/question.test.mjs` unless
named). Readings come from Gemma on a local `wrangler dev`, never live Gemini. When
Gemma's daily allowance is used up, the reading is written by hand as Gemma
returns it and replayed through the chat with a canned reader.

**The reader budget.** Workers AI's 10,000 free neurons a day are the live site's
allowance too: a local `wrangler dev` on Gemma spends exactly what real students
use. On 1 Nov, QA used it up, and students fell back to Gemini's 20 a day.
- No more than about 30 Gemma calls a day on QA. The rest belongs to users.
- Never a Gemini call.
- Once the allowance is gone, stop every reader call until 00:00 UTC. Until then, QA
  replays hand-written or saved extractions through `SUVAT.applyReading`, or through
  the chat with the reader's fetch stubbed.

## 1 November 2026

| Question | What happened | Fix |
|---|---|---|
| *(a composed scene with no parts)* | The strip read "This question has no parts. Each one stops the motion…" | No parts, no strip: `stripHTML` returns nothing and `renderParts` hides it. Test: zero-parts strip. |
| ball pushed off a 60 m cliff | The cliff was drawn, but the reply listed the paper's own (a)(b)(c), e.g. "greatest height above the ground: 60 m", which the student never asked. | A library reading with no parts gets none. Only an example ("surprise me") brings the paper's parts. |
| a stone is dropped down a well, hits the water 20 m below | Read as u = 0, θ = 0, it was refused: "give the angle as 90 (up) or −90 (down)". | A drop (u = 0) goes straight down whatever angle it was read with (`js/core/height.js`). Test: well drop. |
| *(any two-part question, on a laptop)* | Beside the Display panel the stage is 436 px wide. The strip wrapped one word per line and grew to 411 px tall, leaving the stage 150 px. | The strip lays out by its own width (a container query): chips and the next button on one row, the part under them. The strip is now 150 px and the stage 411 px. |
| sandbag dropped from a hot air balloon at 100 m rising at 4 m/s | Read flat (θ = 0), it was refused. | `toPlace` settles a well or balloon to straight up or down from the words: rising is up, descending is down, and a stone into a well goes down. Test. |
| diver jumps up off 10m board at 3 m/s | The plain pitch: "10m board" was not taken for a diving board. | "a 10 m board", "diver" and "diving" are the board. A whiteboard is not. Test. |
| ball pushed off a 60 m cliff *(read as platform, no u)* | "Still needed: the speed." The flight could not run. | Pushed, rolled or let go with no speed anywhere in the words, it starts from rest, and the reply says so. Never when a distance, time or speed is given or asked for. Test. |
| a stone into a well; a footballer's kick at 35°; vectors, "surprise me"; arc, road, a rocket in parts | Right scenario; every answer checked by hand (2.02 s, 19.8 m s⁻¹; 31.04 m, 5.43 m; t = 30 s, \|v\| = √2; 2.04 s, 35.31 m, 5.10 m; −6.25 m s⁻², 4 s; 81.55 m, 8.15 s). | — |
| two runners: A from rest at 2 m/s², B passes at a steady 6 m/s — when does A catch B, how far have they gone | Read with answer "time" and "distance", both parts said "Not one this app works out for you". The engine had them (6 s, 36 m). | A kind named for a key ("time" where the key is "meeting") and "when does … catch / meet / draw level" find the one meeting. Two on a road gains a distance answer: how far along the pass is. A speed asked "when it passes" is never given the time. Test. |
| hiya whats the capital of france | A friendly chat reply, no scene opened. | — |
| surprise me → a lift | The reply listed every number as "in the question", though the student asked none. | An example's numbers are labelled "from the paper". A ball let go with no speed shows u = 0 as "assumed · no speed was given". Checked in the page (app.js has no node test). |
| now make it 20 m (a follow-up), a cliff | Read afresh at 20 m: t = 2.02 s. | — |
| a person jumping off a 10 m board at 7 m/s *(the user)* | The reply and the strip showed (a)(b)(c) for a one-line question. | Parts only when the question is marked: the worker drops parts unless the typed words carry (a), a), (i), "part b" or "a 2 part question". A photo or PDF is trusted. The page gives an example's reading none either. The prompt says so, and its single-ask example lost its part. Test. |
| (a) a stone dropped from a 20 m tower: time? (b) now thrown up at 5 m/s from it: time? *(the user: "give me one scenario, then … an option to see the second one")* | One stage for both. | A part that changes the set-up carries `scene`: what it changes, or a whole reading. A composer `recipe` part counts too. (a)'s set-up opens first. The reply answers (b) in its own scene (2.59 s) with "Next: part (b)", and the strip's dashed (b) chip and "Next: part (b)" open it on the stage; the (a) chip goes back. One mechanism for the twelve, the library and the composer. Test. |
| every reading, Graph on and off *(the lead's check)* | A cliff, an arc, a composed car off a cliff and a two-set-up question each offered "Show me the flight/scene", and pressing it opened the stage. | — |

For the lead: on a laptop, beside the Display panel (a 436 px stage), the HUD's four cards cover most of the Two on a road scene and the well's figure.

Passed to helper one (figures, composer):
- a diver on the board, but a ball falls;
- `skateboarder` and `cat` are refused as figures;
- a rocket on "up" is a ball;
- a helicopter and a table have no place.

## 2 November 2026

Gemma's allowance was already spent when the day began: my first call came back `quota_exhausted`, and I made no more. Every reading below is hand-written as Gemma returns it, run through the worker's own pipeline in node (`toComposed(toPlace(toFigure(x)))`), then replayed in the page.

| Question | What happened | Fix |
|---|---|---|
| the user's own failures: a 60 m cliff; a 10 m diving board with no angle; a cliff with the ground below; "can you do vectors?"; (a)/(b) with two set-ups | Right place and object. The board has no parts and its angle is assumed straight up (15.66 m s⁻¹, 2.31 s). The cliff lands on the ground. "Next: part (b)" appears. Every reading shows its view button, with Graph on and off, and it opens the stage. | — |
| ball pushed off a 60 m cliff | The reply repeated itself with mismatched rounding: "t = (v − u)/a → t = 3.5 · t = 3.497 s in the air". | From a height drops the twelve's rearrangement rows and says each result once, with its unit (`js/core/height.js`). Test. |
| a train accelerates from rest to 20 m/s in 40 s, travels at 20 m/s for 2 min, then decelerates to rest in 30 s | Read the way a small reader writes it, with the held 20 in the hold stage's v2 and no v3. "Not enough to fix the journey yet." | The worker moves a held stage's speed to where the stage before it ends, and "to rest" ends the last stage at 0. Now 3100 m. Test. |
| a coin is flicked off a 0.8 m table at 2 m/s | "The engine works out the rest: nothing else was needed." There was no answer at all. | The twelve's reply says what the engine found: in the air for 0.4 s, lands 0.81 m out at 4.44 m s⁻¹, and its greatest height when it rises. Test. |
| a ball dropped from 5 m bounces keeping half its speed; two ships (example); a rocket straight up at 50 m/s | 9.90 m s⁻¹ and 1.25 m are right. The ships list the paper's values. The rocket is drawn as a particle, and the reply says so. | — |
| skater rolls off a 1.2m wall at 4 m/s, how far does he land | Composed as a skateboarder off a wall, with the right time and speed (0.49 s, 6.29 m s⁻¹), but the distance he lands out, which is what was asked, was never said. | From a height says how far out it lands, here 1.978 m, and says nothing of it for a drop. Test. |
| a lift: 1.5 m/s² for 2 s, steady 5 s, stops in 3 s; two cars at the lights, B 2 s later; braking from 30 m/s in 75 m | 22.5 m, 14.93 s and 6 m s⁻² are right. But the reply listed "g = 9.81, assumed · on Earth" for a lift and a road, where g plays no part. | g is said to be assumed only where the engine uses g (its kit offers one). Checked in the page. |
| tennis serve flat at 25 m/s from 2.5 m, net 0.9 m high at 12 m | Clears by 0.47 m and lands 17.85 m out, both right. | — |
| an apple falls from a branch 3.2 m up | Composed "off a wall": a branch is a tree. | Passed to helper one. |
| *(UI critic, via the lead)* the reply's value list and engine box | Rows were form labels ("Height it starts at (m): 20"). A "dropped" u = 0 was tagged "in the question". The engine box said t twice, gave v with no unit and wrapped badly on a phone. The eyebrow and box were orange. | Rows are set as maths (h = 20 m, θ = −90°, u_A = 0 m s⁻¹); choices and other boxes stay words. A number the student never typed is tagged "read from the wording" (ask.js passes the typed words; a photo passes none). Tags are right-aligned in a grid. The engine's results are a list, one sentence a line, and the twelve drop the rearrangements their flight sentence repeats. Eyebrow in ink, box in the neutral --secondary (css/shell.css). Test; checked on a phone. |
| *(re-check)* an apple from a branch; g on a lift | Composer milestone 5: the orchard's tree, and no g row for a lift. | — |
| a cyclist rides off a 4 m bridge at 6 m/s onto the road below; a kick at 18 m/s at 40°, (a)/(b); surprise me → a firework | 0.903 s, 5.42 m and 10.70 m s⁻¹; 2.36 s and 32.53 m (H 6.82 m); 43.4 m at 5 s. All right. One line said "Hits the road 5.418 m out". | It now says "Lands 5.418 m out". |
| ball A up at 15 m/s, B 1 s later at 20 m/s: when do they meet; a ball kicked up at 8 m/s at 30° from a 50 m cliff with ground below; what does suvat stand for | 1.68 s and 11.35 m up; 3.63 s, 25.13 m and 32.33 m s⁻¹; a friendly chat answer. All right. | — |
| a ball is dropped from 2 m and rebounds with half its speed, how high does it go after | Right motion, but the height asked for (0.5 m) was never said. Since parts appear only when marked, the parts a reader made up were dropped, and their answer keys with them. | The worker keeps what they ask as `asked`, with the keys. The reply answers each plainly, one line at the head of the engine's box, never as parts: "How high it goes after the bounce: H = 0.5 m". The twelve, the library and the composer all do this. Bounce gains the height after the first bounce as an answer. Test. |
| **Edexcel M1 June 2018 Q4, from a photo** *(the user: "actually embarrassing")*: 0.2 kg projected down at U from A, 2.5 m up; rebounds at 10 m s⁻¹; impulse 7 N s; (a) U (b) time from the bounce to first passing B, 1 m up (c) v–t graph A to B | "Not enough to run it yet": the engine had no impulse. The value list showed bare internal keys, "w = 10" and "y = 1" (my own row-symbol change). | The engine takes the mass and the impulse, a momentum step for a vertical bounce only: I = m(v_after + v_before) gives the impact speed 25, so U = 24. It is the working's first step, substituted. It also finds the rebound, or the impulse. `yAfter` is the first pass of B. Bounce gains answers for U, the time to B and the impulse. An Edexcel or M1 paper (the reader's new `paper`, or the words) takes the rubric's g = 9.8, tagged "Edexcel's value". "To B" stops the run at B. A graph part opens the stage's graphs. Only standard symbols (h u v s t a g θ) are set as equations; every other box says its own name. Display settings are not listed as given. Tests in question.test and library.test; StudyWell row 1 is now ticked fully. |
| **Edexcel M1 June 2014 Q3(c)**: the impulse on a 0.3 kg ball dropped from 2 m that rebounds to 1.5 m | "Out of scope". | The impulse step is `js/core/impulse.js`, `impulseLink`: I = m(v − u), solving for any one of m, I, u, v, with its working row. The bounce uses it; the builder can reuse it for kicks and catches. Bounce part (c) is real: 0.3(5.42 + 6.26) = 3.5 N s, in the bounce's working. StudyWell rows 1 and 6 are ticked fully. Tests. |
| *(re-check after the Worker deploy)* M1 June 2018 Q4 | (a) U = 24, (b) 0.11 s, (c) the graph, the run ending at B. | — |
| the lorry: passes A at u, B 10 s later at 34 m/s, AB = 240 m; (a) u (b) time from A to the mid-point | (a) 14 right. (b) said 10.00 s, the whole time: the part was read with answer "t", though the engine timed the mid-point at 6 s. | The road offers the time and speed at the mid-point or mark (`moment`). A "t" or "v" asked "to the mid-point" is that moment's. Test. |
| a ball at 20 m/s to just clear a 5 m wall 30 m away: the angle; a diver at 4 m/s at 30° from a 10 m board; forces on a slope; asdfghjkl | 36.18° or 63.29°; 1.646 s, 5.70 m out, 14.57 m s⁻¹; a chat reply for each of the last two. All right. | — |
| a parcel from a helicopter hovering at 80 m; a coin flicked off a 0.8 m table at 2 m/s; a balloon rising at 5 m/s lets go a sandbag at 60 m, (a)/(b); my cat jumps off a 1.5 m wall at 3 m/s at 40° | 4.04 s; 0.81 m out; 4.04 s and 34.67 m s⁻¹; 1.80 m out, drawn as a particle and said so. All right, in helper one's new air and table scenes. | — |
| a cyclist slows from 12 m/s to 4 m/s over 40 m, find the deceleration | "It asks for the deceleration", then no answer line: "deceleration" does not contain the word "acceleration". | A deceleration or retardation asked is the acceleration the engine found: a = −1.6 m s⁻². Test. |
| *(the user)* "a button to choose gravity … 9.81 and 9.8 and 10, and then just a text box" | — | A g button in the Ask Suvat box ("g 9.81"), with a frosted popover: three chips and a box for any positive value. It refuses 0, negatives and nonsense, and remembers the choice per viewer. The chosen g fills every reading whose question states none: the twelve, the library and composed scenes. It takes the place of Earth's 9.81 and of the Edexcel rule; a g in the question always wins. The reply tags it "your choice", "in the question", or "assumed · on Earth". `js/ai/gchoice.js`. Tests; checked in the page and after a reload. |
| *(g check)* a stone thrown up at 8 m/s from a 15 m bridge over a river, (a)/(b), with g 10 chosen; then "same but take g = 9.8" | 18.2 m and 2.71 s, g tagged "your choice"; 18.27 m and 2.75 s, g tagged "in the question". All right. But the follow-up tagged h = 15, typed one message earlier, "read from the wording". | The reply checks numbers against everything the student has typed in the chat (none after a photo). |
| surprise me with robots | The values read "t_{R,1} = 11 s" and "I part of where S starts": a symbol with two subscripts, and the vector i capitalised. | A box keyed to an object and a stage is said in words ("R · At time: 11 s"), and a name keeps its own case. Checked in the page. |
| a firework accelerates up at 6 m/s² for 3 s, max height | Not answered: the scenario offered no greatest height, and a reader's plain "height" matched neither of two heights. | The firework offers the greatest height, the time to it and the time to land. Of several answers of one kind, the one whose words the question shares is chosen; a tie is never guessed. Test. |

Passed to helper one: a composed reply lists none of the values it read, which library replies do; and the diver's reply says "it … where it was thrown from".

## Where it stopped (1 Nov, end of day)

The QA loop is paused because the user has gone home. Every fix above is on `redesign` and live; the last commit is def5123.
- Next, after 00:00 UTC, within the budget: real Gemma readings of the user's own failures.
  - "ball pushed off a 60 m cliff"
  - "a person jumping off a 10 m board at 7 m/s", which must now have no parts
  - "can you do vectors? / surprise me"
  - a question marked (a)/(b) whose part (b) needs a set-up of its own: does Gemma return `scene`?
- Then a coin off a table and a helicopter drop, after helper one's places land.
- Check the worker is deployed with the parts guard (`marked` in `worker/src/place.js`).
