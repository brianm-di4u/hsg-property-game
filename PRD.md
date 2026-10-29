# Bathhouse Barons: product requirements

## 1. Vision and pillars
An original roll-and-move property-trading game for 2–6 local players (any mix of humans and AI)
set in Hot Springs, Arkansas. Players lease bathhouses, buy hotels, clubs and ballparks, build
bathhouses and grand resorts, and ride the town's tourism calendar.
1. **Our own game.** Districts instead of color groups, a bathhouse → grand resort upgrade
   ladder, a month-by-month tourism calendar, federal Row leases sold only at auction, and event
   decks written from town history. No commercial game's names, board, cards or wording.
2. **Real town, cited.** Every place and date on screen traces to the audited bank or the
   research corpus and shows its source; prices, rents and effects are labelled game logic.
3. **Readable on a phone.** A portrait-first layout, tap-to-inspect deeds, 44 px targets.
4. **Fair, lively AI.** Six personalities that buy, bid, build and trade by measured rules.

## 2. Target players
Families and casual players (10+), local history fans, solo players against AI.

## 3. Modes and options
- **Full game:** last baron standing; optional year limit (1–5 years, default 3); at the limit
  net worth wins.
- **Short game:** 12 months; each baron starts with two random lots (not Row); highest net worth
  wins.
