# Bathhouse Barons: visual report

Visual enhancement campaign, 2026-10-29. The plan is in [VISUAL-PLAN.md](VISUAL-PLAN.md).

Review record: `screenshots/visual-before`, `vis-m1` … `vis-m4`, the real-GPU sets `vis-m1-3d` … `vis-m4-3d`, and
the finals:
- `visual-final`: the full suite on the real GPU, so the 3D table;
- `visual-final-2d`: the full suite on software GL, so the flat-board fallback;
- `visual-final-file`: the full suite from file://;
- `visual-final-3d`: the extra real-GPU shots and fps.

Each set has contact sheets, and the finals have before/after sheets. The independent reviews are in `benchmarks/`
(git-ignored): `REVIEW-before.md`, `REVIEW-m1.md`, `REVIEW-m3.md` and `REVIEW-final.md`. Nothing is committed.

The campaign ran in the original monorepo (`games/property-game/`). This repo is that folder as a standalone
repository: paths below are relative to the repo root, and the harness lives at `shared/test-harness/`. The
coordinator's review fixes (`coord-review`) are under [Fix pass after the coordinator review](#fix-pass-after-the-coordinator-review).

## What changed

**The board is a printed 1930s game on an oak card table.**
- **Two renderers, one board.**
  - On a real GPU it is a three.js 3D table (`src/js/board3d.js`, three.js r186 vendored and tree-shaken): a bevelled
    board slab on the oak table under a warm table-lamp spot with soft-edged shadows (filtered PCF, radius 4), a light
    varnish sheen on the board, and
    Blender die-cast pieces as meshes.
  - On software GL, with no WebGL, with `?gl=0`, or when the frame watchdog trips, the same board draws as a flat
    canvas on the same table. The flat board uses the same art, with pre-rendered Blender sprites and baked shadows for
    the pieces.
  - The 3D board's face is the 2D renderer drawn into a 2048-px-wide texture, so the layout, the text and the
    hit-testing logic are shared. On phones the face uses the 2D board's tall phone layout (sized for a 390-px screen,
    drawn at 2048 device px across), so names and prices read as on the flat board.
- **A painted picture on every space.** 31 original vignettes in one 1930s lithograph style replace the repeated line
  icons, each of the real place:
  - the Fordyce's lozenge brick, the Buckstaff's seven bays, the Hale's Mission parapet;
  - the 1924 Arlington's twin towers, the Eastman, the Majestic;
  - the Ostrich and Alligator Farms, the IQ Zoo, three ballparks, the Pythian and Woodmen of Union on Malvern Avenue;
  - the Southern Club, Ohio Club and the Vapors, the Park Avenue motor courts, the narrow-gauge Diamond Jo and a streetcar.

  The vector icons remain as the `?art=0` fallback.
- **A period map of the real valley in the centre.**
  - `art-src/map/build_base.py` plans Hot Springs from public data: USGS 3DEP elevation, TIGER streets limited to the
    historic grid, NHD creeks and lakes, and OSM Row footprints and the Oaklawn track.
  - Codex repainted that plan as a 1930s pictorial tourist map with the geography kept in place.
- **Every lot has a pin at its real location** (`src/js/geo.js`, sources in `research/map-anchors.md`).
  - Owned lots fly their owner's numbered pennant on the map.
  - Highlighting a lot names its place.
  - Sites known only from narrative accounts are dashed and labelled "Site of … (approximate)".
- **Map furniture is drawn in code:** captions, a compass, a one-mile scale bar, season pennants pinned where each
  season happens (Oaklawn, Central Avenue, the ballparks…), a brass month dial, Headline and Town Talk decks with
  painted backs, the live Gazette prop, and a felt dice tray.
- **Readable ownership.** Each owned lot has:
  - a plaque on its outer edge in the seat colour, with the seat number and token glyph (never colour alone);
  - a tint of the owner's colour over the name;
  - a coloured frame.

  Hovering a baron's card lights up all their lots. A mortgaged lot gets a "MORTGAGED" ribbon across its picture only,
  so the name and price stay readable, and its season badge is hidden.
