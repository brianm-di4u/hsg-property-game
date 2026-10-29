# Bathhouse Barons: report

An original roll-and-move property-trading game set in Hot Springs, Arkansas, for 2–6 local
barons (any mix of humans and AI). Single self-contained `index.html` (172 KB), built from `src/`
with `node shared/tools/inline.mjs games/property-game`. Nothing is committed; the coordinator
reviews and commits.

## What was built
- **Our own board.** 32 spaces on a square loop: 22 lots in eight town districts in place of
  color groups (Frontier Valley, Roadside Attractions, The Ballparks, Park Avenue, Pleasant
  Street, The Clubs, Grand Hotels, Bathhouse Row), two transit lines (Diamond Jo Railroad,
  Streetcar Line), Hot Springs Water Co., the Thermal Water Tax, two Town Talk spaces and four
  corners (The Depot / Payday, Grand Jury Room, Free Bathhouse, Summoned to the Grand Jury).
  Each district has a color, a pattern and an icon; owners show as a strip with the seat number.
- **Rules (all ours).** Buy or send to auction (open ascending, $10/$50/$100 steps); Bathhouse
  Row lots are **federal leases**: auction only, half-price opening bid, no mortgage, $10 ground
  rent at each Payday. Whole district doubles base rent and allows building: three
  **bathhouses**, then a **Grand Resort** (one level per lot per turn, sell for half). Mortgage
  at half, lift at half + 10%. Doubles roll again; third double → Grand Jury (pay $50, Pardon or
  roll doubles; third failure pays and moves). Debt → sell/mortgage or bankruptcy (to a baron:
  everything passes, mortgages included; to the town: lots return unbuilt).
- **Tourism calendar.** A month passes each round. Racing season (Dec–May, Grand Hotels ×1.5),
  Spring training (Feb–Mar, Ballparks ×1.5), St. Patrick's parade (Mar, Clubs ×1.5), Running of
  the Tubs (Jun, Row ×1.5), Summer visitors (Jun–Aug, Attractions ×1.5), Film festival (Oct,
  Hotels ×1.5), Holiday Lights (Nov–Dec, Park Ave ×1.5), Quiet winter (Jan–Feb, Attractions
  ×0.5); festival months raise the Water Co. Board badges show ▲/▼ with the multiplier.
- **Event decks from town history.** 26 Headlines (one per month, town-wide: fires of 1878, 1905
  and 1913 that spare brick Grand Resorts, the 1923 flood, the GI Revolt, the 1967 shutdown,
  Racetrack Opening Day, Record Bath Year …) and 16 Town Talk cards. Every card shows a cited fact
  and labels its effect "Game effect"; the one invented card (Reform Pardon) says it's fictional.
- **Modes.** Full game (last baron standing, optional 1–5 year limit), Short game (12 months,
  two random non-Row lots each, net worth wins), and the **Common Ground** variant inspired by the
  anti-monopolist rules of the public-domain Landlord's Game (1904): base rent, fares, the utility
  and taxes feed a treasury that pays every baron an equal dividend each month.
- **AI.** Six fictional personas (Speculator, Hotelier, Banker, Showman, Preservationist,
  Gambler) scoring property value, liquidity (a reserve scaled to the worst rents on the board)
  and threat (what a lot is worth to an opponent about to complete a district). They buy, bid,
  build, raise cash, handle hearings and propose and evaluate trades (swaps that complete both
  sides, or cash deals), getting more willing to deal as a game drags on.
- **UI.** Canvas board (cached static layer, render on demand, token hops, tumbling dice, money
  pop-ups, calendar ring and Headline postcard in the center) with DOM panels: turn bar, action
  bar with key hints, player cards, town ledger, and dialogs for deeds, auctions, trades (compose,
  incoming with a hand-the-device prompt), manage, debt, cards and the menu. Title with a drawn
  Bathhouse Row skyline, setup (2–6 seats), help (Rules, Seasons, Cards, Controls), settings,
  about, game-over ranking.
- **Polish.** WebAudio dice, coins, card flip, gavel, build knocks, fanfare (quiet, mutable);
  light "Gilded day" and dark "Neon night" themes; reduced motion; text 100–150%; AI speed;
  live-region narration; autosave and Continue.

