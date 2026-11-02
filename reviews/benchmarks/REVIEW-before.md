# Bathhouse Barons: adversarial visual review (before the visual pass)

Reviewer stance: independent and deliberately harsh. The benchmark tier (NEW MONOPOLY, Marmalade's mobile MONOPOLY and Ticket to Ride, Catan Universe, Wingspan, Carcassonne) is 9–10. A competent but plain web UI scores about 5.

Material reviewed: all 11 contact sheets in `screenshots/visual-before/sheets/`. Full-size desktop shots: 01-title, 05-board, 09-auction, 11-deed, 12-resort, 15-headline, 21-game-over, 25-input-after, 26-animating, 28-dark. Full-size mobile shots: 05-board, 12-resort, 15-headline, 26-animating; the other mobile screens (09, 11, 01, 21, 28) were checked on the sheets at near-full size. Benchmarks opened: new-monopoly-1/2/3/4, monopoly-mobile-1/2, monopoly-go-1/2, ttr-1/2, catan-2, carcassonne-1, wingspan-2, rento-3, richup-1, plus SOURCES.md for the rest.

---

## Scores

| # | Category | Score | One-line verdict |
|---|---|---|---|
| 1 | Art (board, pieces, illustrations) | **3** | Flat line icons, repeated per district, on a brick-wallpaper centre. No illustration anywhere except a toy-block title strip. |
| 2 | Lighting and materials | **1.5** | None. It is a CSS grid on a cream page. No table, no thickness, no shadows (except a faint one under the dice), no material response. |
| 3 | Animation and game feel | **3** | Dice tilt a few degrees, a token lands, and a pill toast appears on top of the tiles. No throw, no hop, no money flow, no build moment. |
| 4 | UI (panels, buttons, dialogs, HUD) | **5** | Consistent, functional and keyboard-friendly. Underneath it is a web form: outline buttons, plain white modals, a bare-table game-over screen and large dead space. |
| 5 | Typography | **5** | The geometric sans plus book serif is a decent pairing, but tile names are 10–11 px and wrap to three lines. There is a spacing bug ("January ·Year 1") and too many sizes and weights. |
| 6 | Readability (ownership, buildings, state) | **4** | Ownership is a 4–6 px numbered tab on whichever edge is free. Buildings are tiny glyphs. A mortgage "M" covers the lot name. Toasts and tokens sit on top of names. |
| 7 | Mobile (portrait) | **5** | It fits and the buttons are big, but tile names are abbreviated ("Talk", "Motor Cts", "Majestic Pk"), player names are truncated, about 15% of the screen is empty, and the header chips wrap and shove the board down. |
| 8 | Authenticity of setting | **5** | The text is excellent: real lot names and sourced history on every card. The visuals say nothing about Hot Springs. The place, the eras and the architecture are absent from the board. |
| | **Overall** | **3.8 / 10** | A well-built rules engine in a spreadsheet's clothes. Against the benchmarks it reads as a prototype, not a product. |

---

## What already works: keep it

1. **The sourced history.** Headline and Town Talk cards carry a real fact plus a citation and a separate GAME EFFECT box (15-headline, 16-town-talk, 24-deed-fact). This is the game's identity and its strongest asset. Keep the split between the fact and the boxed effect in every redesign.
2. **The real lot list.** Fordyce, Buckstaff, Hale, Arlington, Majestic, Eastman, Ohio Club, Southern Club, Vapors, Whittington Park, Fogel Field, IQ Zoo, Alligator Farm, Mountain Valley, Diamond Jo Railroad, the Grand Jury Room, the Depot. Do not rename them for layout convenience (mobile currently does: see gap 11).
3. **Season multiplier chips** (`▲×1.5` / `▼×0.5` on district edges, 14-season-racing, 31-resumed). They are clear and glanceable. Carry them into any 3D version as physical tokens or decals.
4. **District hatch patterns.** They are a real colour-blind aid. Keep a non-colour channel for every district.
5. **Button hierarchy and keyboard hints** (`Roll [R]`, `Manage [M]`, `Trade [T]`). The primary action is always obvious, and every action has a button for touch (02-help-controls).
6. **Accessibility settings.** Reduced motion, text size up to 150%, theme, and AI speed (30-settings). Contrast tests pass in both themes (report.json). Any new renderer must honour reduced motion and text size.
7. **The month dial concept.** A J-F-M… ring with the current month highlighted is a good, original calendar device. It should shrink and become a physical object, not leave.
8. **Town ledger.** A full readable history is valuable. It should be restyled and collapsed, not removed.
9. **The 360-degree playable board on a phone** without horizontal scroll, and a clear modal focus ring.

---

## Ranked gap list (most important first)

### 1. No table, no object, no light: it does not read as a physical game
- **Wrong:** every in-game screen (05-board, 12-resort, 28-dark, and mobile 05-board) is a flat CSS grid on a cream page background. The board has no thickness, no edge, no shadow and no surface under it. The dice have a faint drop shadow and that is the only depth in the game. The dark theme is a palette swap, not a lighting state.
- **Benchmark does better:** `new-monopoly-1.jpg` and `new-monopoly-4.jpg` show a board slab on a lit wooden table with soft daylight and contact shadows. `carcassonne-1.jpg` and `catan-2.jpg` show glossy wood, tiles with bevels, and pieces casting shadows.
- **Fix:** move the play area to a three.js scene; the sibling games football, baseball, basketball and fishing already ship three.js and Blender pipelines, so reuse them. The board becomes a 3–4 mm cardstock slab with a bevelled edge, a printed-paper texture with faint fibre, and a satin varnish. Put it on an *original, place-specific* surface: a 1920s bathhouse-lobby marble counter or a mahogany card table on felt. Do not use a garden patio, which belongs to NEW MONOPOLY. Use one warm key light, baked AO and a single soft shadow map for tokens, dice and buildings only. Night theme = lamp-lit table with the clubs' neon glowing, not a navy CSS swap.

### 2. The board's centre is wasted on a logo and brick wallpaper
- **Wrong:** about 45% of the board area (05-board) is a brick-pattern fill with "BATHHOUSE BARONS / an original game" in large type, on every turn, forever. It gives no information and no sense of place.
- **Benchmark does better:** in `new-monopoly-1.jpg` and `new-monopoly-3.jpg` the centre is a living 3D city. `monopoly-mobile-1.jpg` has a dense town in the centre. `ttr-1.jpg` uses a premium painted terrain map as the whole playfield.
- **Fix:** make the centre a **diorama of the real Hot Springs valley**. Central Avenue runs up the narrow gorge, with Bathhouse Row's line of eight bathhouses on one side, Hot Springs Mountain and its tower above, the Arlington's twin towers at the head of the row, Oaklawn's grandstand to the south and a sliver of Lake Hamilton. Build the terrain from USGS DEM data, as Ouachita Bass Classic already does. The diorama is the *state display*: lots that players own glow in the owner's colour, built lots get their buildings, and season changes swap props (horses at Oaklawn in racing season, Garvan Gardens holiday lights in Nov/Dec, tubs on Central Avenue in June). Shrink the month dial and current Headline into a small brass calendar plaque and a folded newspaper lying in one corner of the centre. A winding real valley avoids the skyline-in-a-square look of the benchmarks, so it stays original.

### 3. Ownership cannot be read at a glance
- **Wrong:** an owned lot shows a tiny numbered coloured tab on whichever edge is outermost: the top for Pythian in 25-input-after, the left for Fogel Field, the bottom for IQ Zoo, and the far right for Hale/Buckstaff in 12-resort. Seat colours are only 4–6 px wide. With 6 players (04-game-6) you cannot tell who owns what without reading the digits. The seat-1 orange and the Grand Hotels mustard band also clash.
- **Benchmark does better:** `new-monopoly-2.jpg` floats a large owner badge (token portrait) over owned lots. `catan-2.jpg` makes ownership read from across the room through big, saturated, shadowed pieces. In `new-monopoly-3.jpg` each player's deeds sit visibly beside them.
- **Fix:** an owned lot gets a full-width owner band in the seat colour across the inner edge, plus a small standing **owner flag or marker** with that seat's token glyph, so colour is never the only channel. Keep the district band and owner band on different edges and at different saturations. Hovering or long-pressing a player chip highlights all of their lots and dims the rest. Put the same flags on the diorama.

### 4. Buildings are illegible and inconsistent
- **Wrong:** in 12-resort a bathhouse is a 10 px house glyph stuck on the district band. Belding's Inn shows a three-house glyph strip, while Hale and Buckstaff show single glyphs on the *inner* edge, and you cannot tell whether a strip means one building or three. A Grand Resort is a letter "R" in a box (Percival's Cabins, Fordyce). Building is the core payoff of the genre, and here it is invisible.
- **Benchmark does better:** `new-monopoly-2.jpg` places a chunky 3D hotel on the lot with an owner badge. `monopoly-go-2.jpg` turns a build into a glowing, celebrated set-piece. `catan-2.jpg` makes settlements and cities different silhouettes.
- **Fix:** create Blender-modelled **miniatures**: a small bathhouse in 1–3 copies (stucco and terracotta, with a different facade style per district family) and a **Grand Resort** as a clearly taller twin-tower piece with a flag. Place them physically on the lot's band, with a numeric pip beside them for accessibility. A build animation drops the piece in with a steam puff and a chime (reduced-motion: a 150 ms fade). Instance the meshes so 32 lots × 4 pieces costs nothing.