- **Countable buildings.** The pieces stand in the district band, one slot each, with roofs that tell them apart:
  - level 1: the Hale, Mission parapet and red tile;
  - level 2: the Ozark, twin stepped towers and green tile;
  - level 3: the Quapaw, a teal dome on tan brick;
  - Grand Resort: the 1924 Arlington, twin towers on a big block.

  They drop in with a bounce and a steam puff.
- **Type.** One name size per side of the board, the largest at which every name fits in condensed capitals, so full
  names show on desktop.

**Pieces and game feel** (Blender: `art-src/blender/pieces.py`)
- **Six die-cast pewter tokens on enamel bases in the seat colour:** a mineral-water jug, a clawfoot bathtub, a lucky horseshoe,
  a parasol, a Quapaw sculpin and a Hot Springs streetcar. The same script exports the 3D meshes (quantized, inlined)
  and renders the 2D sprites with separate shadow passes (`tools/build-sprites.mjs` packs `assets/pieces.webp`).
- **Dice.** Ivory dice with recessed red pips are thrown from the table edge, tumble through pre-rendered frames (or
  real rotation in 3D), bounce and settle in the tray on the rolled faces.
- **Tokens** hop space to space with a landing squash; their contact shadow stays on the board as they lift.
- **The 3D camera** leans toward the moving token and eases back. On phones it rests in a close-up of the current
  baron's side of the board, clamped so the board fills the view. The top-bar button switches to the whole board.
- **Money moves.** Coins fly from payer to payee (from the centre for the bank), slab-type amounts rise, and the
  baron cards' cash counts up or down in green or red.
- **Drawn cards** lift off their deck, fly to the centre and flip before the card opens.
- **While a move plays**, the panel says "Moving… tap the board or press Space to skip". A tap finishes the move in
  about 0.1–0.3 s.
- **Panel messages** go to a one-line event slip in the panel, never over the board.

**Cards and screens**
- **Headlines** are a page of *The Barons' Gazette* (the game's own newspaper; the card says so):
  - an Abril Fatface masthead and dateline;
  - a sepia newspaper engraving per theme (10 engravings: fire, flood, racing, the bath hall, the park, the army, a
    raid, the depot, the dam, 1880s ballplayers);
  - the sourced fact and the labelled game effect.
- **Town Talk** cards are linen postcards with a 2¢ stamp and a vignette. Both cards are the dialog itself, with no
  second frame.
- **Deeds** have:
  - the district colour band and a slab-serif name;
  - the space's painting;
  - a right-aligned rent ladder;
  - a "U.S. LEASE" seal on Bathhouse Row leases.
- **Auctions** show the lot's picture and round bid paddles.
- **Phones:** dialogs rise as bottom sheets, so the top of the board stays visible.
- **The six AI personas have painted cameo portraits**, and human players a hat-and-coat silhouette. They appear on the
  baron cards (with a small fan of owned lots), in the turn bar, at setup and on the podium.
- **Title:** a box-lid painting of a magnolia avenue of bathhouses below the mountain and its steel lattice tower,
  with the wordmark set in code.
- **Game over** is an "Extra!" edition of the Gazette with the winner's portrait and token on a brass plinth.
- **Every screen sits on the oak table.**
- **Fonts:** vendored OFL Barlow Condensed, Alfa Slab One, Libre Caslon Text and Abril Fatface, as base64 CSS so they
  load from file://.
- **Neon night theme:**
  - 3D: a lighting change, with a dim cool lamp and a gold-only palette;
  - flat board: a navy wash with pink neon round the three Clubs;
  - printed cards keep their own paper and ink.

**Kept from the original build:** every rule, the AI, saves (format unchanged), all 83 original tests, the sourced
fact on every card and deed with its "Game effect"/"Game price" labels, season chips, district hatch patterns,
keyboard play and the settings.

## Review scores (independent reviewer, benchmarked against top commercial and web board games)

