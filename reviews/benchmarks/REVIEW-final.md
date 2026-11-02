# Bathhouse Barons: adversarial visual review, final build

Reviewer stance: independent and deliberately harsh. The benchmark tier (NEW MONOPOLY, Marmalade's MONOPOLY and Ticket to Ride, Catan Universe, Wingspan, Carcassonne) scores 9–10. A competent but plain web UI scores about 5. Earlier scores: baseline 3.8, m1 5.5, m3 6.0. The final build is scored on its own merits. The m3 status table below is only a cross-check.

**Material reviewed**
- **3D (real GPU), full size:** `visual-final-3d/desktop/` 05-board, 12-resort, 15-headline, 16-town-talk, 26-animating, 28-dark; `visual-final-3d/mobile/` 01-title, 05-board, 11-deed, 12-resort, 12b-whole-board, 26-animating, 28-dark; `visual-final/desktop/` 21-game-over, 40-built-board.
- **3D enlarged crops (2–3×):**
  - 12-resort desktop: right column, left column, bottom row.
  - 12-resort mobile: right column, bottom row.
  - 40-built-board desktop: both columns and the HUD.
  - 28-dark desktop: the Clubs row.
- **3D contact sheets:** `visual-final/sheets/` desktop-01 to 08 and mobile-01 to 06.
- **2D (software GL):**
  - Full size: `visual-final-2d/desktop/` 28-dark, 40-built-board (right column and bottom row crops), 43-dice-tumble, and `visual-final-2d/mobile/` 40-built-board.
  - Sheets: desktop-02 and mobile-02.
- **Before/after:** desktop-05 and mobile-03.
- **Code, only where a claim could not be judged from frames:**
  - Money pops and coin flights exist (`main.js` `pop()`/`coins()`, drawn on an overlay in `board3d.js`).
  - The 3D renderer has a key light, a fill light and a PCF shadow map.
  - `data.js` TOKENS: `{ shape: 'hat', label: 'Top hat' }`.
- **Benchmarks:** checked against SOURCES.md and the m3 findings.

---

## Scores

Where the two renderers differ, the score is given as 3D / 2D.

| # | Category | 3D | 2D | One-line verdict |
|---|---|---|---|---|
| 1 | Art | **7.5** | **7.5** | Vignettes, valley map, title poster, portraits, Gazette and postcard are one strong original hand. Tokens are now pewter on enamel bases. Buildings left the type but are still red slabs and a teal bead in 3D, and one token is a Monopoly top hat. |
| 2 | Lighting and materials | **6** | **4.5** | 3D gained a key light, fill and piece shadows, and night has gold accents plus magenta edge lines on the Clubs. The board still reads as an evenly lit print: no varnish sheen and no seam AO. 2D is flat, but its dark theme is now coherent. |
| 3 | Animation and game feel (from frames) | **6** | **5.5** | In-progress states are fixed ("Moving… tap the board or press Space to skip"). The money flights exist in code, but no captured frame shows them. The 3D move and AI cameras slice the board. The 2D dice tumble across tile type. |
| 4 | UI | **6.5** | **6.5** | Headline and Town Talk are now the card itself, with a stamped OK seal, and the auction is a bottom sheet on phones. Still: the auction is a text list, trade uses native controls, setup is a form, game over is a table, and the ledger is a blank half-panel. |
| 5 | Typography | **6.5** | **6** | The type family is consistent and the far row is legible. "GAME PRICE" and "GAME EFFECT" debug tags remain, as do "(approximate)" map captions and a wrapping "month 1 of 12" header. The phone setup truncates names to "Odessa Ma". The 2D phone tiles still abbreviate. |
| 6 | Readability | **6.5** | **6.5** | Buildings now sit in a lane beside the type, and owned tiles take a seat-colour wash. Seat and district hues still sit side by side, the HUD swatches use district colours, and tokens still cover chips and owner digits. |
| 7 | Mobile | **6** | **5.5** | The phone title is fixed and the whole-board view is tighter. The close-up still slices "GATOR / RM / 00", the dice and the Gazette. There are 85–110 CSS px of dead brown under the chips, the deed's Close button is cut off, and the season chips are truncated. |
| 8 | Authenticity of setting | **8** | **8** | This is unmistakably Hot Springs, with sourced history on every card. Two things drag it: a **top hat** token (the genre's trademark piece, in a game whose About page says it uses no commercial game's elements), and seasons that are still only labels. |
| | **Overall** | **6.6** | **6.1** | **≈6.4 / 10**, up from 6.0. Real fixes landed: the phone title, in-progress states, buildings moved off the type, the ownership wash, card-style Headline and Town Talk, the 2D dark theme, and metal tokens. Four MAJOR gaps keep it well short of the 8+ tier. |

---

## Status of the m3 gaps (REVIEW-m3.md)

| m3 gap | Status | Evidence |
|---|---|---|
| 1. Buildings weakest object, on the type | **Partly fixed** | Both renderers now put buildings in the inner district lane, so none touches a name (40-built-board, both renderers). The 2D sprites are three distinct silhouettes: stucco, green-roof hotel and dome. The 3D pieces at play distance read as red hip-roof slabs plus a **teal bead** (the dome level) on Majestic Park and Buckstaff (12-resort crops). The 3D Percival's resort is a large red roof over the vignette. The 2D Percival's resort tower overhangs the tile top and the map seam (2D 40-built-board bottom crop). |
| 2. Ownership unreadable | **Partly fixed** | Owned tiles now take a full seat-colour wash: Ballparks green, Grand Hotels blue, Bathhouse Row peach (40-built-board). Problems remain: owner discs are still about 6 px; seat 3 green runs against the Ballparks teal hatch and seat 1 orange against the Bathhouse Row red hatch; the HUD swatches are still *district* colours (Ada's are red, but her board colour is orange). There are no plaques. |
| 3. Tokens are blobs | **Partly fixed** | Pewter bodies on seat-colour enamel bases (jug, hat, horseshoe, parasol). From the 3D top-down camera most read as domes (Depot, 12-resort mobile). The hat is a literal **top hat** (`data.js` label "Top hat"). There is no token lane: in 2D the hat covers Majestic Hotel's ×1.5 chip and the "2" disc, and the jug covers Hale's "1" disc. |
| 4. Dialogs are web modals | **Partly fixed** | Headline and Town Talk are now the card itself, with the OK as a seal on the card edge (15 and 16 desktop). The auction is a phone bottom sheet with the lot thumbnail (09 mobile). Still open: "GAME PRICE" and "GAME EFFECT" tags, a text-only rent ladder, the auction as a "— in" list, and trade with a native `<select>` and checkboxes (19-trade). |
| 5. Money has no physical moment | **Partly fixed (unverified)** | `pop()` floaters and `coins()` flights exist between tokens. No frame in either suite captures one, and the coins fly token-to-token rather than into the HUD cards. |
| 6. Phone title clipped; setup and game over bare | **Partly fixed** | The phone title shows the full wordmark (01-title mobile). Setup is unchanged (a form, and names truncated on phones). Game over gained a Gazette masthead but is still a 5-column table over about 35% empty wood. It shows **the cloche-hat woman's portrait for "Ben wins!"** (21-game-over, both viewports). "Continue" is still a ghost pill. |
| 7. In-progress states look broken | **Fixed** | 26-animating and 43-dice-tumble (both renderers): status "Moving…" and a single "Moving… tap the board or press Space to skip" pill, with no ghost buttons. A minor leftover: the status reads "Moving…" while the dice are still in the air. |
| 8. Phone framing slices tiles; whole board wastes canvas | **Partly fixed** | 12b-whole-board is now about 50 CSS px of wood top and bottom, down from about 100. The close-up is **unchanged**: "GATOR / RM / 00", a half die, "arons' Gazette" (05 and 12 mobile), and "PERCI / CAB / $6" with the dial cut (26 mobile). On desktop, 26-animating still leaves the bottom fifth as wood and cuts the left column and "THE DEPO". The desktop AI camera (28-dark) cuts "VER MOTEL" and "SUMM", with a band of wood across the top. |
| 9. Flat lighting; night is a dimmer | **Partly fixed** | There is a key, a fill and token shadows, and night is a navy grade with gold accents and magenta edge lines on the three Clubs (28-dark crop). Still missing: varnish sheen, seam AO, a lamp-pool falloff and lit windows. The neon is a 1–2 px line with no glow. |
| 10. Empty ledger; duplicate portraits | **Mostly open** | The ledger is still about 330 px of blank cream on turn 1 (05-board desktop). The meta line is down to two lines. Human seats still share one portrait (Ada and Ben in 23-common; Player 1 and Player 2 in 04-game-6), and "Jack Tolliver II" shares a face and a name. |
| 11. Collisions | **Partly fixed** | Buildings no longer collide. Still colliding: "Site of Percival's Cabins (approximate)" over "WHITTINGTON AVE" (23-common), "(approximate)" in every lot pin label, 2D tokens over chips and digits, and the dial edge over "PLEASANT ST" (2D mobile 40). |
| 12. 2D phone abbreviations | **Open** | 2D mobile 40-built-board: "TALK", "GATORS", "MOTOR CTS", "MAJESTIC PK", "WATER CO.", "RAILROAD", "CABINS", "WATER TAX", "VAPORS". "Payday $150 ›" is clipped at the board's bottom edge. |
| 13. Map centre props | **Partly fixed** | The Gazette prop now prints the live headline when one is active ("Record Bath Year" in 14-season-racing and 31-resumed; "Flood of 1923" in 25). It still shows the "A Headline each new month" placeholder in June (12-resort, 15-headline). The banner is the same size, and the felt tray still squats on West Mtn and Central Ave. |
| 14. Seasons are labels | **Open** | January (05), June (12-resort) and July (14-season-summer) share the same grade, light and props. There are no tubs, no horses and no lights. |
| 15. 2D dark leftovers | **Fixed** | 2D 28-dark has a gold focus ring, gold primary, gold-on-navy title and pink Club outlines. The only leftover is that the Gazette slab is still bright cream. |
| 16. Mobile header truncates chips | **Open** | "Summer visitor…" (12b and 11-deed mobile). The third chip is reduced to a sliver in 28-dark mobile. |

---

## What works and must be kept

1. The painted vignettes, the valley map and the title poster, including the new portrait crop on phones.
2. Headline as the Barons' Gazette and Town Talk as a 2¢ postcard, now presented as the card itself with a seal-style OK. This is benchmark-grade presentation.
3. The in-progress state: one status pill, "Moving… tap the board or press Space to skip".
4. The building lane beside the type, and the seat-colour tile wash.
5. Pewter tokens on enamel seat bases (keep the material idea; change the hat).
6. The 3D and 2D dark themes, now one gold accent family.
7. The live headline printed on the Gazette prop.

---

## Ranked remaining gaps

### 1. MAJOR: Phone and move cameras still slice the board
- **Wrong:**
  - The mobile close-up is identical to m3: "GATOR / RM / 00", half a die and tray, and "arons' Gazette / e cash new month" (`visual-final-3d/mobile/05-board.png`, `12-resort.png`).
  - The move camera cuts "PERCI / CAB / $6", a die and the month dial (`mobile/26-animating.png`).
  - The AI-turn camera centres on a map pin and shows no tile from the target column (`mobile/28-dark.png`).
  - Desktop 26-animating leaves the bottom fifth as blurred wood and cuts the left column and "THE DEPO". Desktop 28-dark cuts both side columns under a band of wood.
  - The phone is the primary viewport, and its first in-game frame is cropped text.
- **Benchmark does better:** `monopoly-go-1.jpg` fits the track the token is on edge to edge, with the dice in frame.
- **Fix:**
  - Compute the frustum from tile rectangles, not a point. Fit the token's side, plus the next corner when the roll turns, to the canvas width with a 12 px margin, and snap to tile boundaries.
  - Keep the dice tray in the frustum, or move the 3D dice to the HUD side of the board on phones.
  - For the AI camera, frame the *tile* and its map pin together.
  - On desktop, clamp the pitch so the near board edge sits on the canvas bottom.
  - Add a layout test that projects every tile corner and fails on any partially visible tile.

### 2. MAJOR: Setup, auction, trade and game over are still web forms; the deed keeps debug tags
- **Wrong:**
  - **04-setup** (both viewports): selects and text inputs. On phones the name fields truncate to "Odessa Ma" and "Cornelius '".
  - **09 and 10 auction:** a "— in" list with "Game price $100" in small grey type.
  - **19-trade:** a native `<select>` and checkboxes.
  - **21-game-over:** a Gazette masthead over a plain 5-column HTML table, with about 35% empty wood below on desktop.
  - **11 and 24 deed:** a "GAME PRICE" pill, a text-only rent ladder, and a wall of small grey rules text. On phones the Close button is cut off at the viewport bottom (`mobile/11-deed.png`, 27-touch-deed).
  - "GAME EFFECT" tags on every card (15, 16).
- **Benchmark does better:**
  - `monopoly-mobile-2.jpg`: the rent ladder uses building icons.
  - `rento-3.jpg`: the card sits beside a live bid ladder.
  - `wingspan-1.jpg` and `carcassonne-1.jpg`: menus live in the illustrated world.
  - `ttr-2.jpg`: cards are fanned over a visible board.
- **Fix:**
  - **Setup:** a row of baron cards (portrait, token, a Human/AI toggle and archetype) in the deed style.
  - **Auction:** one row per baron with a bid paddle, a large central bid numeral and a gavel on close.
  - **Trade:** two facing deed fans with tap-to-move.
  - **Game over:** a full Gazette front page with the winner's plate, standings with portraits and deed fans, and one stat per baron.
  - **Deed:** use the actual stucco, hotel, dome and resort sprites in the ladder. Write "Lease $400" in the card's type and a ruled "IN PLAY" box head instead of the debug pills. Make the deed sheet scroll inside a sticky footer, so Close is always visible.

### 3. MAJOR: Baron identity is broken: duplicate faces, a wrong winner photo and an empty ledger
- **Wrong:**
  - **21-game-over** (both viewports) prints **"Ben wins!" under the cloche-hat woman's portrait**, the same face Ada had. This is the game's climax frame.
  - Human seats share that portrait (Ada and Ben in 19 and 23; Player 1 and Player 2 in 04-game-6).
  - "Jack Tolliver" and "Jack Tolliver II" share a face and a name (04-game-6).
  - The desktop ledger is about 330 × 330 px of blank cream on turn 1 (05-board, 50-table-3d), still the largest and emptiest element on screen.
  - On phones, 85–110 CSS px of dead brown sits under the baron chips in every board shot (05, 12, 12b and 26 mobile).
- **Benchmark does better:** `ttr-1.jpg` has distinct portrait cards with big numerals, and `new-monopoly-3.jpg` keeps each player's deeds beside them.
- **Fix:**
  - A portrait pool of at least 6 human portraits (mixed) and at least 2 per archetype, with no repeats in one game, and distinct AI names.
  - On game over, use the winner's own portrait.
  - Collapse the ledger to its last 3 lines, with an expander. Give the reclaimed width to the canvas on desktop, and on phones give the dead band to the board's height.

### 4. MAJOR: The top-hat token, and 3D buildings that still read as slabs and beads
- **Wrong:**
  - **Top hat.** Seat 2's token is labelled and modelled as a "Top hat" (`src/js/data.js` TOKENS; the pewter hat on Majestic Hotel in 40-built-board, both renderers). It is the single most recognisable piece of the genre's trademark game. The m3 originality rules forbade it, and the About screen claims none of any commercial game's elements are used.
  - **3D buildings** at play distance (12-resort right, left and bottom crops, desktop and mobile): every bathhouse is a red hip-roof slab. The dome level reads as a teal bead. The Grand Resort on Percival's Cabins is a bigger red roof lying over the vignette. Nothing says "Grand Resort", and you count red rectangles to read levels.
  - In 2D, the Percival's resort tower overhangs the tile top and the map seam.
- **Benchmark does better:** `catan-2.jpg` uses settlement and city silhouettes that read at any zoom, and `monopoly-go-2.jpg` makes the top upgrade a celebrated set-piece.
- **Fix:**
  - Replace the hat with a period-local piece: a bath-attendant's towel stack, a fedora with a band, or a Mountain Valley water bottle. Update the owner-disc glyph to match.
  - In 3D, raise the camera-facing silhouette:
    - Taller pale-stucco walls with a visible arcade.
    - A green roof for the hotel level.
    - A dome with a lantern that rises clearly above the roofline.
    - A twin-tower Grand Resort that *replaces* the stack, fills the lane and flies a seat-colour pennant.
  - Clamp the resort footprint to the lane in both renderers, with a layout assertion.

### 5. MINOR: Ownership uses two colour languages
- **Wrong:**
  - The board marks Ada's lots orange, but her HUD swatches are red, because the HUD uses district colours (40-built-board HUD crop).
  - Seat 3 green runs against the Ballparks teal hatch, and seat 1 orange against the Bathhouse Row red hatch (40-built-board left and right crops).
  - The owner discs are still about 6 px.
- **Benchmark does better:** `catan-2.jpg` uses a few saturated, well-separated seat hues, and `new-monopoly-2.jpg` uses a large owner badge.
- **Fix:**
  - Make the HUD swatches seat-coloured slivers grouped by district, and add a seat-colour rim to each baron card.
  - Move seat hues at least 30° from every district hue, or mute and pattern the district bands.
  - Hovering or long-pressing a baron card highlights their lots.

### 6. MINOR: Lighting is still flat, and seasons are still labels
- **Wrong:**
  - 05 and 12-resort (3D): directionless board light, no varnish sheen and no seam AO.
  - The night neon is a 1–2 px magenta line with no glow (28-dark crop), and there are no lit windows on the map.
  - January, June and July are the same scene (05, 12-resort, 14-season-summer).
  - 2D is a flat print.
- **Benchmark does better:** `carcassonne-1.jpg` and `new-monopoly-1.jpg` use a warm directional key on glossy wood, and `wingspan-1.jpg` uses ambient mood art.
- **Fix:**
  - A low-roughness varnish layer with a grazing highlight.
  - Baked AO in the tile grid.
  - Emissive neon tubes with a 4–6 px halo on desktop.
  - A per-season colour grade.
  - Instanced props: tubs on Central Ave in June, horses on the Oaklawn oval in racing season, and lights in November and December.
  - In 2D, a radial lamp vignette and a 6 px bevelled board edge.

### 7. MINOR: Money moments are not proven
- **Wrong:** `pop()` and `coins()` exist, but no frame in either suite shows a payment. Coins fly token-to-token, not into the payer's and payee's HUD cards. Rent is still announced as a rail line ("Ada pays $30 rent", 23-common).
- **Benchmark does better:** `new-monopoly-4.jpg` shows a "Pay" card from player to player.
- **Fix:**
  - Capture a mid-flight frame in the suite (for example 23b-rent-flight).
  - Land the coins on the HUD cards and count the numerals.
  - Slide a deed sliver into the buyer's card on purchase.

### 8. MINOR: The map centre is still crowded by props
- **Wrong:**
  - The "BATHHOUSE BARONS" banner still takes the top sixth of the map in every shot.
  - The felt tray sits on West Mtn and Central Ave.
  - In 2D the dice tumble out of the tray across "HOT SPRINGS WATER CO." (2D 43-dice-tumble).
  - The Gazette shows the placeholder in June (12-resort, 15-headline).
- **Benchmark does better:** `new-monopoly-1.jpg` keeps its centre as live world.
- **Fix:**
  - Shrink the banner to a corner cartouche.
  - Constrain the dice throw to the tray rectangle.
  - Print the most recent headline on the Gazette once one has been drawn; use the placeholder only before the first.

### 9. MINOR: Typography leftovers
- **Wrong:**
  - "GAME PRICE" and "GAME EFFECT" pills.
  - "(approximate)" in every lot pin caption ("Site of Ostrich Farm (approximate)" in 08; Percival's in 23-common, covering "WHITTINGTON AVE").
  - "January · Year 1 · month 1 of 12" wraps to two lines (04-game-6 and 22-short, both viewports).
  - The mobile header truncates its season chips ("Summer visitor…", 12b mobile).
- **Fix:**
  - Move "approx." to the deed footnote.
  - Shorten the header to "Jan · Year 1 · 1/12".
  - Collapse the chips to an icon plus multiplier when more than one is active.

### 10. MINOR: The 2D phone board abbreviates and clips
- **Wrong (2D mobile 40-built-board):**
  - Abbreviated tiles: "TALK", "GATORS", "MOTOR CTS", "MAJESTIC PK", "WATER CO.", "RAILROAD", "CABINS", "WATER TAX", "VAPORS".
  - "Payday $150 ›" is clipped at the board's bottom edge.
  - The dial overlaps "PLEASANT ST".
- **Benchmark does better:** `monopoly-mobile-1.jpg` keeps full names on a dense phone board.
- **Fix:**
  - Two-line condensed names at about 10 CSS px.
  - Lay out the corner subtitles inside the corner art box.
  - Move the dial into the empty forest at the upper right.

### 11. MINOR: Title-screen polish
- **Wrong:**
  - "Continue" with no save is a muddy translucent pill (01-title, both viewports).
  - On desktop, "About" falls below the 800 px fold (desktop-01 sheet).
- **Fix:** hide "Continue" when there is no save, and tighten the poster height so every button sits above the fold.

---

## Verdict

**Yes, MAJOR gaps remain: four of them.**
1. The phone and move cameras still slice tiles, dice and the Gazette.
2. Setup, auction, trade and game over are still web forms, and the deed and cards keep their debug tags.
3. Baron identity is broken. Duplicate faces, including **"Ben wins!" under a woman's portrait**, and the blank ledger.
4. The **top-hat** token is an originality risk, and the 3D buildings still read as slabs and beads.

The art direction is strong enough for the 8+ tier. Every MAJOR gap is in the framing, the game objects and the non-board screens. Fixing gaps 1–4 is the shortest path to about 7.5.
