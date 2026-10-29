# Bathhouse Barons: development plan

## 1. Milestones
| Milestone | Scope | Exit |
|---|---|---|
| **M1 foundation** | `src/` skeleton, inliner build, tokens, rng, data (board, districts, rents), engine core (roll, move, payday, buy, rent), Canvas board static layer, title screen, `window.__game` | `--milestone m1` passes; board legible at both viewports |
| **M2 core loop** | full turn machine: auction, Row leases, building, mortgage, Grand Jury, debt and bankruptcy, game end; action bar, player cards, deed and manage dialogs; tokens hop; AI v1 (buy/bid/build/debt) | AI-vs-AI game finishes in browser and Node; rules tests pass |
| **M3 content** | months and seasons, Headlines and Town Talk decks with facts, trading (UI + AI), six personas, short game, Common Ground, setup screen, help/about, `tools/balance.mjs` tuned, `tools/check-facts.mjs` | balance bands met; facts 100% |
| **M4 polish** | audio, dark theme, reduced motion, text size, keyboard map, live region, save/resume, game-over screen, juice (coin pops, dice tumble, card flip) | a11y, save, input and touch tests pass |
| **M5 optimize/final** | size and fps pass, final screenshot sweep, REPORT.md | `--milestone final` passes at both viewports; every shot inspected |

## 2. Task breakdown
- M1: `rng.js`, `data.js` (32 spaces, 8 districts, rent table), `engine.js` (createGame, legal,
  apply: roll/move/buy/end), `render.js` (geometry, static cache, tokens), `ui.js` (title, HUD),
  `main.js` (boot, hooks), tests `smoke`, `rules` (part).
- M2: engine auction/build/mortgage/hearing/debt/bankrupt/end; `ai.js` v1; dialogs; token hop
  animation; tests `rules`, `auction`, `debt`, `ai`.
- M3: calendar + decks + modifiers; trade engine + dialog + AI; personas; setup/help/about;
  modes; tools; tests `calendar`, `trade`, `modes`, `content`, `screens`.
- M4: `audio.js`; themes; settings; keyboard; save; game over; tests `input`, `touch`, `a11y`, `save`.
- M5: perf test, size trim, REPORT.md.