| Category | Before | m1 | m3 | Final 3D | Final 2D |
|---|---|---|---|---|---|
| Art | 3 | 6.5 / 6 | 7 / 7 | 7.5 | 7.5 |
| Lighting and materials | 1.5 | 5 / 3 | 5.5 / 4 | 6 | 4.5 |
| Animation and game feel | 3 | 5 / 4 | 5 / 4.5 | 6 | 5.5 |
| UI | 5 | 5.5 | 6 | 6.5 | 6.5 |
| Typography | 5 | 6 / 6.5 | 6.5 | 6.5 | 6 |
| Readability | 4 | 5 | 5.5 / 5 | 6.5 | 6.5 |
| Mobile | 5 | 5 / 4.5 | 6 / 5 | 6 | 5.5 |
| Authenticity of setting | 5 | 7.5 | 8 | 8 | 8 |
| **Overall** | **3.8** | **5.5** | **6.0** | **6.6** | **6.1** |

Benchmarks (`benchmarks/SOURCES.md`, review only):
- the current official 3D adaptation of the classic property game (desktop and mobile);
- a mobile casual property game;
- Rento Fortune;
- Ticket to Ride, Catan Universe, Wingspan and Carcassonne (digital);
- richup.io.

## Tests

After the fix pass (this repo, final build, 2026-10-29):

