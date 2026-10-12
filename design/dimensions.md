# Dimension sheet

Every object in the flight view, in metres. Generated from `js/world/dims.js`
by `tools/dimension-sheet.mjs` — if a number here is wrong, the renderer is
wrong too, because they read the same file.

**Axes.** Right-handed, origin at the centre spot on the pitch surface.
`x` runs along the pitch, −52.5 (west goal) to +52.5 (east goal). `y` is up,
and `y = 0` is both the pitch surface and the physics datum the ball lands on.
`z` runs across, −34 (north touchline) to +34 (south touchline).

**One deliberate disagreement.** The idealised projectile lands on flat ground
at `y = 0`. The podium plaza really is 1.5 m above that, so it is drawn at
1.5 m and the ball passes it rather than landing on it. Scenery is not allowed
to lie about its size and the physics is not allowed to notice the scenery;
the plaza is where those two rules meet. The 2D view draws the datum plane
right across the canvas, under the stands included, so the idealisation is
stated rather than hidden.

## The playing surface

| Object | Dimension | Value (m) |
| --- | --- | --- |
| Pitch | length × width | 105 × 68 |
| Goal line | at x | ±52.5 |
| Touchline | at z | ±34 |
| Line width | — | 0.12 |
| Centre circle | radius | 9.15 |
| Centre spot | radius | 0.11 |
| Penalty area | depth × width | 16.5 × 40.32 |
| Goal area | depth × width | 5.5 × 18.32 |
| Penalty spot | from goal line | 11 |
| Penalty arc | radius | 9.15 |
| Corner arc | radius | 1 |
| Mowing stripes | count × width | 8 × 13.125 |
| Goal | width × height | 7.32 × 2.44 |
| Goalpost | diameter | 0.12 |
| Goal net | depth, mesh | 1.8, 0.12 |
| Grass run-off | beyond touchline / goal line | 5 / 6 |
| Grassed area | length × width | 117 × 78 |
| Advertising hoardings | height × depth, panel | 1 × 0.25, 2.4 |
| Hoarding line | at z / at x | ±39 / ±58.5 |
| Technical area | length × depth × height | 8 × 2.4 × 2.2 |

Hoardings carry no brand of any kind: they are blank LED panels in a 2.4 m
rhythm. There is no club name, crest, bird, sponsor or kit colour anywhere in
this world, and the seating is a neutral grey so that no palette reads as a
team strip.

## The bowl

| Object | Dimension | Value (m) |
| --- | --- | --- |
| Bowl plan | length × width | 250 × 210 |
| Bowl plan | corner radius | 83 |
| North / south front row | at |z| | 42 |
| East / west front row | at |x| | 62 |
| North / south height | top of rear facade | 36 |
| West height | top of rear facade | 35 |
| East height | top of rear facade | 35.6 |

### North and south — three tiers and a ring of boxes

Front row at 42 m from the centre line; 63 m of depth behind it.
`d` is the outward distance from the front row.

| Element | d from | d to | y from | y to | Rows | Tread | Rise | Rake |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| lower tier | 0 | 17.6 | 1.2 | 10 | 22 | 0.8 | 0.4 | 26.6° |
| lower concourse | 17.6 | 20.2 | 10 | 10 | — | — | — | — |
| parapet | 20.2 | 20.2 | 10 | 11.1 | — | — | — | — |
| box glazing | 20.2 | 20.5 | 10 | 14 | — | — | — | — |
| boxes, roof deck | 20.5 | 30 | 14 | 14 | — | — | — | — |
| middle tier | 30 | 34.8 | 14 | 16.58 | 6 | 0.8 | 0.43 | 28.3° |
| middle rear | 34.8 | 36 | 16.58 | 25 | — | — | — | — |
| upper tier | 36 | 53.6 | 25 | 34.9 | 22 | 0.8 | 0.45 | 29.4° |
| rear facade | 53.6 | 63 | 34.9 | 36 | — | — | — | — |

### West — one steep tier

Front row at 62 m from the centre line; 63 m of depth behind it.
`d` is the outward distance from the front row.

| Element | d from | d to | y from | y to | Rows | Tread | Rise | Rake |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| single tier, lower block | 0 | 24 | 1.2 | 17.39 | 30 | 0.8 | 0.5396 | 34° |
| vomitory walkway | 24 | 26.5 | 17.39 | 17.39 | — | — | — | — |
| single tier, upper block | 26.5 | 50.5 | 17.39 | 33.58 | 30 | 0.8 | 0.5396 | 34° |
| rear facade | 50.5 | 63 | 33.58 | 35 | — | — | — | — |

### East — four tiers

Front row at 62 m from the centre line; 63 m of depth behind it.
`d` is the outward distance from the front row.

| Element | d from | d to | y from | y to | Rows | Tread | Rise | Rake |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tier 1 | 0 | 16 | 1.2 | 9.2 | 20 | 0.8 | 0.4 | 26.6° |
| concourse | 16 | 18.5 | 9.2 | 9.2 | — | — | — | — |
| parapet | 18.5 | 18.5 | 9.2 | 10.3 | — | — | — | — |
| box glazing | 18.5 | 18.8 | 9.2 | 13 | — | — | — | — |
| boxes, roof deck | 18.8 | 27 | 13 | 13 | — | — | — | — |
| tier 2 | 27 | 35 | 13 | 17.2 | 10 | 0.8 | 0.42 | 27.7° |
| tier 2 rear | 35 | 36 | 17.2 | 21.5 | — | — | — | — |
| tier 3 | 36 | 45.6 | 21.5 | 26.78 | 12 | 0.8 | 0.44 | 28.8° |
| tier 3 rear | 45.6 | 46.5 | 26.78 | 30 | — | — | — | — |
| tier 4, gallery | 46.5 | 54.5 | 30 | 34.6 | 10 | 0.8 | 0.46 | 29.9° |
| rear facade | 54.5 | 63 | 34.6 | 35.6 | — | — | — | — |

