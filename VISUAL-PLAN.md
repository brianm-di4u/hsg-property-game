# Bathhouse Barons: visual plan

Visual enhancement campaign, 2026-10-29. Baseline: `screenshots/visual-before` (83/83 passing). Benchmarks and the
independent baseline review are in `benchmarks/` (git-ignored): `SOURCES.md`, `REVIEW-before.md`.

## Baseline review (3.8 / 10)
| Art | Lighting | Animation/feel | UI | Type | Readability | Mobile | Authenticity |
|---|---|---|---|---|---|---|---|
| 3 | 1.5 | 3 | 5 | 5 | 4 | 5 | 5 |

The top gaps, in the reviewer's order:
1. It doesn't read as a game on a table.
2. The centre is wasted on a logo and brick wallpaper.
3. Ownership is unreadable.
4. Buildings can't be counted.
5. Icons are generic and repeated.
6. Dice and moves have no weight.
7. Events are toasts that cover the tiles.
8. Cards and dialogs are plain web modals.
9. The player panel reads as a spreadsheet.
10. Type is small.
11. Mobile clips names and wastes space.
12. Overlays hide text.

To keep: the cited history with its separate "game effect" box, real lot names, season chips, district hatch patterns,
keyboard hints, settings, the month dial and the ledger.

## Direction: a 3D table scene over a painted 2D board, with the 2D board as the fallback
- **Why 3D for the table and pieces.** The top benchmarks (the official 3D adaptation, Catan Universe,
  Carcassonne) win on a lit physical table: real piece shadows, dice that tumble, a camera that leans in. Pre-rendered
  sprites get part of the way, but a tilted camera that frames the active quarter of the board is also the best fix for
  small text on phones. A board game's scene is light: one textured board slab, at most 6 tokens, 2 dice and 88
  buildings, which is cheap even on phones.
- **Why the board face stays 2D.** All board text, art and state live in a 2D canvas, the existing renderer, upgraded.
  It is drawn at 2048 px and used as the board slab's texture, so text stays crisp, the
  layout logic is reused and the 2D board stays a complete fallback.
- **Fallback.** The 2D canvas board is used when:
  - there is no WebGL;
  - the GPU is a software renderer (SwiftShader: the test harness and low-end machines);
  - `?gl=0` is set;
  - the frame-time watchdog trips.

  The 2D board gets the same art (painted spaces, map centre, table, Blender-rendered sprites for pieces and dice), so it
  is a real game too, not a placeholder.
- **Panels stay HTML:** turn bar, actions, player cards, ledger and dialogs.

## Assets
**Codex paintings** (1930s lithographed board-game print style; pilots `pilot-vig-fordyce`, `pilot-vig-ostrich`)
- **Space vignettes:** 31, one per space. Each lot gets a picture of its real place:
  - the Fordyce's lozenge brick, the Buckstaff's seven bays, the Hale's Mission parapet;
  - the 1924 Arlington's twin towers, the Eastman, the Majestic;
  - the Ostrich and Alligator Farms, the IQ Zoo;
  - three ballparks, the Pythian, the Woodmen of Union, the Vapors and the Southern Club;
  - motor courts, a narrow-gauge Diamond Jo train, a streetcar, the water works and the thermal spring.

  These replace the repeated line icons; the icons stay in the vector fallback (`?art=0`).
- **Surfaces:** honey-oak card-table top (landscape and portrait, after the Bathhouse Row parlour card table in the
  Highsmith LOC photo), and 1930s linen board stock.
- **Centre map:** a period pictorial map of Hot Springs repainted by Codex from our own geographic base map.
  - The base is built from public data:
    - USGS 3DEP elevation (hillshade);
    - Census TIGER streets, filtered to the historic grid;
    - USGS NHD creeks;
    - the Bathhouse Row footprints;
    - the cited anchors in `research/map-anchors.json`.
  - Every lot has a pin at its real location (or "approximate" where the record is narrative only). Owned lots fly
    their owner's flag on the map. Labels are drawn in code, not painted.
- **Cards:** Headline cards become a period newspaper with an original masthead and a themed engraving (about 10
  themes: fire, flood, racing, ballpark, bath, rail, raid/reform, festival, preservation, hotel). Town Talk cards
  become linen postcards. Card backs are painted.
- **Title:** a box-lid illustration with the title set in code.

**Blender** (`art-src/blender/pieces.py`)
- **Tokens:** six die-cast tokens in candy-coloured metal on enamel bases in the seat colour: mineral-water jug,
  clawfoot bathtub (was a top hat; replaced after the final review), lucky horseshoe, parasol, Quapaw sculpin, Hot Springs streetcar. Shape and seat number keep identity from
  depending on colour alone.
- **Buildings:** three bathhouse pieces after real Row facades:
  - level 1: the Hale (Mission parapet, red-tile hip);
  - level 2: the Ozark (twin stepped towers);
  - level 3: the Quapaw (tile dome and cupola);

  and a Grand Resort after the 1924 Arlington (twin towers with pyramid caps).