| Run | Result |
|---|---|
| `node shared/test-harness/run.mjs . --gpu --file-url --milestone fix-gpu` (3D table on the RTX 5060, every test from file://) | **93/93** |
| `node shared/test-harness/run.mjs . --milestone fix-2d` (software GL: flat-board fallback) | **93/93** |
| `node tools/check-file-url.mjs` (file://, harness Chromium and installed Chrome on the GPU; fonts, art, a played game, no external requests) | 4/4 |

One earlier software-GL run on an intermediate build failed one check: in `input.test.mjs` "keyboard-only", the pause
menu was open after Esc. It passed alone 3/3 and in both final runs. The fix pass did not touch keyboard or dialog
code, so this is recorded as an intermittent timing failure under machine load. Contact sheets:
`screenshots/fix-gpu/before-after/` (against `coord-review`) and `screenshots/fix-2d/sheets/`; every changed screen
was inspected at both viewports.

At the end of the campaign (monorepo, `games/property-game`):

| Run | Result |
|---|---|
| `--gpu --milestone visual-final` (3D table on the RTX 5060, both viewports) | **93/93** |
| `--milestone visual-final-2d` (software GL: flat-board fallback) | **93/93** |
| `--file-url --milestone visual-final-file` (every test from file://) | **93/93** |
| `tools/check-file-url.mjs` | 4/4 |
| `tools/check-facts.mjs` | 78/78 facts verified |

**Test coverage.** 93 tests: the 83 originals plus 10 new ones. The fix pass added a check to an existing test: the
first `visual.test.mjs` test now also byte-compares `assets/art-data.js` with `assets/*.webp`.
- **`visual.test.mjs`:**
  - art, fonts and the manifest;
  - the built-up board;
  - the `?art=0` vector fallback;
  - dice land on the rolled faces;
  - tap-to-skip.
- **`board3d.test.mjs`:** forced 3D in the harness: real clicks pick spaces through the perspective camera, the camera
  settles after a roll, and the fallback switches.

**Changes to existing tests:**
- `helpers.spaceAt` now asks the game (`__game.spaceScreen(i)`), so taps land in either view.
- `perf.test.mjs` measures size without `fetch`, so it passes under file://, and now also checks art loading.

Every final screenshot was inspected through the contact sheets, with full-size checks of the built-up board, mid-move
frames, cards, deeds, auctions, the title, game over and the dark theme, at both viewports. The real-GPU 3D shots
(`tools/shots3d.mjs`) were inspected at full size and in 2× close-ups (`tools/zoom3d.mjs`).

## Performance
| Measure | Desktop | Phone (390×844) |
|---|---|---|
| 3D, RTX 5060, 4 AI barons animating (fix pass, `tools/shots3d.mjs --fps`) | 58.5 fps, 0.5 ms median render | 59.0 fps, 0.5 ms |
| 3D, harness `--gpu --file-url` perf test (fix pass) | 58.6 fps | 58.2 fps |
| 3D, RTX 5060, 4 AI barons animating (campaign) | 59.2 fps, 0.7 ms median render | 58.3 fps, 0.4 ms |
| 3D with 4× CPU throttle | 59.3 fps, 2.3 ms | 58.5 fps, 2.0 ms |
| Flat board, harness (software GL) | 60.1 fps | ≈58–60 fps |
| JS heap, served over http (3D: `tools/shots3d.mjs`; flat: harness) | 10.3 MB 3D, 10.7–12.1 MB flat | 10.8 MB 3D, 13.6 MB flat |
| JS heap, from file:// with the 3D table (harness `--gpu --file-url`) | 16.3–18.4 MB | 17.4–18.4 MB |
| Hooks ready / painted art decoded | ≈60 ms / 250–345 ms | same |

- **Why the heap is higher from file://.** The coordinator measured 17–18 MB, against 9.5–14.5 MB here before.
  That run used `--file-url`, where the game also loads `assets/art-data.js`: the board images as data-URL strings
  (2.5 MB of source, held as JS strings), which WebGL needs there instead of local image files. Served over http the
  same build measures 10–14 MB. The fix pass re-measured both (2026-10-29, fix pass).
- **Render on demand in both views.** The rAF loop runs only while something moves or the camera eases. The board
  texture is redrawn only when the board state changes (keyed on lots, month, Headline, cursor, theme).
- **3D limits:** pixel ratio capped at 2, and 1.5 on phones; a 2048 shadow map, 1024 on phones.
- **Fallbacks:**
  - software GL, no WebGL or `?gl=0` → the flat board;
  - a frame watchdog (median frame over 34 ms) switches to the flat board with a notice.
- **First paint** is the HTML title. Only the 38 board images are preloaded; card engravings, portraits and the title
  lid are plain `<img>` tags.
- **Download:** about 3.8 MB in all. `index.html` is 1.16 MB: three.js 0.55 MB, piece meshes 0.36 MB, game code.

| Asset | Size |
|---|---|
| `assets/*.webp` (57 images) | 2.6 MB |
| `assets/fonts.css` | 0.17 MB |
| `assets/art-data.js` (the board images as data URLs, loaded only under file://, where WebGL refuses local image files) | 2.5 MB |

The final review (`benchmarks/REVIEW-final.md`) scored **6.4 overall** (3D 6.6, 2D 6.1), up from 3.8. Art and
authenticity are at 7.5–8.

It named four MAJOR gaps. Three were addressed after the review and re-verified with the full suite (93/93 on GPU,
software GL and file://), but not re-scored:
- **Top hat.** The original token set had a top hat, the genre leader's signature piece. It is replaced by a clawfoot
  **bathtub** token (the Running of the Tubs) in Blender, the 2D glyph and the data. Saves are unaffected, since tokens
  are stored by index.
- **Phone cameras.** The close-up sliced tiles and dice. Phones now start on the whole board, and the close-up is an
  opt-in via the view button. On desktop the move camera still crops the side columns briefly while it leans in.
- **Baron identity.** Human seats shared one silhouette; they now show their own token. Every portrait has a
  seat-colour ring, so duplicate personas differ.

## Fix pass after the coordinator review
The coordinator's review (`screenshots/coord-review`, 93/93 with `--gpu --file-url`) found that desktop held up and
phones did not. The fixes below were made in this repo, most important first:
1. **Phone setup.** Each seat is now a baron card: a portrait with a seat-colour ring, the name field, and the
   Human/AI toggle in an auto-width column. On phones the toggle and the personality get their own row. The persona's
   blurb wraps under the name instead of being cut inside the select, and human seats have no disabled personality
   select. `src/js/main.js` `screenSetup`, `.seat` rules in `src/styles/main.css`.
2. **Phone card buttons.** The OK button on the Gazette and Town Talk cards was half off-screen. The phone sheet's
   button row now sticks at `bottom: 0` and carries the safe-area inset in its own padding. Card dialogs scroll inside
   the sheet instead of overflowing it.
3. **Token icons** in the turn bar, baron cards, setup and game over. They were a black blob because
   `assets/art-data.js` (the file:// copy of the art) still held the piece atlas from before the bathtub token, so every
   frame was read from the wrong place. That is why `?art=0` was fine and only file:// showed it.
   - Regenerated the file.
   - `tools/build-sprites.mjs` now refreshes it.
   - `visual.test.mjs` byte-compares every embedded image with `assets/*.webp`.
   - The icon also draws the piece alone, fitted to its own bounds, so the game-over plinth no longer crops the
     streetcar.
4. **Phone 3D board.**
   - The face is drawn with the 2D board's phone layout (a tall board about 0.95 × screen width, drawn at 2048 device px
     across). Names and prices read at the flat board's sizes instead of ~5 px.
   - The slab takes the face's aspect, so it uses the spare height.
   - The camera is flatter (pitch 0.12) so the board fills the width.
   - The varnish sheen is turned down on phones (seen from overhead it mirrored the lamp).
   - The table keeps one height per screen and game, so turn-bar text changes never rebuild the face.
5. **Duplicate first names.** Phone baron cards show first names. Where two barons share one, the card shows the
   first and last word instead ("Player 1" / "Player 2", "Jack Tolliver" / "Jack II").
6. **Turn bar overflow.** The game length ("Month 1 of 12", "3-year game") moved out of the month title into a dashed
   chip in the season row, so the title never wraps. On phones the chips wrap instead of sliding under the view button.
7. **`?art=0` title contrast.** The top bar has its surface background in 3D mode too, so the month title is no
   longer dark on the dark table.
8. **Shadows.** three.js r186 removed `PCFSoftShadowMap` (it warned and fell back). The renderer now asks for
   `PCFShadowMap`, which in r186 filters over `shadow.radius` (4), so the shadows stay soft-edged with no warning.
9. **Small items.** The game-over streetcar crop is fixed (see 3). Desktop setup no longer cuts blurbs or shows a
   disabled select on human rows. The short-game label is "Short: 12 months" and the setup toggles don't wrap.
10. **Wording.** The jail corner's subtitle and help text say "Passing through" instead of the genre leader's wording.
11. **Font licences.** The four `vendor/fonts/OFL-*.txt` files are now each family's upstream `OFL.txt` from
    `github.com/google/fonts`, with the real copyright holders: TypeTogether, the Alfa Slab One Project Authors, the
    Barlow Project Authors and the Libre Caslon Text Project Authors. Provenance is noted in `SAMPLES.md`.
12. **Heap.** See Performance: 18.4 MB is the file:// figure.

**Also, from the remaining MAJOR gap (off-board screens):**
- Auctions show each bidder with a portrait and a status paddle (In / Bidding… / High bid / Out), with the high bid on a
  brass plaque.
- Trades pick lots as small deed tiles (district band, picture, name, price), with both barons' portraits on their
  columns.
- Incoming offers show the offering baron's portrait and the lots as tiles.

## Known gaps
Still open after the fix pass (none re-scored by the reviewer):
- **Off-board screens are partly upgraded** (was the review's fourth MAJOR gap). The setup seats are now baron cards
  with portraits, auctions have bidder paddles and a brass high-bid plaque, and trades pick lots as small deed tiles.
  The setup options (length, rules, seed) are still plain segmented buttons and selects, and game over is a newspaper
  masthead over a results table. The "Game price" and "Game effect" pills are kept on purpose: the project labels game
  logic separately from sourced history.
- **3D buildings read as small slabs at board scale.** Their roofs (red tile, green tile, teal dome, twin towers) only
  read in close-up.
- **Lighting is good but flat next to the benchmarks:** no ambient occlusion in the tile seams. On phones the board's
  varnish sheen is turned down (an almost overhead camera would mirror the lamp across the map). On the flat board the
  dark theme's Club neon is a thin line.
- **Seasons** change the lamp's colour temperature and pin pennants on the map; there are no seasonal props.
- **Phone boards use short names** ("GATORS", "MOTOR CTS") on the side columns, in 3D now as well as 2D, because they
  share the phone layout. The deed, the close-up and the cursor tooltip give the full name.
- **A payment frame was never captured in a screenshot**, though the coin flights and counting cash are in the game.
- **Duplicate personas** in 5–6 seat games share a portrait (six portraits for six personas). Their names differ
  ("Jack Tolliver II"), and the seat-colour ring and token tell them apart.
- **Phone close-up framing.** The camera is clamped to the board, but the close-up can still cut the first tile of the
  next side. The whole-board button is the remedy.
- **Audio and screen readers** were still not checked by a person.
- **Timing measurements.** fps was measured headless on a shared, loaded machine; per-frame render time is the steadier
  figure.

## New research and sources
`research/map-anchors.md` / `.json` add sourced coordinates, addresses, years and confidence for:
- the Pythian (415 Malvern, from the address);
- the Woodmen of Union (501 Malvern, NRHP);
- the Pleasant Street Historic District (NRHP boundary);
- the Vapors (315 Park, on the Phillips Drive-In site);
- the Majestic site (101 Park);
- the Eastman (the federal building site);
- the IQ Zoo (**380 Whittington Ave**, 1955 to about 1990, not Central Ave);
- the Alligator Farm (847 Whittington). Fogel Field was a field on the farm's lot, not the farm itself;
- the Missouri-Pacific depot (Broadway & Market);
- the courthouse (501 Ouachita);
- the 1922 Free Bathhouse (500 Reserve St);
- the streetcar hub (Central & Ouachita);
- 13 NRHP roadside properties on Park and Central.

They also list the LOC Sanborn editions (1886–1915), the two bird's-eye views (c.1888, c.1890), and how the period
street layout differs from today's:
- the 1893–1923 Arlington stood on today's Arlington Lawn;
- the lakes date from 1924 (Catherine), 1931–32 (Hamilton) and 1953 (Ouachita);
- the creek was arched under Central from the 1880s;
- Convention Blvd was Benton Street;
- the bypasses came after 1950.

Coordinates for the Row, hotels, clubs and ballparks were reused from the trivia game's `research/geo-anchors.json`
(now in [hsg-trivia](https://github.com/brianm-di4u/hsg-trivia)), with credit. Art provenance is in `art-src/PROMPTS.md`; vendored packages are in `SAMPLES.md`.

## Shared-data requests (for `research/`)
- **IQ Zoo address:** 380 Whittington Ave (EOA, AHPP tour script), 1955 to about 1990.
- **Fogel Field and the Alligator Farm:** they share 847 Whittington. The trivia anchors call the Fogel Field site "the
  Alligator Farm"; they are neighbours on one lot.
- **Conflicts to record:**
  - Ostrich Farm size and flock (7 acres and 200 birds vs 27 acres and 300+);
  - the Ostrich Farm purchase year (1945 vs 1947);
  - the Pythian closing year (1974 vs 1965);
  - the Eastman demolition (1946 vs the 1950s);
  - the Majestic's construction dates (three versions).

  Details are in `research/map-anchors.md`.
- **Early settlers:** the first settlers' cabins and Belding's inn are known only as "at the springs". The settlement
  date conflicts: 1807 (NPS 1920) vs 1809 (EOA).
- **The 1876 Diamond Jo station site** was not found; the 1908 and 1915 Sanborn sheets are the next place to look.

## Harness and tooling requests
- **`--gpu` and `--file-url` worked here.** All 93 tests pass in each. Two things only file:// exposed:
  - a test that used `fetch` (fixed in the test);
  - WebGL refusing canvases drawn from local image files, worked around with `assets/art-data.js`.

  A LESSONS line is worth adding.
- **Windows line endings:** Python's text mode writes CRLF on Windows. With `core.autocrlf=true` git hides it, but
  scripts that edit sources should open files with `newline=''`.
- **`art-pack.mjs` exits non-zero** when an `art.json` item's source is missing, even though it packs the rest. This
  game's `tools/build-art.mjs` tolerates it; a `--allow-missing` flag would make batches arriving in pieces easier.
