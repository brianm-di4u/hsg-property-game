# Code-sample survey

Genre-generic samples only: no clones of any commercial property-trading game were opened.
Downloads (single files, fetched by raw URL) sit in `reference-samples/` (git-ignored); nothing
was installed, built or run.

| # | Sample | URL | License | Commit (fetched 2026-10-28) |
|---|---|---|---|---|
| 1 | boardgame.io turn order / stages | https://github.com/boardgameio/boardgame.io (`src/core/turn-order.ts`) | MIT | 47adef2b46e375999931209ba7b41e9654c506e1 |
| 2 | XState | https://github.com/statelyai/xstate | MIT | 060cd63378b46b32e7559d569ed3ad112ee60084 |
| 3 | bryc PRNGs (mulberry32, sfc32) | https://github.com/bryc/code/blob/master/jshash/PRNGs.md | Public domain (stated in the file) | 88c1317ea6f9b25c153afa9c369c365fed11b482 |
| 4 | seedrandom (alea) | https://github.com/davidbau/seedrandom (`lib/alea.js`) | MIT | 4460ad325a0a15273a211e509f03ae0beb99511a |
| 5 | OpenSpiel `first_sealed_auction`, `bargaining` | https://github.com/google-deepmind/open_spiel | Apache-2.0 | 0760b5a7d584a6bb69e1dc1cc693d494d8d31e77 |
| 6 | monte-carlo-tree-search-js | https://github.com/SethPipho/monte-carlo-tree-search-js | MIT | 9e5ed693a0742eea5ce7f00c648d0a2910880dcc |

## Notes per sample

**1. boardgame.io: turns, phases and stages.** Does well: separates *whose turn* from *who may
act now* (`activePlayers` with stages), which is exactly the auction and trade-response problem
(several players act inside one player's turn). Moves are pure functions over a serializable `G`.
Does badly for us: a framework with a client/master/transport layer, TypeScript and immer; far too
much for a single-file game. **Verdict: idea only.** Our engine keeps `turn` (current player) and a
`pending` object that names who must act next (bidder, trade recipient, debtor). No code copied.

**2. XState.** Does well: explicit states and guarded transitions make illegal actions impossible
and are easy to test. Does badly: the runtime is large and the actor model is overkill for a
turn game. **Verdict: idea only.** The engine is a hand-written phase machine (`roll → move →
resolve → post`, with `auction`, `trade`, `debt`, `hearing` sub-phases) and a `legal(state)`
function that lists allowed actions per phase, which the UI and AI both use.

**3. bryc PRNGs.** mulberry32 is a tiny, fast, well-distributed 32-bit generator whose whole state
is one integer, so it serializes into the save. **Verdict: adapted** (public domain; attribution
in `src/js/rng.js`). The state lives in `state.rng` so dice, decks and AI are reproducible after a
reload.

**4. seedrandom / alea.** Good quality, but the state is three floats plus a counter and the
module wrapper is heavier. **Verdict: not used** (mulberry32 is enough for dice).

**5. OpenSpiel auction and bargaining.** Clean formal models: a sealed first-price auction, and
bargaining where each agent values item bundles privately, proposes splits, and accepts if its
utility beats the alternative. Does badly for us: C++, research API, no UI. **Verdict: idea only.**
Our AI values bundles the same way (sum of per-lot values in context, minus what the trade gives
an opponent), and auctions are open ascending with a private maximum per bidder.

**6. monte-carlo-tree-search-js.** A small UCT implementation over a game interface (`moves`,
`playMove`, `winner`). Does well: generic. Does badly: dice-heavy games with hidden decks need
many rollouts per decision, which would cost a lot in the browser and in a 1,000-game balance run.
**Verdict: reference only.** The AI uses scored heuristics (value, liquidity, threat) instead;
`tools/balance.mjs` measures it.

## Foundation chosen
- Engine: a pure, serializable state object plus `apply(state, action)` that returns UI events
  (from boardgame.io's pure moves, without the framework).
- Phases and legality: explicit phase machine and a `legal()` list (from XState's guarded
  transitions, without the library).
- RNG: mulberry32 (bryc, public domain), state saved with the game.
- AI: bundle valuation as in OpenSpiel's bargaining (value, liquidity, threat) with personality
  weights; open ascending auctions with private maximums.

## Vendored for the visual campaign (2026-10-29)

| Package | Version | Source | License | Where | Use |
|---|---|---|---|---|---|
| three.js | 0.186.1 (r186) | npm `three` | MIT (`vendor/three/LICENSE`) | `vendor/three/` | 3D table; tree-shaken by `tools/build-three.mjs` into `src/js/three-lib.js` |
| Barlow Condensed 600/700 | @fontsource 5.2.5 | npm `@fontsource/barlow-condensed` | SIL OFL 1.1 | `vendor/fonts/` | board labels, buttons |
| Alfa Slab One 400 | @fontsource 5.2.5 | npm `@fontsource/alfa-slab-one` | SIL OFL 1.1 | `vendor/fonts/` | title, prices, deed names |
| Libre Caslon Text 400/italic | @fontsource 5.2.5 | npm `@fontsource/libre-caslon-text` | SIL OFL 1.1 | `vendor/fonts/` | fact text, newspaper body |
| Abril Fatface 400 | @fontsource 5.2.5 | npm `@fontsource/abril-fatface` | SIL OFL 1.1 | `vendor/fonts/` | newspaper mastheads |
| esbuild | 0.25.10 | npm | MIT | `tools/dev/` (build-time only, `node_modules` not committed) | tree-shaking three.js |

Fonts are inlined as data URIs into `assets/fonts.css` by `tools/build-fonts.mjs` (Chrome blocks `@font-face` files on file://).
The font files come from npm @fontsource; each `vendor/fonts/OFL-*.txt` is that family's upstream `OFL.txt` from the
official Google Fonts repository (`github.com/google/fonts`, `ofl/<family>/OFL.txt`), which names its real copyright
holders: TypeTogether (Abril Fatface), the Alfa Slab One Project Authors (José María Solé), the Barlow Project Authors
(Jeremy Tribby) and the Libre Caslon Text Project Authors. (The @fontsource packages ship a generic "Google Inc." header.)
Map data (USGS 3DEP, NHD, Census TIGER, OSM) was read from the trivia game's download cache; see `art-src/PROMPTS.md`.
