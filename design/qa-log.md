# Ask Suvat — the QA log

A running check-up of Ask Suvat. Each row has the question as a student would type
it, what happened, and the fix with its test (`test/question.test.mjs` unless
named). Readings come from Gemma on a local `wrangler dev`, never live Gemini. When
Gemma's daily allowance is used up, the reading is written by hand as Gemma
returns it and replayed through the chat with a canned reader.

Workers AI's 10,000 free neurons a day are shared with the live reader, so local
testing spends the live site's allowance too.

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

For the lead: on a laptop, beside the Display panel (a 436 px stage), the HUD's four cards cover most of the Two on a road scene and the well's figure.

Passed to helper one (figures, composer):
- a diver on the board, but a ball falls;
- `skateboarder` and `cat` are refused as figures;
- a rocket on "up" is a ball;
- a helicopter and a table have no place.