### 5. Generic, repeated, sometimes wrong iconography
- **Wrong:** all three motels have the same car icon, all three ballparks the same ball, all three clubs the same die, all three hotels the same key, and all three bathhouses the same steam glyph. IQ Zoo, Alligator Farm *and* the Ostrich Farm share one lizard glyph, so the ostrich farm is drawn as a lizard (05-board). Corners use clip-art gavel and steam bowl icons. Nothing distinguishes the Fordyce from the Hale, although they are among the most recognisable buildings in Arkansas.
- **Benchmark does better:** in `ttr-1.jpg` and `wingspan-2.jpg` every element has bespoke illustration with a consistent hand. `carcassonne-1.jpg` and `catan-2.jpg` give every tile type its own painted terrain.
- **Fix:** give each lot its own small **vignette**, either rendered from the diorama models or painted in one consistent style: the Fordyce's arched facade, the Arlington's towers, the Majestic's yellow brick, an ostrich for the Ostrich Farm, an alligator for the Alligator Farm, a performing animal for IQ Zoo, the Tower Motel's sign, a narrow-gauge engine for the railroad. Keep the district glyph only as a small corner badge. Redraw the corners: the Depot as a real 1890s station platform, the Grand Jury Room as a courtroom bench, the free Bathhouse corner as a tiled tub with steam.

