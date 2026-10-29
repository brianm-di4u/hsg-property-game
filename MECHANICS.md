# Bathhouse Barons: mechanics foundation

Built from the samples in `SAMPLES.md`: pure moves over one serializable state (boardgame.io),
an explicit phase machine with a legality list (XState idea), mulberry32 dice (bryc, public
domain), and bundle valuation for trades (OpenSpiel bargaining idea). All rules are our own.

## 1. Modules (`src/js/`)
| Module | Role | Runs in Node |
|---|---|---|
| `rng.js` | mulberry32; `next(s)` advances `s.rng` | yes |
| `data.js` | board, districts, rent tables, seasons, both decks, AI personalities | yes |
| `engine.js` | `createGame`, `legal`, `apply`, rent, net worth, bankruptcy | yes |
| `ai.js` | `aiAction(state)`: one action for the AI who must act | yes |
| `render.js` | Canvas board (cached static layer + dynamic layer), tokens, dice | no |
| `ui.js` | DOM panels, dialogs, screens, keyboard, live region | no |
| `audio.js` | WebAudio blips (dice, coins, cards, gavel) | no |
| `main.js` | boot, loop, save/load, `window.__game` | no |

`tools/balance.mjs` imports `data.js`, `engine.js` and `ai.js` directly.

## 2. State model (one JSON object)
```js
{
  v: 1, seed, rng,                       // rng = mulberry32 state (uint32)
  opts: { mode: 'full'|'short', variant: 'standard'|'common', months: 12, startCash: 1200 },
  players: [{ id, name, kind: 'human'|'ai', persona, token, cash, pos, held: 0|1..3,
              pardons, out: false, doublesRun, stats: {...} }],
  lots: { [spaceIndex]: { owner: -1|pid, level: 0..4, mortgaged } },   // lots, lines, utility
  turn, round, month, year,               // month 0..11; a round ends when play passes seat 0
  phase: 'roll'|'buy'|'auction'|'card'|'debt'|'hearing'|'post'|'over',
  pending: null | { kind: 'auction', space, bid, leader, order[], i }
                | { kind: 'trade', from, to, give:{lots,cash}, get:{lots,cash} }
                | { kind: 'debt', pid, amount, creditor }
                | { kind: 'card', deck, id },
  dice: [a, b], decks: { talk: [ids], news: [ids] }, discards,
  headline: { id, month } , mods: [{ district|space, mult, until }],   // card effects
  treasury,                              // Common Ground variant pool
  log: [ strings ], winner, ended
}
```
Every space is a fixed record in `data.js`; the state stores only ownership and levels.

## 3. Turn machine
```
roll ──roll──► move (events) ──► resolve(space)
  │                                 ├─ unowned lot ─► buy ──buy──► post
  │                                 │                    └─decline─► auction ─► post
  │                                 ├─ owned lot ─► pay rent (debt if short) ─► post
  │                                 ├─ Town Talk ─► card ─► (may move again) ─► post
  │                                 ├─ tax ─► pay ─► post
  │                                 └─ Called before the Grand Jury ─► held ─► post
  └─ held? ─► hearing: pay $50 | pardon | roll for doubles (3 tries)
post ──end──► next player (doubles: roll again; 3 doubles → Grand Jury)
```
- **Month clock.** When play wraps to seat 0 the month advances, a Headlines card is drawn and
  applied (town-wide), seasonal multipliers change, expired card modifiers drop, Bathhouse Row
  ground rent is charged at Payday, and in the Common Ground variant the treasury pays out.
- **Legality.** `legal(state)` returns the actions the acting player may take now; `apply`
  rejects anything else. Manage actions (build, sell, mortgage, unmortgage, propose trade) are
  legal in `roll` and `post` for the current player.
- **Debt.** Any payment the payer can't cover enters `debt`: the debtor must sell bathhouses
  (half cost back), mortgage, or declare bankruptcy. Bankrupt to a player: cash and lots go to
  the creditor (mortgages kept). Bankrupt to the bank: buildings are removed and lots return
  unowned (later auctions).
- **End.** Full game: last solvent baron, or the year limit (net worth decides). Short game: 12
  months, highest net worth. Net worth = cash + lot price (half if mortgaged) + building cost ÷ 2.

## 4. Rules engine details
- Rent: `base = price/10`; whole district owned and unimproved ×2; levels 1–3 bathhouses and 4 =
  Grand Resort use `M = [1, 5, 14, 32, 45]` × base (tuned in balance). Season and card multipliers
  multiply, then round to $5 ($1 below $20). Mortgaged lots charge nothing.