- **Common Ground variant** (inspired by the anti-monopolist rules of the public-domain
  Landlord's Game, 1904): base rent of unimproved lots, line fares, the utility and taxes go to a
  public treasury that pays every baron an equal dividend at each new month.
- Seats: 2–6; each is Human or AI (persona chosen or random); names editable.

## 4. Rules (complete)
1. Each baron starts with $1,200 at the Depot. Seat order is fixed; seat 1 starts.
2. On a turn: optionally manage (build, sell, mortgage, unmortgage, trade), roll two dice, move
   clockwise, resolve the space, optionally manage, end turn. Doubles roll again; a third double in
   one turn sends the baron to the Grand Jury Room.
3. Passing or landing on the Depot pays $150 (Payday). Row lease holders pay $10 per lease then.
4. Unowned lot: buy at the game price, or decline and it goes to auction among all solvent barons
   (open ascending, minimum $10). Bathhouse Row lots are never sold at list: landing opens a lease
   auction with a minimum of half price.
5. Owned lot: pay its owner rent (none if mortgaged or if the owner is the lander).
6. Rent = base (price ÷ 10), ×2 when the whole district is owned and unimproved, or the bathhouse
   level table (1, 2, 3 bathhouses, Grand Resort), × the month's season multiplier × any card
   modifier, rounded to $5 (to $1 below $20). Lines: $25 / $60. Utility: 6 × dice (10 × in festival months).
7. Building needs the whole district, none mortgaged; at most one level per lot per turn; build
   cost per district; a Grand Resort replaces three bathhouses. Selling returns half.
8. Mortgage: receive half price; no rent while mortgaged; unmortgage for half price + 10%. Row
   leases can't be mortgaged. Lots in a district with buildings can't be mortgaged.
9. Town Talk spaces draw a personal card; each new month draws a town-wide Headlines card.
10. Called before the Grand Jury → go straight to the Grand Jury Room (no Payday). To leave: pay
    $50 before rolling, use a Pardon, or roll doubles (move by that roll); after the third failed
    roll pay $50 and move.
11. Thermal Water Tax: pay $100.
12. Debt: a baron who owes more than their cash must sell buildings or mortgage until they can
    pay, or declare bankruptcy. To a baron: everything passes to the creditor. To the bank: lots
    return unowned with buildings removed.
13. Trades: the current baron may offer lots and cash to any other baron for lots and cash; lots
    in districts with buildings can't be traded; the recipient accepts or declines.
14. Months advance when play passes the first seat. Seasons change rent multipliers (table §5).

## 5. Hot Springs content map
| Where | Content | Source |
|---|---|---|
| 22 lots in 8 districts | Frontier Valley, Roadside Attractions, The Ballparks, Park Avenue, Pleasant Street, The Clubs, Grand Hotels, Bathhouse Row | `research/town-content.md` §1 |
| Lines, utility, tax, corners | Diamond Jo Railroad, Streetcar Line, Hot Springs Water Co., Thermal Water Tax, Depot, Grand Jury Room, Free Bathhouse | §1 |
| Seasons | Racing (Dec–May, Grand Hotels ×1.5), Spring Training (Feb–Mar, Ballparks ×1.5), Parade (Mar, Clubs ×1.5), Tubs (Jun, Row ×1.5), Summer (Jun–Aug, Attractions ×1.5), Film Festival (Oct, Grand Hotels ×1.5), Holiday Lights (Nov–Dec, Park Ave ×1.5), Winter (Jan–Feb, Attractions ×0.5) | §2 |
| Headlines deck | 26 town events, each with a cited fact | §3 |
| Town Talk deck | 16 personal cards | §4 |
| Deeds | game price and rents, plus one cited fact | §1 |

## 6. Screens and flow
Title (New game, Continue, How to play, Settings, About) → Setup (seats, mode, variant, year
limit, seed) → Game (board, players, action bar, log) with dialogs (deed, buy, auction, card,
trade, manage, debt, hearing, pause) → Game over (ranking, net worth, stats, play again).

## 7. Art and audio direction
Light theme `gilded-spa` (cream brick, red tile, Maurice green, brass); dark theme `deco-neon`
(midnight, gold, neon). District bands use a color **and** a pattern **and** an icon. Tokens are
six shapes (jug, top hat, horseshoe, parasol, sculpin, streetcar) in six colors with a seat
number. Center: calendar dial, Headlines postcard, ivory dice with red pips. Bathhouses are small
red-tile cubes; a Grand Resort is a twin-tower block. Audio: short, quiet WebAudio dice rattle,
coin ticks, card flip, gavel, fanfare; mutable.

## 8. Accessibility
Keyboard-only play; text contrast ≥ 4.5:1 in both themes; shape + label + pattern for every
color cue; `prefers-reduced-motion` honored (and a setting); text size 100–150%; a polite live
region narrates every event; dialogs trap focus and close with Esc.

## 9. Mobile and touch
Portrait-first: board full width on top, panel below; every target ≥ 44 px; tap a space for its
deed; no hover-only information; no horizontal scroll.

## 10. Performance budgets
60 fps while animating on a mid-range laptop; `index.html` ≤ 2 MB; interactive (hooks ready)
≤ 2 s; no network requests; zero console errors.

## 11. Save/load
Autosave after every action; Continue resumes exactly (including RNG); settings persist; the game
runs when storage throws.

## 12. Acceptance criteria
| AC | Feature | Criterion |
|---|---|---|
| AC1 | Title | Title shows name, New game, Continue (enabled only with a save), How to play, Settings, About |
| AC2 | Help | How to play has tabs Rules, Seasons, Cards, Controls; About credits sources, MIT, and the Landlord's Game heritage line |
| AC3 | Layout | Every screen passes `checkLayout` at 1280×800 and 390×844 |
| AC4 | Setup | 2–6 seats, each Human or AI with a persona; mode, variant, year limit and seed selectable |
| AC5 | Board | 32 spaces in 8 districts; each lot shows name, price, district band (color + pattern + icon) |
| AC6 | Dice & move | Roll moves the token by the dice total; doubles grant another roll; three doubles go to the Grand Jury |
| AC7 | Payday | Passing or landing on the Depot pays $150; Row leases pay $10 each |
| AC8 | Buy | Landing on an unowned lot offers Buy / Auction; buying deducts the price and sets the owner |
| AC9 | Auction | Declining starts an ascending auction; the highest bidder pays and owns the lot; all-pass leaves it unowned |
| AC10 | Row leases | Unowned Row lots go straight to a lease auction with a half-price minimum and can't be mortgaged |
| AC11 | Rent | Rent matches the table: base, ×2 full district, bathhouse levels, resort, season and card multipliers, mortgaged = 0 |
| AC12 | Build | Building requires the full unmortgaged district, one level per lot per turn; selling refunds half |
| AC13 | Mortgage | Mortgage pays half; unmortgage costs half + 10%; mortgaged lots charge no rent |
| AC14 | Seasons | The month advances each round; the season banner and board badges show active multipliers |
| AC15 | Headlines | A Headlines card is drawn each new month, shown with its fact and source, and applied |
| AC16 | Town Talk | Landing on Town Talk draws, shows and applies a card (move, pay, collect, pardon) |
| AC17 | Grand Jury | Pay, Pardon or doubles release a held baron; third failed roll pays $50 and moves |
| AC18 | Debt & bankruptcy | A short payer must raise cash or go bankrupt; assets pass to the creditor or return to the bank |
| AC19 | Trading | Propose lots + cash both ways; AI accepts/declines by valuation; humans get a confirm; lots with buildings can't be traded |
| AC20 | AI personas | Six personas with distinct buy, bid, build, trade behaviour (measured in balance) |
| AC21 | Game end | Full: last solvent baron or year limit; Short: 12 months; the game-over screen ranks by net worth |
| AC22 | Short game | Short mode deals two random non-Row lots per baron and ends after 12 months |
| AC23 | Common Ground | Base rent, fares, utility and tax go to the treasury; it pays an equal dividend each month |
| AC24 | Facts | Every displayed fact traces to the audited bank (confirmed, same source) or a research file (`tools/check-facts.mjs`) |
| AC25 | Real input | A test plays several full turns with real clicks and keys only |
| AC26 | Keyboard | All actions reachable by keyboard; documented shortcuts work |
| AC27 | Touch | Tap a space opens its deed; action buttons ≥ 44 px on mobile |
| AC28 | Contrast | Text contrast ≥ 4.5:1 in light and dark themes |
| AC29 | Reduced motion | Reduced motion makes moves and dice instant |
| AC30 | Settings & storage | Settings persist; the game runs when localStorage throws |
| AC31 | Save & resume | Continue restores the exact state (cash, lots, month, RNG) |
| AC32 | Live region | Rolls, moves, payments and cards are announced |
| AC33 | Performance | ≥ 55 fps animating, HTML ≤ 2 MB, hooks ≤ 2 s, zero console errors, zero external requests |
| AC34 | Balance | `tools/balance.mjs` metrics within the target bands of §13 |
| AC35 | Audio | Sounds play on events, are quiet by default and mutable |

## 13. Balance targets (4 AI, full game, no year limit, 120-round cap)
| Metric | Target |
|---|---|
| Rounds to a winner (median) | 30–80 |
| Stalled games (cap reached) | ≤ 10% |
| First bankruptcy (median round) | 12–40 |
| Seat win rate | each seat within ±8 pp of 25% |
| Persona win rate (mixed tables) | every persona 8–35% |
| Trades per game (mean) | 0.5–6 |
| Auctions per game (mean) | ≥ 1 |
| Short game: rounds | exactly 12 |

## 14. Out of scope
Online multiplayer, accounts, house rules editor, era boards beyond the one board, voice-over,
real-money anything, real people as characters, logos.