### 6. Dice and movement have no weight
- **Wrong:** the dice are two flat cream squares inside the month ring, about 60 px on desktop. In 26-animating they only tilt about 15°. Tokens appear on the target tile with no visible hop, path or landing. Nothing physical happens between pressing Roll and the result.
- **Benchmark does better:** in `new-monopoly-2.jpg` rounded 3D dice tumble mid-air with motion and shadows. `monopoly-go-1.jpg` has throw arcs, sparkle trails and a big GO button. In `monopoly-mobile-1.jpg` oversized glossy dice dominate the roll moment.
- **Fix:** use 3D ivory or bakelite dice with inset pips and rounded edges, thrown onto the *table* beside the board. Use pre-baked tumble tracks chosen so they land on the RNG result, not live physics, which keeps it deterministic and cheap. Add a clack sound and a short contact shadow. The token **hops tile to tile** with an arc, slight squash and a tile-press, and the camera eases to follow on mobile. Doubles get a flourish. Reduced-motion mode snaps the result and slides the token. Total roll-to-landing should stay at or under 1.2 s, with tap-to-skip.

### 7. Event feedback is a toast laid over the board
- **Wrong:** "Cornelius Vane buys Alligator Farm" (26-animating) covers the Town Talk and Percival's Cabins names. "Ada pays $12 rent" (11-deed) and "Ada pays $30 rent" (23-common) sit on the Depot and Percival's tiles. On mobile the toasts float over the player chips (18-bankrupt, 26-animating). A rent payment, the most important social moment in the genre, is a grey pill.
- **Benchmark does better:** `new-monopoly-4.jpg` shows a banknote card ("Pay −180, from → to") plus a name badge over the payee token. `monopoly-go-1.jpg` uses big banner callouts.
- **Fix:** **Money moves.** Coins or banknotes fly from the payer's chip to the payee's chip, red −$ and green +$ figures rise, and both cash numerals count up and down. A purchase slides a deed card from the tile into the buyer's panel. Text notifications go to a fixed event rail outside the board: below the header on desktop, above the action bar on mobile. They never cover tiles.

