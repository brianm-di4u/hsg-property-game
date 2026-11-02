# Bathhouse Barons: adversarial visual review, milestone 3 (vis-m3)

Reviewer stance: independent and deliberately harsh. The benchmark tier (NEW MONOPOLY, Marmalade's MONOPOLY and Ticket to Ride, Catan Universe, Wingspan, Carcassonne) scores 9–10. A competent but plain web UI scores about 5. Earlier scores: baseline 3.8 (`REVIEW-before.md`), m1 5.5 (`REVIEW-m1.md`). The current build is scored on its own merits; the m1 status table is only a cross-check.

**Material reviewed**
- **3D (real GPU), full size.**
  - Desktop: 01-title, 05-board, 08-buy-dialog, 11-deed, 12-resort, 15-headline, 16-town-talk, 26-animating, 28-dark.
  - Mobile: 01-title, 05-board, 08-buy-dialog, 11-deed, 12-resort, 12b-whole-board, 15-headline, 26-animating, 28-dark.
  - Enlarged crops of 12-resort (right column, left column, bottom row) and 05-board (top row).
- **2D (software GL).**
  - Desktop, full size: 09-auction, 21-game-over, 23-common, 28-dark, 40-built-board (plus right and left column crops), 43-dice-tumble.
  - Mobile, full size: 40-built-board.
  - Contact sheets: desktop-01 and 02, mobile-01 to 06. Through the mobile sheets this covers 01-title, 09-auction, 21-game-over, 23-common, 28-dark and 43-dice-tumble on the phone, plus setup, trade, debt, settings, vector fallback and the harness 3D table.
- **Benchmarks:** new-monopoly-2 and catan-2 were reopened. The rest were checked against SOURCES.md and the m1 review.

---

## Scores

Where the two renderers differ, the score is given as 3D / 2D.

| # | Category | 3D | 2D | One-line verdict |
|---|---|---|---|---|
| 1 | Art | **7** | **7** | The lot vignettes, the valley map, the new painted title poster and the period baron portraits are one consistent, original hand. The pieces let it down: 3D buildings are still red boxes, tokens are glossy blobs, and the 2D stucco sprites are better but crash into the type. |
| 2 | Lighting and materials | **5.5** | **4** | 3D now has a warm table, an edge falloff, a board slab with thickness and a felt dice tray. It is still lit evenly, with no key direction, no varnish sheen, no seam AO and no metal. The night scene is a dimmer. 2D is a flat print on a wood page with a hairline bevel. |
| 3 | Animation and game feel (from frames) | **5** | **4.5** | The dice tray, the camera follow and the larger dice help. Mid-move frames still read "To roll" with ghost buttons, no frame shows money changing hands, and the 2D dice tumble across lot names. |
| 4 | UI | **6** | **6** | Baron cards gained portraits and deed swatches, and the title is an illustrated poster. Every dialog is still a modal box (Headline and Town Talk are a card *inside* a white modal), the auction is a list, trade uses native controls, setup is a form, game over is a table, and the ledger is a blank half-panel. |
| 5 | Typography | **6.5** | **6.5** | Condensed caps are consistent and the 3D far row is now legible. The "GAME PRICE" and "GAME EFFECT" debug tags survive on every card, 2D phone tiles still abbreviate, the phone title clips its own wordmark, and the AI meta line wraps to three lines. |
| 6 | Readability | **5.5** | **5** | Ownership is a thin outer strip plus two pinhead discs. Buildings and tokens still sit on names, chips and owner digits. Map pin labels collide with season flags and street names. |
| 7 | Mobile | **6** | **5** | Big wins: the baron chips are no longer truncated, the board fills the canvas with no wood below, and the controls are thumb-sized. Against that, the close-up still slices tiles and dice at the screen edge, the whole-board view wastes about 40% of the canvas on wood, the deed and auction are full-screen modals, and the title wordmark is cropped to "athhouse Baro". |
| 8 | Authenticity of setting | **8** | **8** | This is unmistakably Hot Springs. The title poster has a Bathhouse Row colonnade with magnolias, a streetcar, twin towers like the Arlington's and the mountain tower above steam. Add the sourced Gazette, the federal-lease deed and the period portraits. What drags it: the pieces are placeless, and the seasons named in the header ("Running of the Tubs") are invisible in the world. |
| | **Overall** | **6.2** | **5.7** | **≈6.0 / 10.** Up from 5.5. The art direction is now strong and coherent. What keeps it out of the 8+ tier is the *game objects* (buildings, tokens, ownership, money), the dialogs, and the in-between states. |

---

## Status of the m1 gaps (REVIEW-m1.md)

| m1 gap | Status | Evidence |
|---|---|---|
| 1. Buildings generic and on the names | **Partly fixed** | 2D has new pale-stucco, terracotta-roofed sprites (40-built-board), but they still cover "EASTMAN" and "MAJESTIC", stack vertically over tile boundaries (Hale and Buckstaff), and the Fordyce and Percival's resorts spill onto the map. 3D is unchanged: red boxes in a pile on the inner seam, and the Fordyce "resort" is a bigger red block hanging onto the map and the bottom row (12-resort crops). |
| 2. Ownership unreadable; seat and district colours fight | **Partly fixed** | Strips are about 8–10 px and there are two discs (digit and glyph). Still no plaque. Seat 3 green sits directly outside the Ballparks teal hatch (40-built-board, left column). The discs are about 6 px in 3D desktop. |
| 3. Mobile 3D framing | **Partly fixed** | Bare wood below the board is gone. Tiles are still clipped at the edges: "GATOR / RM / 00" and a half die (05 mobile); "LLIGATOR" and "PERCIVA… CABIN… $6" (26 mobile); "AND JURY ROOM", "TOWN" and a half month dial (08 mobile). The Gazette prop is cut in half in every close-up. |
| 4. Mobile chrome | **Partly fixed** | Chips show full first names and large cash, which fixes truncation. The header is fixed height, but the second season chip is faded out ("Summer visitor…", 12 mobile). The deed and Headline are still full-screen modals, and the auction covers about 60% of the board. 2D abbreviations remain. There is about 45–60 CSS px of dead space under the chips. |
| 5. Title, setup and game over bare | **Partly fixed** | The title is now a painted poster on wood: a real improvement. On phones the wordmark is clipped on both sides ("athhouse Baro", 01-title mobile in 3D and 2D). Setup is unchanged (a form). Game over gained a "GAZETTE · EXTRA" kicker but is still a table in a white box with about 60% empty wood (21-game-over). |
| 6. HUD a spreadsheet; empty ledger | **Partly fixed** | Painted portraits, bigger cash and deed-colour swatches. The ledger is still about 330 px of blank cream (05-board desktop), and the meta line wraps to three lines. Human seats share one portrait (Ada and Ben in 23-common; "Player 1" and "Player 2" in 04-game-6), and so do duplicate AI archetypes (Jack Tolliver and "Jack Tolliver II"). |
| 7. Money has no physical moment | **Open** | No frame in either set shows a payment, floater or deed transfer. Rent is still a rail line ("Ada pays $30 rent", 23-common). |
| 8. Dice small, soft, parked on the map | **Partly fixed** | There is now a felt dice tray, and the dice are larger and crisper (05 desktop). The tray is a permanent slab on West Mtn and Central Ave. The 2D throw lands across "HOT SPRINGS WATER CO." and the Gazette (43-dice-tumble). On mobile the tray and a die are cut off at the left edge. |
| 9. 3D sharpness and far row | **Mostly fixed** | The top row is legible at about 9 px with uniform sizes ("SOUTHERN CLUB" and "OHIO CLUB" match). The frame is still slightly soft compared with the DOM. |
| 10. Flat lighting; night is a dimmer | **Partly fixed** | Warm tone and table falloff. No key, sheen or AO. 3D night has no neon on the Clubs. 2D night has pink outlines on the Clubs. The Gazette prop stays bright white at night (28-dark, both renderers). |
| 11. Tokens are blobs | **Open** | Still all-colour glossy lumps: a blue pawn, an orange bell, a green ring and a purple ball (12-resort right and left crops, Depot). |
| 12. Overlap and collisions | **Partly fixed** | Ribbon against chip is gone, and the Treasury chip moved off the dial. New and remaining collisions: the "Alligator Farm" pin label covers the "Quiet winter" flag (08 desktop 3D, "…nter"); "Percival's Cabins (approx.)" covers "Hot Springs Mtn" (23-common); the token on Majestic covers the ×1.5 chip and digit (40-built-board); the token on Whittington covers its name; the dial covers "PLEASANT ST" (2D mobile). |
| 13. Disabled and in-progress states | **Open** | 26-animating (3D) and 43-dice-tumble (2D) both show the status "To roll" while moving, a dark-red "Buy $100" with grey text, and a ghosted Auction. The labels are back (not empty), but they are still illegible ghosts. |
| 14. Dialogs centred modals; auction a list | **Mostly open** | A darker veil, and the auction has a lot thumbnail. The Headline and Town Talk cards still sit inside a white modal frame with an OK button. "GAME PRICE" and "GAME EFFECT" remain. The deed ladder has no icons. The auction is a text list. Trade uses native checkboxes and a select (19-trade). |
| 15. Dark theme clashes | **Partly fixed** | 3D dark has a gold primary and gold active card, which is coherent. 2D dark keeps the **cyan** focus ring on the gold Roll button, and the coral title on navy remains in both. |
| 16. Seasons don't change the world | **Partly fixed** | Season flags are now pinned on the map ("Running of the Tubs" and "Summer visitors" in 12-resort). The terrain, light and props are identical in January and June/July: no tubs on Central Ave and nothing on the Oaklawn oval. |
| 17. Centre banner too big | **Open** | Same size, top of the map, in every shot. |

---

## What works and must be kept

1. **The painted vignettes and the valley map.** They are the identity. Never dilute them with stock icons.
2. **The new title poster** (01-title desktop). It is original period travel-poster art and the best first impression the game has had. It only needs a correct crop on phones.
3. **The period baron portraits** in the HUD (05-board). They give the AI archetypes faces, so extend them to the human seats (gap 10).
4. **Headline as the Barons' Gazette, Town Talk as a 2¢ postcard, and the federal-lease deed with the U.S. LEASE seal** (15, 16, 11). The *content* is benchmark-quality; only the frame around it isn't.
5. **The 3D mobile close-up that now fills the canvas**, with the whole-board toggle in the header.
6. **The felt dice tray** as a concept: give it a better home (gap 13).
7. **The season flags pinned on the map.** This is the right first step toward seasons living in the world.
8. **The night palette in 3D**: gold primary, gold active rim, navy panels. It is one accent family; port it to 2D.
9. **Renderer parity**: the same art in 3D, 2D and `?art=0`.

---

## Ranked gap list (most important first)

### 1. MAJOR: Buildings are still the weakest object on the board and still sit on the type
- **Wrong:**
  - **3D** (12-resort, right, left and bottom crops): every level is the same red-roofed box with a black window strip. Hale and Buckstaff become one vertical pile of five boxes that straddles the tile boundary. The Fordyce "Grand Resort" is a bigger red block hanging over the map frame and the bottom row. On Percival's Cabins the resort covers the vignette. A stray orange bead sits in the building lane on Majestic Park and Buckstaff. You cannot count levels, and the resort is no payoff.
  - **2D** (40-built-board, right crop): the new stucco sprites are a real improvement in silhouette. They are placed *across* the tile and map seam, so they cover the first letters of "EASTMAN" and "MAJESTIC", stack three-high through Hale, Buckstaff and Fordyce, and the Percival's resort sits on the map and the bottom-row vignette.
- **Benchmark does better:**
  - `new-monopoly-2.jpg`: one chunky building sits squarely inside the colour strip and never touches the text.
  - `catan-2.jpg`: settlement and city are different silhouettes, readable at any zoom.
  - `monopoly-go-2.jpg`: the upgrade is a celebrated set-piece.
- **Fix:**
  - Put the **building lane inside the tile**, as the district band (about 22% of the tile depth, inner side), with three fixed slots. Assert in a layout test that the lane never intersects the name, price, chip or owner zones.
  - In 3D, model the same three pieces the 2D sprites already show: stucco bathhouse, pale-brick hotel variant, and a twin-tower **Grand Resort** that replaces the three and fills the lane, with a seat-colour pennant. Use instanced meshes and keep the 2D sprites rendered from those models.
  - Remove the orange bead, or make it a deliberate level pip.
  - On a build, drop and squash with a steam puff (reduced motion: a 150 ms fade).

### 2. MAJOR: Ownership still does not read at a glance
- **Wrong:**
  - The owner marker is an outer seat strip (about 8 px in 3D desktop) plus two discs of about 6 px (12-resort crops).
  - Seat 3 green sits directly against the Ballparks teal hatch (40-built-board, left column), and seat 1 orange runs beside the Bathhouse Row red hatch.
  - The HUD swatches show *district* colours, not the seat's own colour, so the HUD and the board use two colour languages for "who owns what".
  - Map owner flags are about 6 px and pile up on Bathhouse Row (12-resort mobile, 40-built-board mobile).
- **Benchmark does better:** `new-monopoly-2.jpg` uses a large standing owner badge per owned lot, and `catan-2.jpg` uses a few saturated, well-separated seat hues on shadowed pieces.
- **Fix:**
  - Give each owned lot a full-width **enamel owner plaque** under the price: seat colour, token glyph and number. In 3D it is a raised plate.
  - Pick seat hues at least 30° from every district hue, and mute and pattern the district bands.
  - Make the HUD swatches seat-coloured deed slivers grouped by district.
  - Hovering or long-pressing a baron card highlights their lots and dims the rest.
  - Map flags 2× taller, clustered per district with a count.

### 3. MAJOR: Tokens are still coloured blobs
- **Wrong:** at play size the tokens read as a blue pawn, an orange bell, a green donut and a purple ball (12-resort crops, Depot cluster in 05-board). They are all glossy all-colour plastic. At the Depot four overlap into one lump. In 2D the green token sits on "WHITTINGTON" and the blue one on Majestic's chip and digit.
- **Benchmark does better:** `new-monopoly-2.jpg` uses silhouette-first metal tokens (the top hat reads at any size), and `carcassonne-1.jpg` uses chunky meeples with clear shadows.
- **Fix:**
  - Exaggerate the silhouettes: tall jug with handle, wide-brim fedora, upright horseshoe, long low alligator, whistle with ring, stacked towels.
  - Use a pewter or brass body (metalness about 0.8) on a seat-colour enamel base ring, so shape and colour read separately.
  - Scale them 1.3×.
  - Give each tile a reserved **token lane** (2×3 auto-fan) that never overlaps the name or chip.

### 4. MAJOR: Dialogs are still web modals, and the card art is framed by a white box
- **Wrong:**
  - **Headline and Town Talk** (15 and 16, both viewports): a beautiful newspaper and postcard sit *inside* a second white modal frame, with the OK button in that frame's empty margin. This is a card-in-a-box, not a card.
  - **Deed** (11): "GAME PRICE" debug tag, a text-only rent ladder, and the wall of "Build $200 per level · federal lease: auction only, cannot be mortgaged…" in small grey type.
  - "GAME EFFECT" tag on every card.
  - **Auction** (09, both viewports): a list of "— in" rows with "Game price $100" in 11 px grey, and four buttons. It covers the lot it auctions on mobile.
  - **Trade** (19-trade): native checkboxes and a native `<select>`.
- **Benchmark does better:**
  - `wingspan-2.jpg` lifts a textured card off a dimmed table.
  - `ttr-2.jpg` fans cards over a still-visible board.
  - `monopoly-mobile-2.jpg` draws the rent ladder with building icons.
  - `rento-3.jpg` pairs the card with a live bid ladder.
- **Fix:**
  - Render the Headline, Town Talk and deed as **the card itself**: no outer white frame, cardstock edge and shadow, and the OK as a stamped seal on the card. Use a warm dim with a slight blur behind, and keep the lot highlighted.
  - Replace "GAME PRICE" with "Lease $400" in the card's type, and "GAME EFFECT" with a ruled "IN PLAY" box head.
  - Rent ladder with the actual bathhouse and resort icons.
  - **Auction:** one baron row with a bid paddle each, a big central bid numeral, and a gavel on close. On phones use a bottom sheet with the lot framed above it.
  - **Trade:** two facing deed fans with tap-to-move and themed toggles.

### 5. MAJOR: Money still has no physical moment
- **Wrong:** rent, Payday, taxes and purchases are a rail line plus a silent number change ("Ada pays $30 rent" in 23-common; "Ada pays $450 rent" in 18-bankrupt). The genre's central social beat is invisible, and the new portraits make it more conspicuous that nobody ever hands anybody anything.
- **Benchmark does better:** `new-monopoly-4.jpg` shows a "Pay" card from payer to payee, and `new-monopoly-2.jpg` keeps banknotes physically on the table.
- **Fix:**
  - Original-design scrip or coins fly from the payer's card to the payee's card (about 400 ms on a bezier).
  - Red −$ and green +$ floaters rise from the lot, and both cash numerals count.
  - On a purchase, a deed sliver slides off the tile into the buyer's card.
  - In 3D, put a small scrip stack per seat on the table margin.
  - Reduced motion: numerals count with no flight.

### 6. MAJOR: The phone title cuts its own name; setup and game over are still forms
- **Wrong:**
  - **01-title mobile** (3D and 2D): the poster is cropped so the wordmark reads "athhouse Baro", the first and last letters sliced. It is the first thing a phone player sees. On desktop, "About" falls below the 800 px fold, and the disabled "Continue" is a muddy translucent pill.
  - **04-setup**: an HTML form of selects and text fields.
  - **21-game-over**: a white box with a 5-column HTML table of "$0" cells over about 60% empty wood. The winner's token disc has a flat-cut base. The portraits that now carry the HUD are absent.
- **Benchmark does better:** `wingspan-1.jpg` and `carcassonne-1.jpg` keep their menus inside the illustrated world, and `monopoly-go-2.jpg` treats the climax as a celebration.
- **Fix:**
  - **Title:** fit the wordmark as a separate text layer over the art (never baked into the cropped image), using `clamp()` sizing. On portrait, use a portrait crop of the poster. Hide "Continue" when there is no save instead of ghosting it, and keep all buttons above the fold.
  - **Setup:** a row of baron cards (portrait, token, human/AI toggle, archetype), in the deed card style.
  - **Game over:** a full "EXTRA!" front page of the Barons' Gazette. The winner's portrait is the photo plate, the standings are the portraits with deed fans, and there is one headline stat per baron.

### 7. MAJOR: In-progress states still look broken
- **Wrong:**
  - 26-animating (3D, both viewports): the token is mid-hop while the status says "To roll", "Buy $100" is dark red with grey text, and "Auction" is ghosted.
  - 43-dice-tumble (2D, both viewports): the dice are in the air with the same "To roll" and two ghost pills.
- **Benchmark does better:** `monopoly-go-1.jpg` always has one meaningful primary control.
- **Fix:**
  - While animating, collapse the action row to one "Moving… tap to skip" control.
  - Update the status to "Rolling…" and then "Moving to Belding's Inn".
  - Disabled labels keep at least 3:1 contrast.

### 8. MAJOR: Phone camera framing still slices tiles and dice, and the whole-board view wastes the canvas
- **Wrong:**
  - **Close-up:** 05 mobile shows "GATOR / RM / 00" and half a die. 26 mobile shows "LLIGATOR" and "PERCIVA… CABIN… $6". 08 mobile shows "AND JURY ROOM", "TOWN" and half the month dial. 12 mobile clips the Depot's "Payday". The Gazette prop is cut in half in every close-up.
  - **12b-whole-board:** the board uses about 60% of the canvas height, with about 100 CSS px of wood above and below, and tile type at about 6–7 CSS px.
  - **26-animating desktop (3D):** the move camera leaves the bottom fifth of the canvas as blurred wood and cuts the left column.
- **Benchmark does better:** `monopoly-go-1.jpg` fits the track the token is on edge to edge with the dice in frame.
- **Fix:**
  - Frame whole tiles only: snap the horizontal extent to tile boundaries, fit the side the token is on (plus the next corner when the roll turns) to the canvas width with a 12 px margin, and keep the dice tray in the frustum.
  - On a portrait whole-board view, fit the board's long axis to the canvas, rotating the camera 0–10° if needed, and zero the empty wood.
  - On desktop, pitch the move camera so the near board edge lands on the canvas bottom.

### 9. MAJOR: Lighting and materials are still flat; night is a dimmer
- **Wrong:**
  - 05 and 12-resort (3D): even, directionless light. No varnish sheen across the board, no AO in the tile seams, no metal anywhere, and the buildings and tokens have the same plastic response.
  - 28-dark (3D): the whole scene dims. The Clubs (Southern Club, Ohio Club, The Vapors) have no neon. The Gazette prop is a pure-white slab glowing on a dark map.
  - 2D: a flat print with a hairline edge on a wood page.
- **Benchmark does better:** `carcassonne-1.jpg` and `new-monopoly-1.jpg` use a warm directional key, glossy wood and real piece shadows. `richup-1.png` has a dark mode designed as its own palette.
- **Fix:**
  - 3D: one warm key from the upper left with a cool, low fill. Bake AO into the tile grid, use a subtle varnish roughness map, and use a shadow map for pieces only (1024 px on phones).
  - Night: a lamp-pool spotlight with the table falling off to dark, emissive neon tubes on the three Clubs tiles, lit windows on the map, and the Gazette and decks tinted to lamp-light.
  - 2D: a 6 px board edge with bevel highlight, a soft drop shadow and a radial lamp vignette.

### 10. MAJOR: The desktop right column is still half empty, and portraits are duplicated
- **Wrong:**
  - The ledger is about 330 × 330 px of blank cream on turn 1 (05-board desktop, 43-dice-tumble). That is the largest single element on screen, and the emptiest.
  - The meta line "Human · 0 lots · worth $1,200" wraps to three lines in 11 px grey.
  - Both human seats get the same cloche-hat portrait (Ada and Ben in 23-common; Player 1 and Player 2 in 04-game-6), and duplicate archetypes share a face *and* a name ("Jack Tolliver" and "Jack Tolliver II").
- **Benchmark does better:** `new-monopoly-3.jpg` shows each player's deeds beside them, and `ttr-1.jpg` has portrait cards with big numerals.
- **Fix:**
  - Collapse the ledger to its last 3 lines in Gazette type, with an expander, and give the reclaimed width to the board canvas (about 120 px).
  - Replace the meta line with a single "4 lots · $3,230" line and the deed fan.
  - Add a portrait pool of at least 6 human and at least 2 per archetype, with no duplicates in one game, and distinct AI names.

### 11. MINOR: Collisions on the map and tiles
- **Wrong:**
  - The "Alligator Farm" pin label covers the "Quiet winter" flag (08 desktop 3D, "…nter").
  - "Percival's Cabins **(approx.)**" covers "Hot Springs Mtn". "(approx.)" also reads as a debug note (23-common, 08-buy 2D).
  - The token covers the ×1.5 chip and digit on Majestic, and the name on Whittington (40-built-board).
  - The month dial covers "PLEASANT ST" on 2D mobile.
- **Benchmark does better:** `catan-2.jpg` never puts a piece over a number chip.
- **Fix:**
  - Reserved tile zones (vignette, chip, ribbon, name and price, plaque, building lane, token lane) with a layout assertion.
  - Collision-aware map labels with leader lines.
  - Drop "(approx.)", or move it to the deed.
  - Move the dial into the empty upper-right forest.

### 12. MINOR: 2D phone board still abbreviates and clips
- **Wrong (40-built-board mobile):** the tiles read "TALK", "GATORS", "MOTOR CTS", "MAJESTIC PK", "WATER CO.", "RAILROAD", "CABINS", "WATER TAX", "WOODMEN" and "VAPORS". "Just visiting" and "Payday $150 ›" are clipped at the board's bottom edge.
- **Benchmark does better:** `monopoly-mobile-1.jpg` keeps full property names on a dense phone board.
- **Fix:**
  - Two-line condensed names at about 10 CSS px (rotated 90° on the side columns if needed).
  - Lay out the corner subtitles inside the corner art box.
  - Treat a test failure on any abbreviation map entry as a regression.

### 13. MINOR: The map centre is crowded by props that don't earn their space
- **Wrong:**
  - The "BATHHOUSE BARONS" banner still takes the top sixth of the map (all shots).
  - The dice tray is a permanent felt slab over West Mtn and Central Ave.
  - The Gazette prop shows the placeholder "A Headline each new month" in every 3D shot, including June after a headline was drawn (12-resort, 28-dark). It is the brightest object on the board and says nothing.
- **Benchmark does better:** `new-monopoly-1.jpg` keeps its centre as live world.
- **Fix:**
  - Shrink the banner to a map cartouche in the upper-left corner.
  - Make the tray lower-profile (a leather dice mat at the map's lower-left, about 70% of its current size) or put it on the table margin in 3D.
  - Always print the live headline on the Gazette, so it is never a placeholder, and render it as aged newsprint rather than white.

### 14. MINOR: Seasons are labels, not weather
- **Wrong:** January (05) and June (12-resort) or July (14-season-summer) are the same map, light and props. The only changes are the flags and dial. "Running of the Tubs" has no tubs, and "Racing season" leaves the Oaklawn oval empty.
- **Benchmark does better:** `wingspan-1.jpg` uses ambient mood art.
- **Fix:**
  - Grade the light temperature per season.
  - Instanced props: horses on the oval in racing season, a tub-race pennant on Central Ave in June, bunting at the ballparks in Feb and Mar, Garvan lights in Nov and Dec.
  - Pulse the affected district bands when the month turns.

### 15. MINOR: Dark-theme leftovers in 2D
- **Wrong (28-dark 2D, both viewports):** a cyan focus ring on the gold Roll button (a third accent), coral "BATHHOUSE BARONS" on a navy banner, and a white Gazette slab.
- **Benchmark does better:** `richup-1.png` uses one accent family throughout its dark theme.
- **Fix:**
  - Port the 3D dark tokens: gold focus ring, gold primary, cream title with gold edge.
  - Retune the district hues for dark (+10% lightness, −15% saturation).

### 16. MINOR: The mobile header truncates its own season chips
- **Wrong:** "Summer visitor…" fades out under the toggle button (12-resort and 28-dark mobile).
- **Fix:** collapse the chips to icon + multiplier (▲×1.5) when more than one is active, with the full text on tap.

---

## Performance and originality notes for the fixes

- **Originality:**
  - Period bathhouses, enamel plaques, Gazette and postcard formats, scrip of the game's own design.
  - No green board, no GO arrow, no ROLL!/BUILD! banners, no top hat, no Monopoly houses or hotels.
  - Owner plaques use token glyphs, not portrait badges.
- **Budget:**
  - Instanced buildings, tokens, flags and season props.
  - One shadow map for pieces only, with contact blobs on the low tier.
  - Baked AO.
  - Emissive neon (no bloom on phones).
  - Render on demand, so idle costs zero and full DPR plus anisotropic filtering are affordable.
  - Everything ships locally (woff2 fonts, WebP or KTX2 textures).
