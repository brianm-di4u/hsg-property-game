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

## What changed

**The board is a printed 1930s game on an oak card table.**
- **Two renderers, one board.**
  - On a real GPU it is a three.js 3D table (`src/js/board3d.js`, three.js r186 vendored and tree-shaken): a bevelled
    board slab on the oak table under a warm table-lamp spot with soft shadows, a light varnish sheen on the board, and
    Blender die-cast pieces as meshes.
  - On software GL, with no WebGL, with `?gl=0`, or when the frame watchdog trips, the same board draws as a flat
    canvas on the same table. The flat board uses the same art, with pre-rendered Blender sprites and baked shadows for
    the pieces.
  - The 3D board's face is the 2D renderer drawn into a 2048-px texture, so the layout, the text and the hit-testing
    logic are shared.
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

| Run | Result |
|---|---|
| `run.mjs games/property-game --gpu --milestone visual-final` (3D table on the RTX 5060, both viewports) | **93/93** |
| `run.mjs games/property-game --milestone visual-final-2d` (software GL: flat-board fallback) | **93/93** |
| `run.mjs games/property-game --file-url --milestone visual-final-file` (every test from file://) | **93/93** |
| `tools/check-file-url.mjs` (file://, harness Chromium and installed Chrome on the GPU; fonts, art, a played game, no external requests) | 4/4 |
| `tools/check-facts.mjs` | 78/78 facts verified |

**Test coverage.** 93 tests: the 83 originals plus 10 new ones.
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
| 3D, RTX 5060, 4 AI barons animating | 59.2 fps, 0.7 ms median render | 58.3 fps, 0.4 ms |
| 3D with 4× CPU throttle | 59.3 fps, 2.3 ms | 58.5 fps, 2.0 ms |
| Flat board, harness (software GL) | 60.1 fps | ≈58–60 fps |
| JS heap | 9.5–13.6 MB | 10.8–14.5 MB |
| Hooks ready / painted art decoded | ≈60 ms / 250–345 ms | same |

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

## Known gaps
The review's fourth MAJOR gap remains open, as do several minor ones:
- **Off-board screens are still mostly HTML forms** (MAJOR). Setup, the auction list, trade (native checkboxes and a
  select) and the game-over table work but are plain next to the benchmarks. The "Game price" and "Game effect" pills
  are kept on purpose: the project labels game logic separately from sourced history.
- **3D buildings read as small slabs at board scale.** Their roofs (red tile, green tile, teal dome, twin towers) only
  read in close-up.
- **Lighting is good but flat next to the benchmarks:** no ambient occlusion in the tile seams. On the flat board the
  dark theme's Club neon is a thin line.
- **Seasons** change the lamp colour and pin pennants on the map, but there are no seasonal props.
- **The 2D phone board** still uses short names ("GATORS", "MOTOR CTS"), as it did before. The 3D close-up shows full
  names.
- **A payment frame was never captured in a screenshot**, though the coin flights and counting cash are in the game.
- **Duplicate personas** in 5–6 seat games share a portrait and a name (e.g. "Jack Tolliver II"); there are six
  portraits for six personas.
- **Seats are not shown as one strip on phones.** Player cards use first names in a 3-column grid, and below the panel
  there is unused table on tall phones.
- **Phone close-up framing.** The camera is clamped to the board, but the close-up can still cut the first tile of the
  next side. The whole-board button is the remedy.
- **Trade** still uses native checkboxes and a select (functional and keyboard-accessible, but plain).
- **Seasons** change the lamp's colour temperature and pin pennants on the map; there are no seasonal props.
- **Audio and screen readers** were still not checked by a person.
- **Timing measurements.** fps was measured headless on a shared, loaded machine; per-frame render time (0.3–2.4 ms)
  is the steadier figure.

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

Coordinates for the Row, hotels, clubs and ballparks were reused from `games/trivia/research/geo-anchors.json`, with
credit. Art provenance is in `art-src/PROMPTS.md`; vendored packages are in `SAMPLES.md`.

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