### 8. Cards and dialogs are white web modals
- **Wrong:** Headline (15-headline), Town Talk (16-town-talk), deed (11-deed, 24-deed-fact), auction (09/10), trade (19), raise cash (18) and manage (12-manage) all use the same white rounded rectangle on a grey veil. The Headline about the Great Fire of 1913 has the same visual weight as a settings box. The auction is a bulleted list.
- **Benchmark does better:** in `ttr-2.jpg` cards fan over the map with clean borders and soft shadows, and the board stays visible. `wingspan-2.jpg` dims the table and lifts a real card with stock texture. `monopoly-mobile-2.jpg` shows the deed as a real card with a rent ladder and building icons. Even the dated `rento-3.jpg` pairs the property card with a live colour-coded bid ladder.
- **Fix:**
  - **Headline:** a period newspaper front page with an *original* masthead, not a real paper's, and era-correct type: 1870s Victorian, 1920s deco, 1950s modern according to the event year. It drops onto the table and unfolds.
  - **Town Talk:** a vintage postcard that flips over, with the fact on the back.
  - **Deed:** a card with the lot vignette as its header and the rent ladder drawn with the actual bathhouse and resort icons. Bathhouse Row leases become a federal lease document with a seal, so they read differently from private lots.
  - **Auction:** each baron holds a bid paddle, a large current-bid numeral sits in the centre, and a gavel strikes on close.
  - Dim the board with a blur, not a flat grey veil, and keep the relevant tile highlighted behind the card.

### 9. The player HUD is a spreadsheet
- **Wrong:** in 05-board the right column is four cards of "Human · 0 lots · worth $1,200" in 11 px grey. Below them, the ledger leaves about 50% of the panel blank. AI personalities ("Speculator", "Banker", "Hotelier") have no visual character. The active-turn state is a thin red outline.
- **Benchmark does better:** `catan-2.jpg` gives each player a colour banner with a portrait and resource counts. `ttr-1.jpg` uses portrait cards with big numerals. `monopoly-mobile-1.jpg` has a token-and-cash rail with a ribbon for the active player.
- **Fix:** **baron cards** with an illustrated period portrait per archetype (Hotelier, Gambler, Banker, Preservationist, Showman, Speculator), a large tabular-figure cash numeral that counts, and a mini fan of owned deeds coloured by district. The active baron's card is raised and lit. Collapse the ledger into a "Town ledger" newspaper column with small icons, and size the panel so it has no dead area. Show "is thinking…" as an animated state on the AI's card, not a line of italic text.

### 10. Typography: too small, too many sizes, one recurring bug
- **Wrong:**
  - Board tile names are about 10–11 CSS px and wrap to three lines ("Diamond / Jo Railroad / $200", "Hot Springs / Water Co. / $150").
  - The month header reads "January ·Year 1", with a space before the middle dot and none after, on every screen, desktop and mobile.
  - The secondary meta text on player cards is about 11 px grey on cream.
  - The board uses at least six text sizes.
  - "GAME PRICE" is a boxed micro-tag that looks like a debugging label (11-deed).