## 3. `window.__game` hook spec
| Method | Returns / does |
|---|---|
| `seed(n)` | reseeds the RNG (next `newGame` and the live game's future rolls) |
| `getState()` | `{ scene, dialog, game: <engine state> or null, settings, anim }` |
| `setState(s)` | loads `{ game, scene? }` (engine state), redraws |
| `isIdle()` | false while tokens hop, dice tumble, a dialog animates, or AI is mid-step |
| `scene(name)` | `'title' | 'setup' | 'game' | 'help' | 'settings' | 'about' | 'over'` |
| `newGame(opts)` | `{ seats: [{kind, persona, name}], mode, variant, years, seed }` → starts at `'game'` |
| `act('do', action)` | applies one engine action for whoever must act (as the UI would); returns `{ ok, error, events }` |
| `act('dice', a, b)` | forces the next roll to `a, b` (tests only) |
| `act('ai')` | performs one AI action if an AI must act |
| `act('autoplay', n)` | runs up to `n` actions with every seat as AI; returns the state summary |
| `act('rent', space, diceTotal)` | rent the space would charge now |
| `act('legal')` | the legal action list |
| `act('open', name, arg)` | opens a dialog: `'deed' space`, `'manage'`, `'trade' pid`, `'pause'` |
| `act('close')` | closes the top dialog |
| `act('card', deck, id)` | forces the next card from a deck (tests only) |
| `act('fast', on)` | AI and animation delays to 0 (presentation only; rules unchanged) |
| `act('aiPause', on)` | stops or resumes AI pacing so tests can step AIs with `act('ai')` |
| `act('summary')`, `act('cursor', i)`, `act('tradeSet', {...})` | state summary; move the board cursor; fill the open trade dialog |

## 4. Test matrix
Screenshots are named `NN-name` and taken at both viewports unless noted.
| AC | Test (file › name) | Screenshots |
|---|---|---|
| AC1 | screens › title | `01-title` |
| AC2 | screens › help and about | `02-help-rules`, `02-help-seasons`, `02-help-cards`, `02-help-controls`, `03-about` |
| AC3 | every screens/flow test calls `checkLayout` | — |
| AC4 | screens › setup | `04-setup`, `04-setup-6`, `04-game-6` |
| AC5 | smoke › board renders | `05-board` |
| AC6 | rules › roll, doubles, three doubles | `06-moved` |
| AC7 | rules › payday and Row ground rent | — |
| AC8 | rules › buy | `08-buy-dialog` |
| AC9 | auction › open auction | `09-auction` |
| AC10 | auction › Row lease auction | `10-row-auction` |
| AC11 | rules › rent table | `11-deed` |
| AC12 | rules › build and sell | `12-manage`, `12-resort` |
| AC13 | rules › mortgage | — |
| AC14 | calendar › months and seasons | `14-season-racing`, `14-season-summer` |
| AC15 | calendar › headlines | `15-headline` |
| AC16 | calendar › town talk | `16-town-talk` |
| AC17 | rules › grand jury | `17-hearing` |
| AC18 | debt › raise cash and bankruptcy | `18-debt`, `18-bankrupt` |
| AC19 | trade › propose, accept, decline | `19-trade`, `19-trade-incoming` |
| AC20 | ai › personas differ; AI game finishes | `20-ai-midgame` |
| AC21 | modes › game over | `21-game-over` |
| AC22 | modes › short game | `22-short` |
| AC23 | modes › common ground | `23-common` |
| AC24 | content › facts with sources; `tools/check-facts.mjs` | `24-deed-fact` |
| AC25 | input › real clicks and keys play turns | `25-input-after` |
| AC26 | input › keyboard-only | — |
| AC27 | touch › tap deed and buttons (mobile) | `27-touch-deed` |
| AC28 | a11y › contrast light and dark | `28-dark` |
| AC29 | a11y › reduced motion | — |
| AC30 | a11y › settings persist; storage blocked | `30-settings` |
| AC31 | save › resume after reload | `31-resumed` |
| AC32 | a11y › live region | — |
| AC33 | perf › fps while animating, size and load | `26-animating` |
| AC34 | `node games/property-game/tools/balance.mjs` | — |
| AC35 | a11y › audio mute | — |

## 5. Defect log
| # | Milestone | Defect | Fix |
|---|---|---|---|
| 1 | M1 | Bundle failed to load: `export const # Bathhouse Barons: development plan

## 1. Milestones
| Milestone | Scope | Exit |
|---|---|---|
| **M1 foundation** | `src/` skeleton, inliner build, tokens, rng, data (board, districts, rents), engine core (roll, move, payday, buy, rent), Canvas board static layer, title screen, `window.__game` | `--milestone m1` passes; board legible at both viewports |
| **M2 core loop** | full turn machine: auction, Row leases, building, mortgage, Grand Jury, debt and bankruptcy, game end; action bar, player cards, deed and manage dialogs; tokens hop; AI v1 (buy/bid/build/debt) | AI-vs-AI game finishes in browser and Node; rules tests pass |
| **M3 content** | months and seasons, Headlines and Town Talk decks with facts, trading (UI + AI), six personas, short game, Common Ground, setup screen, help/about, `tools/balance.mjs` tuned, `tools/check-facts.mjs` | balance bands met; facts 100% |
| **M4 polish** | audio, dark theme, reduced motion, text size, keyboard map, live region, save/resume, game-over screen, juice (coin pops, dice tumble, card flip) | a11y, save, input and touch tests pass |
| **M5 optimize/final** | size and fps pass, final screenshot sweep, REPORT.md | `--milestone final` passes at both viewports; every shot inspected |

## 2. Task breakdown
- M1: `rng.js`, `data.js` (32 spaces, 8 districts, rent table), `engine.js` (createGame, legal,
  apply: roll/move/buy/end), `render.js` (geometry, static cache, tokens), `ui.js` (title, HUD),
  `main.js` (boot, hooks), tests `smoke`, `rules` (part).
- M2: engine auction/build/mortgage/hearing/debt/bankrupt/end; `ai.js` v1; dialogs; token hop
  animation; tests `rules`, `auction`, `debt`, `ai`.
- M3: calendar + decks + modifiers; trade engine + dialog + AI; personas; setup/help/about;
  modes; tools; tests `calendar`, `trade`, `modes`, `content`, `screens`.
- M4: `audio.js`; themes; settings; keyboard; save; game over; tests `input`, `touch`, `a11y`, `save`.
- M5: perf test, size trim, REPORT.md.

## 3. `window.__game` hook spec
| Method | Returns / does |
|---|---|
| `seed(n)` | reseeds the RNG (next `newGame` and the live game's future rolls) |
| `getState()` | `{ scene, dialog, game: <engine state> or null, settings, anim }` |
| `setState(s)` | loads `{ game, scene? }` (engine state), redraws |
| `isIdle()` | false while tokens hop, dice tumble, a dialog animates, or AI is mid-step |
| `scene(name)` | `'title' | 'setup' | 'game' | 'help' | 'settings' | 'about' | 'over'` |
| `newGame(opts)` | `{ seats: [{kind, persona, name}], mode, variant, years, seed }` → starts at `'game'` |
| `act('do', action)` | applies one engine action for whoever must act (as the UI would); returns `{ ok, error, events }` |
| `act('dice', a, b)` | forces the next roll to `a, b` (tests only) |
| `act('ai')` | performs one AI action if an AI must act |
| `act('autoplay', n)` | runs up to `n` actions with every seat as AI; returns the state summary |
| `act('rent', space, diceTotal)` | rent the space would charge now |
| `act('legal')` | the legal action list |
| `act('open', name, arg)` | opens a dialog: `'deed' space`, `'manage'`, `'trade' pid`, `'pause'` |
| `act('close')` | closes the top dialog |
| `act('card', deck, id)` | forces the next card from a deck (tests only) |
| `act('fast', on)` | AI and animation delays to 0 (screens tests) |

## 4. Test matrix
Screenshots are named `NN-name` and taken at both viewports unless noted.
| AC | Test (file › name) | Screenshots |
|---|---|---|
| AC1 | screens › title | `01-title` |
| AC2 | screens › help and about | `02-help-rules`, `02-help-seasons`, `02-help-cards`, `02-help-controls`, `03-about` |
| AC3 | every screens/flow test calls `checkLayout` | — |
| AC4 | screens › setup | `04-setup`, `04-setup-6` |
| AC5 | smoke › board renders | `05-board` |
| AC6 | rules › roll, doubles, three doubles | `06-moved` |
| AC7 | rules › payday and Row ground rent | — |
| AC8 | rules › buy | `08-buy-dialog` |
| AC9 | auction › open auction | `09-auction` |
| AC10 | auction › Row lease auction | `10-row-auction` |
| AC11 | rules › rent table | `11-deed` |
| AC12 | rules › build and sell | `12-manage`, `12-resort` |
| AC13 | rules › mortgage | — |
| AC14 | calendar › months and seasons | `14-season-racing`, `14-season-summer` |
| AC15 | calendar › headlines | `15-headline` |
| AC16 | calendar › town talk | `16-town-talk` |
| AC17 | rules › grand jury | `17-hearing` |
| AC18 | debt › raise cash and bankruptcy | `18-debt`, `18-bankrupt` |
| AC19 | trade › propose, accept, decline | `19-trade`, `19-trade-incoming` |
| AC20 | ai › personas differ; AI game finishes | `20-ai-midgame` |
| AC21 | modes › game over | `21-game-over` |
| AC22 | modes › short game | `22-short` |
| AC23 | modes › common ground | `23-common` |
| AC24 | content › facts with sources; `tools/check-facts.mjs` | `24-deed-fact` |
| AC25 | input › real clicks and keys play turns | `25-input-after` |
| AC26 | input › keyboard-only | — |
| AC27 | touch › tap deed and buttons (mobile) | `27-touch-deed` |
| AC28 | a11y › contrast light and dark | `28-dark` |
| AC29 | a11y › reduced motion | — |
| AC30 | a11y › settings persist; storage blocked | `30-settings` |
| AC31 | save › resume after reload | `31-resumed` |
| AC32 | a11y › live region | — |
| AC33 | perf › fps, size, load | — |
| AC34 | `node games/property-game/tools/balance.mjs` | — |
| AC35 | a11y › audio mute | — |

## 5. Defect log
 isn't matched by the inliner's `w+` export regex | renamed to `qs` |
| 2 | M1 | Calendar ring overlapped the subtitle and the Headline card | smaller ring, moved down; postcard lower |
| 3 | M1 | Season badges covered the icons on side spaces | badges drawn over the district band |
| 4 | M1 | Mobile wasted ~50 px under the panel; Menu button took a whole row | board height computed from the panel's real height; Menu lives in the top bar only |
| 5 | M2 | Tokens jumped to the Grand Jury at `undefined`: `export const DEPOT = 0, JURY = 8, …` exports only the first name through the inliner | one `export const` per name (harness request filed) |
| 6 | M2 | Crash after a debt cleared: the debt dialog re-rendered with `debts[0]` gone | render guards the phase; dialog closes after presenting |
| 7 | M2 | Crash on game over: the HUD read `players[-1]` | HUD shows the winner when the game has ended |
| 8 | M2 | Owner markers spilled off the board edge | owner strip with the seat number, inside the space; content box shrinks to fit |
| 9 | M2 | Tokens on corners hid the corner names | corner token slots moved to the middle band |
| 10 | M2 | Screenshots caught half-faded dialogs | `isIdle()` waits for the dialog pop animation |
| 11 | M3 | Dark theme primary buttons had 1:1 text contrast (`body.theme-dark .btn` beat `.btn.primary`) | rule removed |
| 12 | M3 | About 10% of 4-AI games stalled with nobody completing a district | late-game dealing in ai.js (stalls 1.8%) |
| 13 | M3 | Showman won 38% of games (target ≤ 35%) | trade 0.7 → 0.4, margin 0.03 → 0.07, taste 1.3 → 1.15 (31%) |
| 14 | M3 | Six-seat games could seat two "Jack Tolliver" AIs | random personas prefer unused ones; duplicate names get II, III |
| 15 | M3 | "after 1 months" on the game-over screen; toast lingered over screens | plural fixed; toasts cleared on scene change |
| 16 | M3 | Four displayed facts failed `check-facts` (source strings; "18th" not in hs-0033) | sources copied from the bank; card cites hs-0034 |
| 17 | M4 | The HUD and ledger showed a move's outcome before the token finished hopping | log, live region and HUD refresh after the presentation queue drains |
| 18 | final | Mobile: month text in the calendar ring touched the month bubbles; volume slider tiny | narrower fit width; slider 150 px |