## Acceptance criteria
| AC | Status | Evidence |
|---|---|---|
| AC1 title | met | screens › title; smoke › loads to the title (hooks in ~60 ms) |
| AC2 help tabs, about | met | screens › help and about (MIT, Landlord's Game, patent 748,626) |
| AC3 layout both viewports | met | `checkLayout` in every screen and dialog test |
| AC4 setup 2–6 seats | met | screens › setup (six seats, human/AI, persona, mode, variant, start) |
| AC5 board, districts | met | smoke › board renders (25 ownable spaces) |
| AC6 dice, doubles, three doubles | met | rules › doubles roll again; three doubles go to the Grand Jury |
| AC7 Payday, Row ground rent | met | rules › payday and Row ground rent |
| AC8 buy | met | rules › roll, move and buy |
| AC9 auction | met | auction › open auction; highest bid wins and pays; no bids leaves the lot unowned |
| AC10 Row leases | met | auction › Row lease auction; rules › mortgage (Row refused) |
| AC11 rent table | met | rules › rent table (base, full district, levels 1–4, lines, utility, season, mortgaged) |
| AC12 build and sell | met | rules › build and sell (one level per turn, resort, half refund) |
| AC13 mortgage | met | rules › mortgage |
| AC14 seasons | met | calendar › months advance and seasons change rents (chips and badges) |
| AC15 Headlines | met | calendar › headline drawn and applied (Opening Day +$50; 1905 fire spares the resort) |
| AC16 Town Talk | met | calendar › town talk card (collect, advance with Payday, Pardon kept out of the deck) |
| AC17 Grand Jury | met | rules › grand jury hearing (bail, pardon, doubles, third failure) |
| AC18 debt, bankruptcy | met | debt › raise cash by mortgaging; bankruptcy to a baron; bankruptcy to the town |
| AC19 trading | met | trade › propose to an AI (fair accepted, lowball declined); hot-seat offer; built lots refused |
| AC20 personas | met | ai › personas decide differently (Speculator buys where Banker declines; auction ceilings $400 vs $295); ai › all-AI game; balance table |
| AC21 game end | met | debt › bankruptcy ends a two-player game (game-over screen); modes › year limit |
| AC22 short game | met | modes › short game deals two lots and ends after 12 months |
| AC23 Common Ground | met | modes › treasury and dividend |
| AC24 sourced facts | met | content › every deed and card shows a sourced fact; `tools/check-facts.mjs` 78/78 |
| AC25 real input | met | input › real clicks play several turns against the AI (6 turns, mouse only) |
| AC26 keyboard | met | input › keyboard-only: menus, three turns by keys, board cursor, deed, menu |
| AC27 touch | met | touch › tap a space for its deed (real CDP taps; every action button ≥ 44 px) |
| AC28 contrast | met | a11y › contrast light / dark (9 screens and dialogs each, 0 failures) |
| AC29 reduced motion | met | a11y › reduced motion makes moves instant |
| AC30 settings, storage blocked | met | a11y › settings persist; storage blocked still plays |
| AC31 save and resume | met | save › resume after reload (cash, positions, lots, month, RNG state) |
| AC32 live region | met | a11y › live region and audio mute |
| AC33 performance | met | perf › 60.1 fps animating, 172 KB, heap 9.5 MB, zero console errors or external requests |
| AC34 balance | met | `tools/balance.mjs` (below) |
| AC35 audio | met, not heard | sounds fire on events and mute works (a11y › live region and audio mute); nobody listened |

## Test results
`node shared/test-harness/run.mjs games/property-game --milestone final`: **83/83 passed**
(43 desktop at 1280×800, 40 mobile at 390×844), 72 screenshots. All were inspected through the
11 contact sheets in `screenshots/final/sheets/`, with full-size checks of the board at both
sizes, the mid-animation frame, the resort, the dark theme, the resumed game and the game-over
screen. Milestones m1–m4 were run and inspected along the way; 18 defects are logged and fixed in
DEV-PLAN §5. `screenshots/index.html` (the gallery) is current.

## Balance (`node games/property-game/tools/balance.mjs 800`, 4 AI barons, 120-month cap)
Every 4-of-6 persona combination, rotated through all seats.
| Metric | Result | Target |
|---|---|---|
| Months to a winner (median) | 50 (p10 33, p90 77) | 30–80 |
| Stalled games (cap reached) | 1.8% | ≤ 10% |
| First bankruptcy (median month) | 34 | 12–40 |
| Seat win rate 1 / 2 / 3 / 4 | 28.6 / 24.7 / 25.3 / 21.4% | 17–33% each |
| Speculator / Hotelier / Banker | 31.2 / 24.7 / 20.1% | 8–35% |
| Showman / Preservationist / Gambler | 31.3 / 18.2 / 24.5% | 8–35% |
| Trades per game | 2.81 | 0.5–6 |
| Auctions per game | 6.77 | ≥ 1 |
| Short game | 0 stalls, exactly 12 months | 12 |
| Common Ground, 3-year limit | 100% end; first bankruptcy by month 36 in 56% of games | ≥ 95% |
Builds per game 47; cards drawn 66. Two-player tables: median 54 months, seats 54/46%; six-player
tables: median 50 months, 8.7% stalls, seats 12–21% (all within ±8 pp of 1/6).

**Tuning done and outliers named:**
- Without late-game dealing about 10% of games stalled (nobody completed a district). The AI now
  raises its trade chance and lowers its margin after month 20; stalls fell to 1.8%.
- The Showman won 38% at first (trade-happy, low margin). Trade 0.7 → 0.4, margin 0.03 → 0.07,
  district taste 1.3 → 1.15: now 31%.
- **First-seat edge:** seat 1 wins 28.6% and seat 4 21.4%, inside the band but a 7-point spread.
  The lever is a small start bonus for later seats; not applied.
- **Six-player stalls 8.7%**, near the 10% edge: six barons split the districts more ways.
  The year-limit option ends such games by net worth.
- In two-player games the first bankruptcy is the end of the game, so its median (53) sits
  outside the four-player band by design.

## Performance
- `index.html` 172 KB (budget 2 MB); hooks ready in about 60 ms; 60.1–60.2 fps headless while
  four AI barons animate (token hops, dice, pop-ups) at both viewports; JS heap 9.5 MB.
- Render on demand: the static board is cached per size/DPR/theme; the rAF loop runs only while
  something moves, and `isIdle()` counts hops, dice, pop-ups and dialog pop-ins.
- Node engine: 800 AI games in about 22 s.

## Known gaps
- **Audio and screen readers were not checked by a person.** Sounds are short and quiet by
  default; narration was tested automatically only (live-region text).
- **Small text on phones.** At 390 px the board's names and prices are 7–8 CSS px (crisp at 2×
  DPR but small); tapping a space opens the full deed, which is the intended way to read it.