- **Benchmark does better:** `monopoly-mobile-2.jpg` uses a two-weight deed hierarchy with big numerals. `wingspan-1.jpg` and `wingspan-2.jpg` use one display face and one body face with strong contrast and generous size.
- **Fix:**
  - Bundle two OFL fonts offline: a period display face (a 1920s deco or grotesque condensed caps) for tile names and headings, and a humanist sans with **tabular figures** for money.
  - Set tile names in condensed caps on a single line with the price below, at a minimum of 12 px on desktop. In 3D, render the tile-face atlas at 2× and use anisotropic filtering.
  - Fix the "·" spacing.
  - Replace the "GAME PRICE" tag with "Lease $300" or "Price $300" in the card's own type.
  - Keep the book serif only for the history quotes.

### 11. The mobile layout abbreviates, truncates and wastes space
- **Wrong:**
  - Mobile 05-board renames lots to fit: "Talk", "Motor Cts", "Majestic Pk", "Water Co.", "Gators", "Railroad", "Cabins". "Talk" for Town Talk and "Gators" for Alligator Farm lose the setting.
  - Player chips truncate to "Odessa …" and "Corneliu…".
  - About 15% of the viewport below the chips is empty.
  - When a third season chip appears, the header wraps to two lines and the whole board jumps down 40 px (15-headline, 31-resumed).
  - Every dialog covers the whole board (09-auction, 11-deed, 12-manage), so you can't see the lot you are bidding on.
  - The rolled dice are about 45 px.
- **Benchmark does better:** `monopoly-go-1.jpg` fills the portrait screen with the board and one huge primary action. `monopoly-mobile-1.jpg` uses a compact token-and-cash player rail.
- **Fix:**
  - Use a tilted 3D camera that frames the *active quarter* of the board around the token, with tap-a-tile to zoom and a "whole board" toggle. That buys room for full lot names in condensed caps.
  - Turn the player chips into a single horizontal strip of token avatar + cash, with the name on tap.
  - Make Roll one big full-width button, with Manage and Trade as secondary icons.
  - Collapse the season chips to icons with a fixed-height header so it never reflows.
  - Turn dialogs into **bottom sheets** at ≤60% height so the relevant tile stays visible above.
  - Use the dead bottom space for the action sheet.

### 12. Mortgage and other state overlays destroy the text they mark
- **Wrong:** a mortgaged lot gets a grey hatch and a giant "M" printed over its name and price: Majestic Hotel in 12-resort, on both desktop and mobile. The Grand Jury token sits on top of the gavel art (06-moved, 17-hearing). Tokens cover lot names and prices (25-input-after: Pythian, Streetcar).
- **Benchmark does better:** `new-monopoly-3.jpg` keeps tile text clear and puts tokens and markers in their own lane. `catan-2.jpg` places pieces on edges and vertices, never over number chips.
- **Fix:** show a mortgaged lot as **flipped face-down or desaturated**, with a small diagonal red "MORTGAGED" ribbon in one corner, and keep the name readable. Give each tile a token lane on its inner half, with auto-fanned stacks of up to 6 tokens, so names and prices are never covered. At the corners, tokens orbit the art instead of covering "Payday $150".

### 13. Tokens are flat badges with generic glyphs
- **Wrong:** the pieces are coloured discs with a flame, top hat, horseshoe or umbrella glyph and a number superscript (05-board). At the Depot four or more stack into an unreadable cluster that overlaps "Payday $150".
- **Benchmark does better:** `new-monopoly-2.jpg` and `new-monopoly-4.jpg` use sculpted metal tokens with real material, and `carcassonne-1.jpg` uses chunky meeples with shadows.
- **Fix:** six **original 3D tokens tied to the town**, in pewter on a seat-coloured base ring: a mineral-water jug, a racing horseshoe, a bath-attendant's towel stack, a gangster-era fedora, an alligator and a steam whistle. Keep the number pip for accessibility. Use the same glyph on the owner flags (gap 3) and baron cards (gap 9).

### 14. The title and game-over screens are bare web pages
- **Wrong:** 01-title is a 560×210 strip of box buildings, blue rectangle windows and a stick tower, then five full-width outline buttons on an empty page. 21-game-over is an HTML table with "$0" columns and two buttons in the top-left of a blank screen. The first and last impressions are the weakest screens in the game.
- **Benchmark does better:** `monopoly-go-2.jpg` makes a celebratory set-piece out of a single moment. `carcassonne-1.jpg` and `wingspan-1.jpg` stay "in the world" even in the menus.
- **Fix:**
  - **Title:** the valley diorama at dusk with steam rising from the springs and the Row's lights coming on. The logo is a period enamel sign, and the menu is a small brass-and-wood panel.
  - **Game over:** the camera flies to the Arlington lobby table, the winner's token stands on a raised plinth, and an extra-edition newspaper headline announces the result, with the standings as a column of baron cards with their stats.
  - Both screens get the existing reduced-motion fallbacks.