- **Dice and coins:** ivory dice with recessed red pips, and a gold coin.
- **Two outputs from the same script:**
  - GLB meshes, base64-embedded for the 3D scene;
  - sprites with separate baked shadows (`tools/build-sprites.mjs` builds the `pieces.webp` atlas) for the 2D board.

**Code and shaders**
- **3D scene:**
  - lighting: a warm key light (one shadow map, 1024, pieces only), a hemisphere fill and a soft vignette;
  - surfaces: a lamp-pool gradient baked into the table texture; the board slab has bevelled edges and a printed
    side band.
- **Dark "Neon night" theme:** a lighting change (dim lamp, cool fill, neon-edged board trim), not a palette swap.
- **Game feel:** dice thrown across the board with scripted tumbles (no physics engine) that land on the rolled faces;
  tokens hop with a landing squash; buildings drop in with a steam puff; coins fly from payer to payee; Headline cards
  fly from the deck and flip; the camera leans toward the moving token.

**Typography.** Vendored OFL fonts as base64 CSS (works on file://):
- a Deco display face for headings and the masthead;
- a condensed sans for board labels, which fits full names at 11–13 px;
- a serif for fact text;
- tabular figures for money.

## Research additions
- `research/map-anchors.md` / `.json`: coordinates and sources for every space's real place: Pythian, Woodmen,
  Vapors, Majestic, Eastman, the Ostrich Farm, the Alligator Farm, the IQ Zoo, the depots, the streetcar route, the courthouse, the
  Free Bathhouse. It also lists the historic maps (Sanborn, the 1888 perspective view, early USGS quads) and how the old
  street layout differs from today's.
- Reused, with credit: `games/trivia/research/geo-anchors.json` (Bathhouse Row order and footprints, hotels, ballparks).

## Performance plan
- **Targets:** 60 fps on a mid laptop and 30+ on phones.
  - Render on demand: the rAF loop runs only while something moves or the camera eases.
  - The board texture is redrawn only when board state changes.
  - Pixel ratio is capped at 2 (1.5 on phones).
  - Shadows are only on moving pieces and buildings.
- **Loading:** first paint is the HTML title (no art needed). Art and three.js load progressively behind the title.
  `isIdle()` stays false until the needed art has decoded.
- **Download:**
  - three.js tree-shaken, about 550 KB;
  - painted art about 1.2 MB WebP;
  - pieces atlas about 170 KB plus GLBs about 200 KB;
  - fonts about 100 KB.

  The total is about 2.3 MB, with `index.html` itself under 1 MB.
- **Fallbacks:** the software-GL and no-WebGL detection described above, plus a frame-time watchdog (median frame over
  35 ms for 2 s switches to 2D, with a notice). Reduced motion keeps the 3D view but skips camera moves and tumbles.

## Test plan
- **All 83 existing tests keep passing at both viewports.** They run on the 2D board, because the harness has software
  GL. The `spaceAt` helper uses a new `__game.spaceScreen(i)` hook, so taps hit the right space in either view.
- **New tests:**
  - `visual.test.mjs`: art and fonts loaded, the manifest matches, no 404s, `?art=0` fallback, mortgaged lots keep
    readable names, buildings drawn as sprites, the map pins exist for every lot.
  - `board3d.test.mjs` with `?gl=3d`: the scene builds, raycast picking opens the right deed, the board texture updates
    on a buy, dice land on the rolled faces, the camera returns to overview when idle, the fallback switches on a
    forced watchdog.
- **Tools:**
  - `tools/check-file-url.mjs`: opens the game from disk, checks fonts, art and the 3D scene, and expects zero external
    requests.
  - `tools/shots3d.mjs`: real-GPU screenshots and fps (headless Chromium with ANGLE/D3D11).
  - `tools/before-after.mjs`: before/after sheets.
- **Every milestone:**
  1. run the full suite;
  2. take screenshots at both viewports, plus the GPU shots of the 3D view;
  3. inspect every image;
  4. rerun the independent reviewer against the benchmarks.

## Milestones
1. **vis-m1, art on the 2D board:**
   - table and board stock;
   - painted vignettes;
   - new space layout with full names;
   - fonts;
   - ownership bands and flags;
   - building and token sprites;
   - mortgage treatment;
   - centre map with pins, calendar plaque and deck piles.
2. **vis-m2, 3D table scene:** the board texture on a slab, GLB pieces, lighting, picking, camera, dice, and the
   fallback switch.
3. **vis-m3, game feel:** dice throw, hops, coin flights, building drop-ins, card fly-and-flip, newspaper and postcard
   cards, deeds, auction paddles, the camera follow on phones, and the event strip in place of the board toasts.
4. **vis-m4, chrome:** player cards, turn bar, title box lid, setup tokens, game-over podium, dark theme as lighting.
5. **Performance pass, then visual-final.**