## The roof

A cable net on an elliptical compression ring, open over the pitch.

| Object | Dimension | Value (m) |
| --- | --- | --- |
| Outer fascia | top edge — the highest thing in the world | 48 |
| Outer fascia | bottom edge | 43 |
| Roof plane | at the outer structure line | 46.5 |
| Compression ring | top / bottom | 44 / 42.5 |
| Roof opening | the front row inset by | 2 |
| Roof opening | along the pitch × across it | 120 × 80 |
| Floodlight strip | height, width | 42, 1.2 |
| Cables | radial / hoop | 28 / 3 |

The opening is bigger than the pitch in both directions, so the whole pitch is
open to the sky and every seat is under cover.

## The podium

| Object | Dimension | Value (m) |
| --- | --- | --- |
| Podium plaza | plan, as a ring round the bowl | 330 × 280 |
| Podium plaza | height above the datum | 1.5 |
| Podium balustrade | height | 1.1 |

The podium is the last built thing in the model. Outside it there was a
district — a dual carriageway and its traffic, a west-side street, a rail
station, four car parks, four terraces of houses and two parks — and it has
been removed. It was there as scale reference, and on a cross-section it was
a few hundred point sprites that blinked out whenever the camera moved,
which at pitch level is the whole of a flight. The crowd does that job from
inside the frame.

## Scale references

Every one of these is a real measurement, drawn at that measurement. If one
of them looks small on screen, it is because it is small.

| Object | Dimension | Value (m) |
| --- | --- | --- |
| Football | diameter | 0.22 |
| Person | height × shoulder width | 1.8 × 0.45 |
| Floodlight mast | height | 46 |
| Goalpost | radius | 0.06 |

The ball is drawn at 0.22 m and nothing else. There used to be a 1.45
factor applied to it on screen so it would not be a speck at stadium
scale — a speck is found by the magnifier ring instead, and all the factor
did was make the ball half again too large when you zoomed in on it. Its
drawn radius is capped in PIXELS, which is a screen distance and so lives
in `js/render/util.js` rather than in this sheet.

## The far field

| Setting | Value (m) |
| --- | --- |
| Distance grid from | 1500 |
| Distance grid step | 500 |
| Distance grid out to | 4000 |

Past 1.5 km the ground carries a labelled distance grid rather than ending
at an edge, which is what makes `g = 0` and Moon gravity survivable: the
ball leaves the world and there is still something to measure it against.

## Level of detail

Thresholds are in metres of VISIBLE WIDTH. Each feature fades out over the
last quarter of its range, so nothing pops.

| Band | Visible width (m) |
| --- | --- |
| pitch | up to 30 |
| stadium | up to 300 |
| wide | up to 2000 |

| Feature | Gone by (m) |
| --- | --- |
| netMesh | 260 |
| flags | 460 |
| boardPanels | 260 |
| pitchLines | 900 |
| seatRows | 130 |
| seatTexture | 440 |
| roofCables | 950 |
| floodDetail | 760 |
| grassStripes | 1000 |

## The numbers the brief asks the world to honour

| Check | Metres | What it lands level with |
| --- | --- | --- |
| 14 m s⁻¹ straight up reaches | 9.99 | the back of the lower tier at 10 m |
| 31 m s⁻¹ straight up reaches | 48.98 | clears the roof at 48 m |
| 20 m s⁻¹ flat from 25 m travels | 45.2 | lands on the pitch, 1.2 m inside the north touchline |
| 25 m s⁻¹ at 45° travels | 63.7 | a goal kick, landing in the far half |
| 28 m s⁻¹ at 30° and at 60° both travel | 69.2 | apexes 10.0 m and 30.0 m |
| 28 m s⁻¹ at 45° from 25 m peaks at | 44.98 | 3 m under the roof at 48 m |

## Where each scenario starts

| Scenario | Launch point (x, y, z) | Section | Place |
| --- | --- | --- | --- |
| Thrown straight up | (0, 0, 0) | across the pitch, south | The centre spot |
| Simple arc | (-52.5, 0, 0) | along the pitch, east | A goal kick from the west goal line |
| Dropped | (0, 80, 0) | across the pitch, south | A camera drone, 80 m above the centre circle |
| Thrown straight down | (0, 45, -41) | across the pitch, south | The roof edge, at the inner compression ring |
| Down and off a platform | (0, 25, -78) | across the pitch, south | Front row of the north upper tier, 25 m up |
| Off a platform | (0, 25, -78) | across the pitch, south | Front row of the north upper tier, 25 m up |
| Up and off a platform | (0, 25, -78) | across the pitch, south | Front row of the north upper tier, 25 m up |
| Time above a line | (-52.5, 0.9, 0) | along the pitch, east | A clearance from the west goal line |