### 15. The dark theme is a palette swap that clashes
- **Wrong:** 28-dark puts coral-red "BATHHOUSE BARONS" on navy, which vibrates. The gold Roll button gets a cyan focus ring, a third accent. The pastel district patterns look washed out on navy, and the brick texture disappears, so the centre is just a void.
- **Benchmark does better:** `richup-1.png` is a coherent dark board: one hue family, rounded tiles and accent colours tuned for dark.
- **Fix:** make "Neon night" a **lighting state** of the same scene. The table lamp goes warm and low, the Ohio Club, Southern Club and Vapors tiles get a neon-tube emissive, and the valley diorama shows lit windows. Unify the focus ring to a single accent per theme, and retune the district colours for dark rather than reusing the light values.

### 16. Season and Headline effects live in chips and text, not in the world
- **Wrong:** "Racing season ×1.5 Grand Hotels", "Spring training ×1.5 Ballparks" and "Holiday Lights ×1.5 Park Avenue" show as small chips and a ring highlight (14-season-racing, 14-season-summer). The board looks identical in January and July.
- **Benchmark does better:** `wingspan-1.jpg` uses ambient environment art to set mood, and the `new-monopoly-1.jpg` city gives a sense of life.
- **Fix:** keep the chips (they work), and also let the season **change the scene**: light temperature (winter grey-blue, summer gold), a racing pennant on Oaklawn, baseballs and bunting at Whittington Park in Feb/Mar, a tub race on Central Avenue in June, holiday lights in Nov/Dec. Affected district bands pulse once when a month turns. These are cheap to do with baked variants and emissive toggles.

---

## Rendering recommendation

**Recommended: a hybrid, using full WebGL (three.js) for the table, board, pieces and centre diorama, with the existing DOM kept for all UI and as the fallback board.**

Why:
- The three biggest gaps (1, 2, 4) are lighting, depth and a living centre, which can't be reached in flat 2D at benchmark quality. A pre-rendered 2D board with 3D-rendered sprites can fake the table, but it can't do the tilt and zoom camera that the mobile fix (gap 11) needs.
- The collection already ships three.js and Blender pipelines (football, baseball, basketball, fishing, and the USGS terrain workflow), so the risk and tooling cost are low.
- Text, dialogs, accessibility, keyboard control and the existing tests stay in DOM, which is where they are crisp and testable.
- The current 2D board remains the reduced-motion, low-power and "no WebGL" path, and the a11y reference.

Performance budget, to hold 60 fps on a mid laptop and 30+ fps on phones:
- **Render on demand:** only tick while a camera move or animation is active. An idle board costs zero.
- **Lighting:** baked lighting and AO for the board, table and diorama. Use one directional shadow map, 2048 px on desktop and 1024 px on phone, for dynamic pieces only. On phones, use contact-shadow blobs instead of the shadow map.
- **Geometry and textures:** keep under about 150k triangles for the diorama. Instance the buildings, tokens and flags. Use one texture atlas for the 32 tile faces, generated at runtime from the existing SVG and HTML layout, so state and text stay in sync and offline.
- **Pixel ratio:** cap DPR at 2 on desktop and 1.5 on phones.
- **Dice:** pre-baked tumble keyframes, with no physics engine.
- **Assets:** ship everything local, with fonts bundled as woff2.

Originality guardrails:
- No pale-green board.
- No skyline-in-a-square centre: use the real narrow valley instead.
- No garden-patio table.
- No "GO" arrow corner or ribbon banners copied from the mobile titles.
- Use original mastheads and tokens.
- Use the game's own deed layout: the federal lease versus private lot distinction is a natural, original hook.