- Lines: $25 for one, $60 for both. Utility: 6 × dice total (10 × in festival months).
- Bathhouse Row: never sold at list; landing on an unowned Row lot opens a lease auction with a
  minimum bid of half price. Row leases can't be mortgaged; they pay $10 per lease of ground rent
  at each Payday.
- Building: own the whole district, none mortgaged; one level per lot per turn; build cost from
  the district. Selling a level returns half.
- Grand Jury: held up to 3 turns; pay $50, use a Pardon, or roll doubles; rent still collected.
- Payday: $150 when passing or landing on the Depot.

## 5. Seeded RNG
mulberry32 (bryc, public domain). `state.rng` is a uint32; `rand(state)` advances it. Dice,
deck shuffles, AI tie-breaks and AI trade attempts all draw from it, so a seed reproduces a whole
game in the browser and in Node, and a save resumes the same sequence.

## 6. Trading and auctions
- **Auction:** open ascending. Order starts left of the decliner; each bidder may raise by
  $10/$50/$100 (or type an amount) or drop out. Ends when one bidder holds the high bid and all
  others have dropped; if nobody bids, the lot stays unowned. AI bidders hold a private maximum.
- **Trade:** the current player offers lots (no buildings anywhere in their districts) and cash
  for the other player's lots and cash. The recipient accepts or declines. A human recipient gets
  a hand-the-device prompt. Mortgaged lots move with their mortgage. AI proposers make at most two
  offers per turn and never repeat a declined offer the same month.

## 7. AI (scored on property value, liquidity and threat)
For player *p* and lot *L*:
- **Value** `V(L) = price × (1 + 0.6·share + 1.2·completes) + rentPotential × horizon`,
  where `share` is the fraction of the district *p* would own and `completes` is 1 if *L* completes it.
- **Liquidity** `reserve = persona.reserve × dangerRent`, the largest rent *p* could land on next
  loop; spending that leaves cash below reserve is penalised.
- **Threat** `T(L, q) = V_q(L)` when giving *L* to opponent *q* would complete or nearly complete
  q's district, weighted by q's net worth rank.
Late-game dealing: after month 20 each persona's trade chance rises 2 points a month and its
acceptance margin shrinks (to 20% by month 52), which cut stalled games from about 10% to under 2%.
Decisions: buy if `V − price·(1 − persona.greed) > 0` and cash stays above reserve; bid up to
`min(V·persona.bid, cash − reserve/2)`; build where marginal rent ÷ cost is best while cash ≥
reserve; raise debt cash by selling buildings in the cheapest districts, then mortgaging lots
outside complete districts; accept a trade if `ΣV(received) − ΣV(given) + cash − T > persona.margin`.

| Persona | Reserve | Bid × | Greed | Trades | Taste |
|---|---|---|---|---|---|
| Speculator | 0.6 | 1.15 | buys everything | often | — |
| Hotelier | 0.9 | 1.0 | builds early | sometimes | Grand Hotels |
| Banker | 1.6 | 0.85 | cautious | rarely | — |
| Showman | 0.8 | 1.05 | — | often | Clubs, Attractions |
| Preservationist | 1.0 | 1.0 | — | sometimes | Bathhouse Row, Pleasant Street |
| Gambler | 0.4 | 1.25 | random swings | sometimes | — |

## 8. Rendering
- Canvas board, square, 32 spaces: four corners (1.5 units) and seven edge spaces per side
  (1 unit), so a side is 10 units; the center holds the calendar, Headlines card and dice. Static layer (spaces, bands, icons, names,
  prices) is drawn once per size/DPR/theme into an offscreen canvas. The dynamic layer (owner tabs,
  bathhouses, resort towers, season badges, tokens, dice, focus ring) redraws on demand.
- Render on demand: a rAF loop runs only while tokens hop, dice tumble or a highlight pulses;
  `isIdle()` is false during those. Reduced motion: hops and dice are instant.
- DOM for everything interactive: action bar, player cards, dialogs (deed, trade, auction, card,
  manage, debt), screens. The canvas is `role="img"` with a text alternative; the live region
  announces every roll, move, payment and card.
- Layout: desktop puts the board left (up to 760 px) and the panel right; mobile portrait puts the
  board on top (full width) and a compact panel below.

## 9. Input
Mouse/touch on board spaces opens the deed; buttons for all actions. Keyboard: `R` roll, `B` buy,
`A` auction (decline), `E` end turn, `M` manage, `T` trade, arrow keys move the board cursor,
`Enter` opens the deed, `Esc` closes dialogs, `P` pause menu.

## 10. Save format
`localStorage['hs-barons-save-v1'] = JSON.stringify(state)` after every action (try/catch);
`localStorage['hs-barons-settings-v1']` for settings. A save with an unknown `v` is ignored.

## 11. `window.__game` hooks
See `DEV-PLAN.md` §3.
