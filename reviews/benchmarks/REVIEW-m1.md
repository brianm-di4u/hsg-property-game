# Bathhouse Barons: adversarial visual review, milestone 1 (vis-m1)

Reviewer stance: independent and deliberately harsh. The benchmark tier (NEW MONOPOLY, Marmalade's MONOPOLY and Ticket to Ride, Catan Universe, Wingspan, Carcassonne) scores 9–10. A competent but plain web UI scores about 5. The baseline build scored 3.8 (`REVIEW-before.md`).

**Material reviewed**
- **3D (real GPU), full size.**
  - Desktop: 01, 05, 08, 11, 12-resort, 15, 16, 26-animating, 28-dark.
  - Mobile: 01, 05, 08, 11, 12-resort, 12b-whole-board, 15, 26-animating, 28-dark.
  - Enlarged crops of the right column, the left column, the far (top) row, the Depot tokens and the dice from 05 and 12-resort.
- **2D (software GL).**
  - Desktop, full size: 09-auction, 12-resort, 21-game-over, 24-deed-fact, 28-dark, 40-built-board, 43-dice-tumble.
  - Mobile, full size: 09-auction, 21-game-over, 28-dark, 40-built-board, 43-dice-tumble.
  - Contact sheets: desktop-01, 02, 05, 07, 08 and mobile-03. These cover title, help, setup, trade, short game, common ground, deed-fact, vector fallback, the 3D table in the harness, mobile 12/14/15/16/17/18, and 2D 15-headline and 16-town-talk.
- **Benchmarks:** new-monopoly-1, new-monopoly-2, catan-2 and monopoly-go-1 were opened. The rest were checked against SOURCES.md and the baseline review.

---

## Scores

Where the two renderers differ, the score is given as 3D / 2D.

| # | Category | 3D | 2D | One-line verdict |
|---|---|---|---|---|
| 1 | Art | **6.5** | **6** | A real leap. Every lot has its own painted vignette and the centre is a painted map of the actual valley. It is let down by generic box buildings, blob tokens, and untouched flat-vector title, setup and game-over screens. |
| 2 | Lighting and materials | **5** | **3** | 3D has a wood table, a board slab with thickness and soft contact shadows. The light is flat and even: no key-light direction, no varnish, no AO at the tile seams. In 2D the wood is only a page background behind a flat canvas. |
| 3 | Animation and game feel (from frames) | **5** | **4** | Dice are thrown and the mobile camera follows the token. Dice are small, soft and parked on the map, rent and buys have no physical moment, and the status text goes stale during moves. |
| 4 | UI | **5.5** | **5.5** | Headline (newspaper), Town Talk (postcard) and the deed header are themed now, and the event rail stopped the toasts covering tiles. The player HUD, ledger, auction, title, setup and game over are still web forms. |
| 5 | Typography | **6** | **6.5** | Condensed caps on one line, the "·" bug is fixed and the display face is good. The 3D far row is about 7 px and blurred. The "GAME PRICE" and "GAME EFFECT" debug-style tags survive, and names on the same row are set at different sizes. |
| 6 | Readability | **5** | **5** | The owner strip and digit are better than before but still thin. Buildings sit on the lot names, the mortgage ribbon collides with the season chip, and the map labels collide with the street names. |
| 7 | Mobile | **5** | **4.5** | The 3D close-up is the right idea but its framing crops lot names and spends about 15% on empty wood. 2D mobile still abbreviates ("TALK", "GATORS", "MOTOR CTS"). Truncated names, header reflow, full-screen modals and dead space at the bottom remain in both. |
| 8 | Authenticity of setting | **7.5** | **7.5** | Now clearly Hot Springs: a real street map, the Bathhouse Row facades, the Fordyce deed with a U.S. lease seal, the ostrich-farm postcard and the Gazette prop. The title screen's toy-block skyline is the only placeless thing left. |
| | **Overall** | **5.7** | **5.2** | **≈5.5 / 10.** Up from 3.8. It now looks like a themed board game rather than a spreadsheet. It does not yet look like a product: pieces, light, HUD, framing and the screens around the game are all below the board art. |

---

## Status of the baseline gaps (REVIEW-before.md)

| Baseline gap | Status | Note |
|---|---|---|
| 1. No table, object or light | **Partly fixed** | Table and slab exist in 3D. The lighting is flat and 2D has no slab. |
| 2. Centre wasted on a logo and bricks | **Mostly fixed** | Painted valley map, lot pins, Gazette prop and card decks. The "BATHHOUSE BARONS" banner still uses about 1/6 of the centre. |
| 3. Ownership unreadable | **Partly fixed** | Outer-edge seat strip plus a digit disc. Still about 6 px wide, and some seat colours sit next to district colours. |
| 4. Buildings illegible | **Partly fixed** | 3D minis and 2D sprites exist. They are generic, collide with text and do not tell 1, 2 and 3 apart. |
| 5. Generic iconography | **Fixed** | Bespoke vignettes for every lot and corner: ostrich, alligator, engine, courtroom, Depot. |
| 6. Dice without weight | **Partly fixed** | Thrown dice. Too small, soft, and parked on the map. |
| 7. Toasts over the board | **Partly fixed** | A fixed event rail now. No money-flow moment. |
| 8. White web modals | **Partly fixed** | Headline, Town Talk and deed are themed. Auction, trade, raise-cash and manage are unchanged, and every dialog is still a centred modal on a flat veil. |
| 9. HUD is a spreadsheet | **Not fixed** | Identical cards and an empty ledger. |
| 10. Typography | **Mostly fixed** | The "·" bug and the wrapping names are fixed. The tags remain, and the 3D far-row legibility is new. |
| 11. Mobile | **Partly fixed** | 3D close-up and whole-board toggle. Abbreviations (2D), truncation, reflow, full-screen dialogs and dead space remain. |
| 12. Overlays destroy text | **Partly fixed** | The mortgage ribbon replaces the giant M. There are new collisions (ribbon against chip, buildings against names, labels against streets). |
| 13. Flat tokens | **Partly fixed** | 3D tokens, but they read as glossy colour blobs. |
| 14. Title and game over are bare | **Not fixed** | Unchanged. They now clash harder with the painted board. |
| 15. Dark theme is a palette swap | **Partly fixed** | Night map. The coral title on navy and the cyan focus ring on the gold button remain, and there is no neon. |
| 16. Seasons not in the world | **Not fixed** | The map is identical in January (05-board) and June (12-resort). Only the dial moves. |

---

## What works and must be kept

1. **The painted lot vignettes.** One consistent hand, every lot distinct: the Fordyce's arches, the ostriches, the alligators, the narrow-gauge engine, the courtroom, the Depot platform (05-board, 40-built-board). This is now the game's visual identity. Do not dilute it with stock icons anywhere.
2. **The centre as a real map of Hot Springs.** It has the street names, Hot Springs Mtn, West Mtn, Central Ave, the racetrack oval and the lot pins. It is original and avoids the skyline-in-a-square look.
3. **The Gazette prop shows the live headline.** "Carpenter Dam" in 28-dark (3D) and "Record Bath Year" on mobile 14-season. With the physical Headline and Town Talk decks beside it, this is exactly the "state on the table" idea. Keep it and extend it.
4. **The Headline as an original newspaper** (masthead, dateline, sourced fact, boxed effect) and **Town Talk as a postcard with a 2¢ stamp and a vignette** (15-headline, 16-town-talk). These are strong and original.
5. **The federal-lease deed:** vignette header, "BATHHOUSE ROW · FEDERAL LEASE" kicker and the U.S. LEASE seal (11-deed, 24-deed-fact). It is an original hook. Push it further rather than replacing it.
6. **The fixed event rail** ("The town is quiet.", "Odessa Marlow buys Eastman Hotel"). Notifications no longer cover tiles.
7. **Condensed caps for tile names on one line with the price below** on desktop, and the fixed "January · Year 1".
8. **The 3D mobile close-up plus the whole-board toggle** (05 and 12b mobile). The concept is right; the framing is what's wrong (gap 3).
9. **The highlighted lot behind the auction** (gold outline on Ostrich Farm in 09-auction) and the map pin label for the lot in question.
10. **The mortgage ribbon** instead of the giant "M" (Arlington, 12-resort 3D).
11. **Renderer parity.** The same art in 3D, in 2D and in the `?art=0` vector fallback (42-vector-fallback), with the season chips, hatch patterns and keyboard hints all intact.

---

## Ranked gap list (most important first)

### 1. Buildings are generic red boxes that sit on top of the lot names
- **Wrong:**
  - In 12-resort (3D desktop and mobile) every bathhouse is the same small red-roofed box with a black window strip. Two or three of them stack into a vertical pile on the inner edge.
  - They overlap the first letters of the names: "EASTMAN" loses its E, the H of "HALE" is covered, and Majestic is covered too.
  - They spill onto the centre map frame.
  - The Grand Resort is just a bigger red box. On Fordyce and Percival's it hangs over the bottom row and the map.
  - The 2D sprites have the same problem (40-built-board, 12-resort desktop): the resort on Percival's Cabins overlaps the map edge, and the Belding's building sits over the tile's top edge.
  - You cannot count 1 versus 2 versus 3 at a glance, and the resort does not read as the climax piece. Building is the genre's payoff, and it is still the weakest element on the board.
- **Benchmark does better:**
  - `new-monopoly-2.jpg`: one chunky, clean building sits squarely *inside* the colour strip, with an owner badge, and never touches the type.
  - `catan-2.jpg`: settlement and city are different silhouettes you can read from across the room.
  - `monopoly-go-2.jpg`: the upgrade is a celebrated set-piece.
- **Fix:**
  - Give each lot a **building lane**, which is the district band itself, widened to about 22% of tile depth in 3D. It has three fixed slots that never overlap the name, vignette or price.
  - Model three **distinct** silhouettes in the game's own style, so they are not Monopoly houses:
    - a two-storey stucco bathhouse with an arched entry and terracotta hip roof;
    - a pale-brick variant for hotels and motels;
    - a **Grand Resort** that replaces all three: one wide twin-tower piece that fills the lane, with a flag in the owner colour on top.
  - Make the pieces about 1.4× their current size, using instanced meshes (32 × 4 instances is trivial). For 2D, render them from the same models as sprites.
  - Add a numeric pip ("2") on the lane for accessibility.
  - Build animation: drop and squash, a steam puff and a chime (reduced motion: a 150 ms fade).

### 2. Ownership still does not read at a glance, and seat colours fight district colours
- **Wrong:**
  - The owner marker is a roughly 6 px seat-coloured strip on the outer edge plus a 10 px digit disc (12-resort, 40-built-board).
  - Seat 4's pink sits directly beside the Clubs' magenta hatch (Majestic Park, Fogel Field and Whittington Park in 12-resort 3D, left column crop).
  - Seat 1's orange matches the Grand Hotels' brown-orange band family.
  - On the map the owner flags are a few pixels tall and pile up on Bathhouse Row (12-resort mobile).
  - Tokens cover the digit discs (Majestic Hotel in 40-built-board).
  - With 6 players (04-game-6) the top row is a stripe salad of seat and district colours.
- **Benchmark does better:** `new-monopoly-2.jpg` uses a big standing owner badge per owned lot, and `catan-2.jpg` uses saturated, shadowed pieces in a few well-separated hues.
- **Fix:**
  - Give every owned lot an **owner plaque**: a full-width seat-coloured bar under the price, carrying the seat's token glyph and number. In 3D it is a thin raised enamel plate.
  - Move the district identity to the inner band only, kept **muted and patterned**. Seat colours are **saturated solids** chosen to be at least 30° hue away from every district colour.
  - Hovering or long-pressing a baron card highlights that baron's lots and dims the rest.
  - Make the map flags 2× taller and cluster them per district with a count.

### 3. Mobile 3D camera framing crops names and wastes the frame on empty wood
- **Wrong:**
  - 08-buy-dialog (mobile) clips "AJESTIC PARK", "OT SPRINGS WATER CO.", "HITTINGTON" and "D JURY ROOM".
  - 26-animating (mobile) clips "PER C…" on the right and leaves about 110 px (13% of the canvas) of bare wood below the board.
  - 05-board (mobile) cuts a die in half at the left edge and leaves about 120 px of wood.
  - 12-resort (mobile) cuts off the bottom row entirely while the token being built on sits at Fordyce.
  - The camera frames "around" the token rather than the run of tiles the player is about to traverse.
- **Benchmark does better:** `monopoly-go-1.jpg` fills the portrait screen edge to edge with the track the token is on, with the dice and the action in frame.
- **Fix:**
  - Frame the **whole side of 7–9 tiles** the token is on (plus the next corner when the roll will turn it), fitting their outer edges to the canvas width with a 12 px margin.
  - Pitch the camera so the near board edge sits on the canvas bottom, so no wood shows below.
  - Clamp to the board's bounds so a tile is never half-visible.
  - Keep both dice inside the frustum: throw them into the visible part of the map.
  - Ease the camera along the path during the hop instead of cutting.

### 4. The mobile chrome below the board still wastes and truncates
- **Wrong:**
  - Player chips truncate ("Odessa Ma…", "Cornelius …", "Thaddeus …", "Lulu Delac…") in every mobile shot, 3D and 2D.
  - About 180–230 px of dead space sits under the chips (05, 12-resort and 28-dark mobile).
  - The header grows to two lines whenever two or three season chips appear, pushing the board down by about 32 px (12-resort and 28-dark mobile compared with 05).
  - Deed (11-deed mobile) and auction (09-auction mobile) are full-screen modals that hide the lot.
  - The 2D mobile board still abbreviates: "TALK", "GATORS", "MOTOR CTS", "MAJESTIC PK", "WATER CO.", "RAILROAD", "CABINS", "WATER TAX" (40-built-board mobile). "Just visiting" and "Payday $150" are clipped at the board's bottom edge.
- **Benchmark does better:** `monopoly-mobile-1.jpg` uses a compact token-and-cash rail, and `monopoly-go-1.jpg` has one huge primary action and no dead space.
- **Fix:**
  - **Player rail:** one row of token + cash pills. Show the name only for the active baron, at full width in the status bar.
  - Give the reclaimed height (about 200 px) to the canvas.
  - **Header:** fixed height, with season chips collapsed to icon + multiplier (▲×1.5). Show the full text on tap.
  - **Dialogs:** deed, auction, trade and raise-cash become **bottom sheets** at no more than 60% height, with the camera framing the relevant lot above.
  - **2D mobile:** two-line condensed names ("ALLIGATOR / FARM") at about 10 px, never abbreviations.
  - Lay out the corner subtitles inside the tile.

### 5. Title, setup and game-over are still bare web pages, now clashing with the painted board
- **Wrong:**
  - 01-title (both viewports) is the same flat-vector toy-block skyline with blue rectangle windows on a cream page, five outline buttons, and about 45% of the screen empty. The first impression is now the worst-looking screen in the game and is stylistically unrelated to the painted art.
  - 04-setup is a form on cream.
  - 21-game-over is an HTML table of "$0" cells with two buttons in the top-left, and the winner token is a render on a visible grey square that was never matted (mobile 21).
- **Benchmark does better:**
  - `wingspan-1.jpg` and `carcassonne-1.jpg` keep their menus inside the illustrated world.
  - `monopoly-go-2.jpg` makes the climax a celebration.
- **Fix:**
  - **Title:** the 3D table with the board at a low, slow orbit at dusk (2D: the painted map, cropped and vignetted). Use an original enamel-sign logo, with the menu as a small card stack on the table.
  - **Setup:** a row of baron cards. Each one has a token picker, a human/AI toggle and a personality, all in the deed and postcard card style.
  - **Game over:** an "EXTRA!" edition of the Barons' Gazette with the winner's token photo-plate, and the standings as baron cards showing their deed fans.
  - Matte every token thumbnail with alpha.
  - Keep the reduced-motion fallbacks.

### 6. The player HUD is still a spreadsheet, and the ledger is a blank half-panel
- **Wrong:**
  - 05-board desktop shows four identical cards reading "Human · 0 lots · worth $1,200" in 11 px grey, which wraps to a third line for AI barons.
  - The ledger below is about 330 px of empty cream (05-board, 12-resort, 40-built-board, 43-dice-tumble).
  - AI personalities have no visual identity, and the active state is a thin border.
  - The right column is about 40% of the desktop screen, and its weakest part is the largest.
- **Benchmark does better:**
  - `catan-2.jpg` has colour banners with portraits and a number strip.
  - `new-monopoly-3.jpg` shows each player's deeds visibly beside them.
  - `ttr-1.jpg` has portrait cards with big numerals.
- **Fix:**
  - **Baron cards:** a painted period portrait per archetype (Hotelier, Gambler, Banker, Preservationist, Showman, Speculator) in the vignette style. Add a large tabular cash numeral that counts up and down, and a mini **fan of deed slivers** in district colours.
  - The active baron's card lifts with a warm rim. "Thinking…" becomes an animated state on the card, not a separate pill.
  - The ledger collapses to its last 3 lines in the Gazette's type, with an expander.
  - Use the freed space to make the board canvas wider; on desktop the board can grow by about 120 px.

### 7. Money still has no physical moment
- **Wrong:** rent, purchases, Payday and taxes appear only as a line in the event rail ("Ada pays $30 rent" in 23-common) and a silent cash change. The rail fixed the occlusion problem, but the genre's central social beat, *someone pays someone*, is still invisible.
- **Benchmark does better:**
  - `new-monopoly-4.jpg` shows a "Pay" card from one player to another with a badge over the payee.
  - `new-monopoly-2.jpg` keeps banknotes physically on the table.
  - `monopoly-go-1.jpg` uses big callouts.
- **Fix:**
  - Coins or original-design banknotes fly from the payer's card to the payee's card, about 400 ms on a bezier.
  - Red −$ and green +$ floaters rise from the lot and both cash numerals count.
  - On a purchase, a deed card slides off the tile into the buyer's fan.
  - In 3D, a small stack of each baron's notes sits on the table edge in front of their seat.
  - Reduced motion: the numerals count with no flight.

### 8. The dice are small, soft and parked in the middle of the map
- **Wrong:**
  - In 3D the dice are about 30 px on desktop (05-board, dice crop), with soft edges, blurry pips and a weak contact shadow.
  - They stay on top of the map's Central Ave between rolls, covering the art (05, 12, 28-dark), and on mobile they are half off-screen (05 mobile).
  - The 2D dice in 43-dice-tumble are about 35–40 px and tumble across the Headline deck.
  - Nothing reads as a *throw* in any frame.
- **Benchmark does better:** `new-monopoly-2.jpg` has large rounded dice in mid-air over the table with motion and shadow, and `monopoly-mobile-1.jpg` puts oversized glossy dice at the centre of the roll moment.
- **Fix:**
  - Throw the dice from the active baron's side of the **table**: there is visible wood around the board in desktop 3D. They land in a dedicated **dice tray** area of the map (bottom-left, around the scale bar) so they never cover labels or decks.
  - Make them 1.6× larger, with crisp inset pips (a normal map or real geometry), a short bounce, and a clack.
  - After about 1.5 s they slide to the tray edge.
  - Doubles get a flourish.
  - In 2D, use the same tray, and keep the dice clear of the decks.

### 9. 3D sharpness: the far row is unreadable and the whole frame is soft
- **Wrong:**
  - In 05-board 3D desktop the top row ("PYTHIAN BATHHOUSE", "WOODMEN OF UNION", "SOUTHERN CLUB") is about 7 px and visibly smeared (top-row crop). The whole canvas looks slightly upscaled next to the crisp DOM panel.
  - "SOUTHERN CLUB" is set smaller than "OHIO CLUB" on the same row: auto-shrink makes the sizes inconsistent.
  - The steep perspective wastes the near-row resolution on wood.
- **Benchmark does better:** `new-monopoly-1.jpg` keeps tile type legible at an oblique angle through strong anisotropic filtering, high-resolution tile faces and a camera that favours the board.
- **Fix:**
  - Use anisotropic filtering at the renderer maximum (8–16) on the tile atlas, and a 2× atlas with mipmaps.
  - Render at device DPR (cap 2) while idle; render-on-demand makes this free.
  - Reduce the desktop tilt so the far row is no more than about 1.4× smaller than the near row, and offer a top-down "ledger view".
  - Fit names with a shared per-row size (or condensed width) instead of per-tile shrinking.

### 10. Lighting and materials are flat, and the night theme is a dimmer
- **Wrong:**
  - The 3D board is lit evenly from everywhere. There is no key-light direction, no sheen on the varnish, no AO in the tile seams, and no light falloff across the table.
  - The tokens are glossy plastic with no metal response (Depot crop).
  - The dark theme (28-dark 3D, both viewports) is a global dim over the same scene. The Ohio Club, Southern Club and Vapors have no neon, the board goes muddy, and the active-player card text drops to low contrast.
  - In 2D the board is a flat rectangle on a wood page background, with no edge, bevel or cast shadow (40-built-board).
- **Benchmark does better:**
  - `carcassonne-1.jpg` and `new-monopoly-1.jpg` have a directional warm key, glossy wood, bevelled tiles and real shadows.
  - `richup-1.png` shows a dark theme designed as its own coherent palette.
- **Fix:**
  - 3D: one warm directional key from upper-left, with a cool, low fill. Bake AO into the board's tile grid and add a subtle varnish roughness map so the key catches a sheen across the board.
  - Tokens get pewter or brass bodies (metalness about 0.8) with an enamel seat-colour base.
  - **Night:** a lamp-pool light (spotlight cone on the board, table fading to dark), emissive neon tubes on the three Clubs tiles, lit windows on the map, and the vignettes kept at full brightness inside the pool.
  - 2D: draw a 6 px board edge with a bevel highlight and a soft drop shadow onto the wood. Add a radial lamp vignette to the table.

### 11. Tokens read as coloured blobs
- **Wrong:** at play size the six tokens (a jug, a fedora, a horseshoe and others) are indistinguishable glossy lumps of seat colour. At the Depot four of them overlap into one cluster (05-board 3D, Depot crop; 43-dice-tumble 2D). The same blobs shrink to about 20 px icons on the player cards, where only the colour reads.
- **Benchmark does better:** `new-monopoly-2.jpg` uses silhouette-first metal tokens (the top hat is readable at any size), and `carcassonne-1.jpg` uses chunky meeples with clear shadows.
- **Fix:**
  - Exaggerate the silhouettes: a tall jug with a handle, a wide-brimmed fedora, an upright horseshoe, a long low alligator, a whistle with a pull-ring, and a stacked towel.
  - Use a metal body with a seat-colour base ring rather than an all-colour body, so the shape reads separately from the colour.
  - Scale them 1.3×.
  - Give each tile an inner **token lane** with auto-fanning (2×3 grid) so stacks never overlap.
  - Render the card icons as a front 3/4 view with a matted alpha.

### 12. Overlap and collision bugs on the board and map
- **Wrong:**
  - **2D:** the mortgage ribbon collides with the ×1.5 season chip ("MORTG▲×1.5" on Arlington in 40-built-board and Majestic in 12-resort).
  - **Map labels:** the "Eastman Hotel" label sits on top of "BATHHOUSE ROW" (28-dark 3D, both viewports), "Whittington Park" on top of "WHITTINGTON AVE" (52-fallback), and "IQ Zoo" on Whittington Ave (44-dice-landed).
  - **Common Ground:** the "Treasury $20" chip and "Percival's Cabins" label overlap the month dial (23-common).
  - **2D mobile centre:** the month dial covers "BATHHOUSE ROW" ("BATHHOUSE ROV"), and the title banner covers the "Hot Springs, Arkansas" subtitle.
  - **Tokens:** they cover the ×1.5 chips and owner digits (Majestic in 40-built-board, Hale in 12-resort 3D).
- **Benchmark does better:** `catan-2.jpg` never puts a piece over a number chip, and `new-monopoly-3.jpg` keeps tile text clear of markers.
- **Fix:**
  - Give each tile **reserved zones**: vignette, chip corner (top-right), ribbon corner (top-left), name and price, owner plaque, building lane, and token lane. Assert in a layout test that no two overlays intersect.
  - Map labels get collision-aware placement against the street-name boxes, with a leader line.
  - Move the month dial off Bathhouse Row: the map's upper-right forest is empty.

### 13. Disabled and in-progress states are broken-looking
- **Wrong:**
  - During a move the primary action is an illegible grey-on-grey pill ("Buy $100" in 26-animating 3D desktop and mobile) or an **empty** pill (43-dice-tumble on both viewports).
  - The status line still says "To roll" while the token is moving (26-animating, 43-dice-tumble).
- **Benchmark does better:** `monopoly-go-1.jpg` keeps a single, always-meaningful primary control.
- **Fix:**
  - While animating, replace the action row with one "Moving… (tap to skip)" control.
  - Disabled buttons keep their label at 3:1 contrast or more.
  - Update the status line to "Rolling" and then "Moving to Belding's Inn".

### 14. The dialogs are still centred web modals; the auction is a list
- **Wrong:**
  - Every dialog is a centred white box over a flat grey veil (11-deed, 15-headline, 16-town-talk, 09-auction, 19-trade, 18-debt).
  - The deed still uses the "GAME PRICE" micro-tag, and the rent ladder is a text table with no building icons (11-deed, 24-deed-fact).
  - "GAME EFFECT" is the same debug-style tag on every card.
  - The auction is a text list of "— in" rows with four buttons, and "Game price $100" is in 11 px grey (09-auction).
  - Trade uses native checkboxes and a native select (19-trade).
- **Benchmark does better:**
  - `ttr-2.jpg` fans cards over a still-visible board.
  - `wingspan-2.jpg` lifts a textured card from a dimmed (not greyed) table.
  - `monopoly-mobile-2.jpg` draws the rent ladder with house and hotel icons.
  - `rento-3.jpg` pairs the card with a live bid ladder.
- **Fix:**
  - Present Headline, Town Talk and deed as **card objects**: cardstock texture, no outer white modal frame, blur plus warm dim behind, and the lot kept highlighted.
  - Deed: "Price $400" in the card's own type, with a rent ladder using the actual bathhouse and resort miniature icons (1, 2, 3, then the resort).
  - Replace "GAME EFFECT" with a stamped "IN PLAY" rule or a ruled box heading in the card's typeface.
  - Auction: a baron row with a bid paddle per baron, a big central bid numeral and a gavel strike on close.
  - Trade: two facing deed fans with tap-to-move, and themed checkboxes.

### 15. The dark theme keeps the baseline's clashes
- **Wrong:**
  - The coral "BATHHOUSE BARONS" on a navy banner still vibrates (28-dark, 2D and 3D).
  - The gold Roll button still gets a **cyan** focus ring, a third accent (28-dark 2D, both viewports).
  - The pastel district hatches are washed out on navy.
  - In 3D mobile the active-player status card text drops to grey on grey (28-dark mobile).
- **Benchmark does better:** `richup-1.png` uses one hue family with accents tuned for dark.
- **Fix:**
  - Use one accent per theme: gold for the focus ring, primary button and active card.
  - Retitle in warm cream with a gold edge.
  - Retune the district hues for dark at about +10% lightness and −15% saturation.
  - Lock text contrast to 4.5:1 on the status card.

### 16. Seasons still do not change the world
- **Wrong:** January (05-board) and June (12-resort) look identical apart from the dial position and the header chips. "Running of the Tubs" in June has no tubs, and "Racing season" has nothing at the Oaklawn oval, which is right there on the map.
- **Benchmark does better:** `wingspan-1.jpg` sets mood with ambient environment art, and `new-monopoly-1.jpg`'s centre feels alive.
- **Fix:**
  - Light temperature per season (cool grey in winter, gold in summer).
  - Small animated props on the map: horses circling the oval in racing season, a tub-race pennant on Central Ave in June, bunting at the ballparks in Feb/Mar, and string lights on Garvan Gardens in Nov/Dec.
  - Pulse the affected district bands once when the month turns.
  - Emissive toggles and instanced sprites keep the cost negligible.

### 17. The centre banner still spends prime space on the logo
- **Wrong:** the "BATHHOUSE BARONS / Hot Springs, Arkansas" ribbon covers about 1/6 of the map on every turn (05-board, 40-built-board), hiding the northern valley. On 2D mobile it also hides its own subtitle.
- **Fix:** shrink it to a small cartouche in the upper-left corner of the map, like a real map's title block, and give the space back to the terrain and the owner flags.

---

## Performance and originality notes for the fixes

- **Originality:** everything above stays original.
  - No pale-green board, no GO arrow, no ribbon "ROLL!" banners and no skyline-in-a-square.
  - Buildings are period bathhouses, not Monopoly houses.
  - Owner plaques use enamel and token glyphs, not portrait badges copied from NEW MONOPOLY.
  - The Gazette and postcard formats are the game's own.
- **Budget:**
  - Instanced buildings, tokens and flags.
  - One shadow map for dynamic pieces only (1024 px on phones, contact blobs on low tier).
  - Baked AO.
  - Emissive night neon (no bloom on phones, or a cheap threshold bloom on desktop only).
  - Render on demand, so idle costs zero.
  - Anisotropic filtering and DPR 2 while idle are affordable because nothing renders between moves.
  - Everything ships locally: fonts as woff2, and textures as KTX2 or WebP.