- First-seat edge and six-player stall rate (see Balance).
- No undo, no house-rule editor, no era boards (1880s/1940s/2020s ideas from game-hooks.md),
  no squatter-claim or Reform-track mechanics; Common Ground has no variant-specific AI.
- AI offers to a human are priced against a default persona's valuation and may lean slightly in
  the AI's favor (up to about $40 of value); humans can decline, and an AI makes at most two offers
  a month and never repeats a declined one.
- The input test uses the hook `act('fast', true)` to skip presentation delays (it doesn't change
  rules); all game actions in that test are mouse clicks and key presses.

## Data notes (not fixed, reported)
- **Oaklawn meet months:** the audited bank (hs-0470, Wikipedia) says the meet runs "December
  through May"; `research/oaklawn-and-racing.md` gives the 2019 meet as "late January to early
  May". The game's Racing season uses Dec–May from the bank.
- **Woodmen of Union purchase:** NPS says the National Baptist Convention bought it in 1948;
  Wikipedia/Preserve Arkansas say the National Baptist Association in 1950 (hs-0048). The deed
  states the buyer from the bank without a year.
- **hs-0033** gives "eighteenth" in words while hs-0034 has "18th"; the National Park card cites
  hs-0034 so `check-facts` can match the number.
- Lot facts for the Park Avenue motor courts, the Water Co. (1882), the thermal water tax (1877),
  the Depot and the 1947 grand jury, and the 1923 flood come from research files (no audited bank
  item); `check-facts.mjs` verifies the quoted phrase and every number against the file.
- The Landlord's Game facts (patent 748,626; anti-monopolist and monopolist rule sets) come from
  Wikipedia, cited in `research/town-content.md` §6; nothing in `research/` covers it.

## Harness requests
- **Inliner: `export const a = 1, b = 2;` exports only `a`.** The `export (const) (\w+)` regex
  takes the first name; later names silently become `undefined` in the bundle while Node runs
  fine. This caused a real bug here (tokens sent to `undefined` instead of the Grand Jury Room).
  Either support comma lists or fail the build.
- **Inliner: names with `$`** (`export const $ = …`) aren't matched by `\w+`, leaving a raw
  `export` in the bundle (a syntax error at load). Use `[\w$]+`.
- **`t.shot` and CSS transitions:** a fading toast or dialog can be captured mid-transition
  because `isIdle()` can't see CSS animations. A harness option to wait for
  `document.getAnimations()` to finish would remove per-game workarounds.
- **Windows EBUSY** (already in LESSONS): an old shell whose cwd was `screenshots/final` kept the
  folder locked; the runner wrote into the existing empty folder fine. A runner-side "clear the
  milestone folder's files" would avoid needing `rm -rf`.

## Files
`PRD.md`, `MECHANICS.md`, `DEV-PLAN.md` (milestones, hook spec, test matrix, defect log),
`SAMPLES.md`, `research/town-content.md`, `tools/balance.mjs`, `tools/check-facts.mjs`,
`tools/sim.mjs` (Node loader), `tests/*.test.mjs` (15 files plus helpers), `src/` (8 modules +
CSS). `reference-samples/` holds the six downloaded single files (git-ignored, never run).
