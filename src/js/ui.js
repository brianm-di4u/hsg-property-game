// DOM helpers and the text content of deeds, cards, help and about. No game state lives here.
import { SPACES, DISTRICTS, DISTRICT_ORDER, LOTS_BY_D, RULES, SEASONS, NEWS, TALK, CARD, MONTHS, PERSONAS, isRow } from './data.js';
import { rentOf, multFor, ownerOf, buildCost, unmortgageCost } from './engine.js';
import { art, has } from './art.js';

export const qs = (q, el = document) => el.querySelector(q);
export const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const money = (n) => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');

export function factHtml(f) {
  if (!f) return '<p class="fact"><span class="gamelogic">Game card</span> Fictional; no historical claim.</p>';
  return `<p class="fact">${esc(f.text)}<br><span class="src">Source: ${esc(f.src)}</span></p>`;
}

export function rentTable(i) {
  const sp = SPACES[i];
  if (sp.type === 'lot') {
    const b = sp.price / 10, rows = [['Lot alone', b], ['Whole district, no buildings', b * RULES.fullBonus], ['1 bathhouse', b * RULES.M[1]], ['2 bathhouses', b * RULES.M[2]], ['3 bathhouses', b * RULES.M[3]], ['Grand Resort', b * RULES.M[4]]];
    return `<table class="t"><tbody>${rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${money(v)}</td></tr>`).join('')}</tbody></table>
      <p class="fine">Build ${money(DISTRICTS[sp.d].build)} per level · ${isRow(i) ? 'federal lease: auction only, cannot be mortgaged, $10 ground rent each Payday' : `mortgage ${money(sp.price / 2)}`}</p>`;
  }
  if (sp.type === 'line') return `<table class="t"><tbody><tr><th scope="row">One line</th><td>${money(RULES.lineRent[1])}</td></tr><tr><th scope="row">Both lines</th><td>${money(RULES.lineRent[2])}</td></tr></tbody></table><p class="fine">Mortgage ${money(sp.price / 2)}</p>`;
  if (sp.type === 'util') return `<p>Rent is ${RULES.utilMult} × the dice (${RULES.utilFestival} × in festival months).</p><p class="fine">Mortgage ${money(sp.price / 2)}</p>`;
  return '';
}

export function spaceRules(sp) {
  if (sp.type === 'talk') return 'Draw a Town Talk card and follow it.';
  if (sp.type === 'tax') return `Pay ${money(RULES.tax)}.`;
  return ({ depot: `Collect ${money(RULES.payday)} Payday whenever you pass or land here.`, jury: 'Passing through, unless you were summoned. Held barons leave by paying $50, a Pardon, or rolling doubles.', free: 'A public rest stop. Nothing to pay.', gojury: 'Go straight to the Grand Jury Room. No Payday.' })[sp.kind] || '';
}

// Painted picture for a space or card, when the art is on (never requested otherwise, so no 404s).
const VIG = ['depot', 'cabins', 'talk', 'belding', 'railroad', 'ostrich', 'gators', 'iqzoo', 'jury', 'whittington', 'waterco', 'fogel', 'majesticpark', 'motorcourts', 'drivein', 'tower',
  'freebath', 'pythian', 'talk', 'woodmen', 'streetcar', 'southern', 'ohio', 'vapors', 'summoned', 'eastman', 'majestic', 'arlington', 'watertax', 'hale', 'buckstaff', 'fordyce'];
export const artSrc = (name) => (art.on && has(name) ? `assets/${name}.webp` : '');
const pic = (name, cls, alt = '') => { const src = artSrc(name); return src ? `<img class="${cls}" src="${src}" alt="${esc(alt)}" decoding="async">` : ''; };
export const spaceArt = (i) => 'vig-' + VIG[i];
const NEWS_ART = { 'n-railroad': 'vig-railroad', 'n-capital': 'vig-cabins', 'n-badenbaden': 'news-baths', 'n-freebath': 'vig-freebath', 'n-fire1878': 'news-fire', 'n-fire1905': 'news-fire',
  'n-fire1913': 'news-fire', 'n-creek': 'news-flood', 'n-training': 'news-baseball', 'n-opening': 'news-racing', 'n-park': 'news-park', 'n-rowdone': 'news-park', 'n-arlington': 'news-fire',
  'n-flood1923': 'news-flood', 'n-dam': 'news-dam', 'n-derby': 'news-racing', 'n-army': 'news-army', 'n-gi': 'news-raid', 'n-record': 'news-baths', 'n-vapors': 'vig-vapors',
  'n-closure': 'news-baths', 'n-lasttrain': 'news-train', 'n-shutdown': 'news-raid', 'n-register': 'news-park', 'n-majestic': 'news-fire', 'n-maurice': 'news-park' };
const TALK_ART = { 't-narrow': 'vig-railroad', 't-waters': 'vig-freebath', 't-streetcar': 'vig-streetcar', 't-water': 'vig-watertax', 't-street': 'vig-talk', 't-course': 'vig-buckstaff',
  't-merman': 'vig-gators', 't-ostrich': 'vig-ostrich', 't-radio': 'vig-talk', 't-cornedbeef': 'vig-talk', 't-batter': 'vig-fogel', 't-sulky': 'vig-streetcar', 't-testify': 'vig-summoned',
  't-pardon': 'vig-jury', 't-inspector': 'vig-majestic', 't-payday': 'vig-depot' };

export function deedHtml(s, i) {
  const sp = SPACES[i];
  const color = sp.type === 'lot' ? DISTRICTS[sp.d].color : sp.type === 'line' || sp.type === 'util' ? '#355E41' : '#5A4C38';
  const dname = sp.type === 'lot' ? DISTRICTS[sp.d].name : sp.type === 'line' ? 'Transit line' : sp.type === 'util' ? 'Utility' : sp.type === 'corner' ? 'Corner' : sp.type === 'tax' ? 'Tax' : 'Card space';
  let owner = '';
  if (s && s.lots[i]) {
    const lot = s.lots[i], o = lot.owner;
    owner = o < 0 ? `<p class="deedown"><strong>Unowned.</strong> ${isRow(i) ? 'Leased only by auction (opening bid ' + money(sp.price / 2) + ').' : 'Price ' + money(sp.price) + '.'}</p>`
      : `<p class="deedown"><strong>Owner:</strong> ${esc(s.players[o].name)}${lot.mortgaged ? ' · <strong>mortgaged</strong> (no rent)' : ''}${lot.level ? ` · ${lot.level === 4 ? 'Grand Resort' : lot.level + ' bathhouse' + (lot.level > 1 ? 's' : '')}` : ''}<br><strong>Rent now:</strong> ${money(rentOf(s, i, 7))}${sp.type === 'util' ? ' (on a roll of 7)' : ''}${(() => { const m = multFor(s, i); return Math.abs(m - 1) > 0.01 ? ` (season and card multiplier ×${+m.toFixed(2)})` : ''; })()}</p>`;
  }
  return `<div class="deed${isRow(i) ? ' lease' : ''}" style="--dc:${color}"><div class="deedhead"><span class="dname">${esc(dname)}${isRow(i) ? ' · Federal lease' : ''}</span><h2 id="dlg-title">${esc(sp.name)}</h2></div>
    ${pic(spaceArt(i), 'deedart', 'Illustration: ' + sp.name)}
    ${sp.price ? `<p class="deedprice"><span class="gamelogic">Game price</span> <strong>${money(sp.price)}</strong></p>` : `<p>${esc(spaceRules(sp))}</p>`}
    ${rentTable(i)}${owner}${sp.fact ? factHtml(sp.fact) : ''}</div>`;
}

export function cardHtml(id, s, who) {
  const c = CARD[id], news = id.startsWith('n-');
  if (news) {
    const when = s ? `${MONTHS[s.month]}, Year ${s.year + 1}` : '';
    return `<article class="news"><div class="mast">The Barons' Gazette</div>
      <div class="dateline"><span>Headline</span><span>${esc(when)}</span><span>Hot Springs, Ark.</span></div>
      <h3 id="dlg-title" class="hed">${esc(c.title)}</h3>${pic(NEWS_ART[id], 'cut', 'Illustration')}
      ${factHtml(c.fact)}<div class="effect"><span class="gamelogic">Game effect</span> ${esc(c.effect)}</div>
      <p class="newsnote">The Barons' Gazette is the game's own newspaper; the fact above is sourced history.</p></article>`;
  }
  return `<article class="postcard"><div class="pc-top"><div class="kicker">Town Talk${who ? ' · ' + esc(who) : ''}</div><div class="stamp" aria-hidden="true">2¢</div></div>
    ${pic(TALK_ART[id], 'pcart', 'Illustration')}<h3 id="dlg-title">${esc(c.title)}</h3>${factHtml(c.fact)}
    <div class="effect"><span class="gamelogic">Game effect</span> ${esc(c.effect)}</div></article>`;
}

export function seasonsTable() {
  return `<table class="t"><thead><tr><th>Months</th><th>Season</th><th>Game effect</th><th>Why</th></tr></thead><tbody>${SEASONS.map((x) => `<tr><td>${x.months.map((m) => MONTHS[m].slice(0, 3)).join(', ')}</td><td>${esc(x.name)}${x.festival ? ' (festival)' : ''}</td><td>${Object.entries(x.d).map(([d, m]) => `${DISTRICTS[d].name} ×${m}`).join('; ')}</td><td>${x.fact ? esc(x.fact.text) + `<br><span class="src">${esc(x.fact.src)}</span>` : '<span class="gamelogic">Game logic</span>'}</td></tr>`).join('')}</tbody></table>
  <p class="fine">Festival months (March, June, October, November, December) also raise the Water Co. to ${RULES.utilFestival} × the dice. Multipliers are game rules, not history.</p>`;
}

export function helpHtml(tab) {
  if (tab === 'seasons') return `<h3>The tourism calendar</h3><p class="prose">Every time play passes the first baron, a new month begins and a Headline is drawn. Seasons multiply rents in their districts; the board shows a green ▲ or red ▼ badge with the multiplier.</p>${seasonsTable()}`;
  if (tab === 'cards') return `<h3>Headlines (one each new month)</h3><ul class="prose">${NEWS.map((c) => `<li><strong>${esc(c.title)}.</strong> ${esc(c.effect)} <span class="src">${esc(c.fact.text)} (${esc(c.fact.src)})</span></li>`).join('')}</ul>
    <h3>Town Talk (two spaces on the board)</h3><ul class="prose">${TALK.map((c) => `<li><strong>${esc(c.title)}.</strong> ${esc(c.effect)}${c.fact ? ` <span class="src">${esc(c.fact.text)} (${esc(c.fact.src)})</span>` : ' <span class="gamelogic">Fictional</span>'}</li>`).join('')}</ul>`;
  if (tab === 'controls') return `<h3>Controls</h3><table class="t"><tbody>
    <tr><th>R</th><td>Roll the dice</td></tr><tr><th>B</th><td>Buy the lot (or pay $50 at a hearing)</td></tr><tr><th>A</th><td>Send the lot to auction</td></tr>
    <tr><th>E</th><td>End turn</td></tr><tr><th>M</th><td>Manage lots: build, sell, mortgage</td></tr><tr><th>T</th><td>Propose a trade</td></tr>
    <tr><th>P / Esc</th><td>Menu / close a dialog</td></tr><tr><th>Arrow keys</th><td>Move the board cursor (focus the board first with Tab)</td></tr><tr><th>Enter</th><td>Read the deed under the cursor</td></tr></tbody></table>
    <p class="prose">Touch: tap any space to read its deed. Every action has a button.</p>`;
  return `<h3>Rules</h3><ol class="prose">
    <li>Each baron starts with ${money(RULES.startCash)} at the Depot. Roll two dice and move clockwise. Doubles roll again; a third double sends you to the Grand Jury Room.</li>
    <li>Pass or land on the Depot: collect ${money(RULES.payday)} Payday. Bathhouse Row lease holders pay $10 per lease then.</li>
    <li>Land on an unowned lot: buy it at the game price, or send it to auction. Everyone bids up from $10; the highest bid wins.</li>
    <li><strong>Bathhouse Row</strong> lots are federal leases: they always go to auction (opening at half price) and can't be mortgaged.</li>
    <li>Land on someone's lot: pay rent. Owning a whole district doubles the base rent and lets you build: up to three bathhouses, then a <strong>Grand Resort</strong>. One level per lot per turn; selling returns half.</li>
    <li>Seasons and Headlines change rents month by month (see Seasons).</li>
    <li>Mortgage a lot for half its price; it charges no rent until you lift the mortgage (half price + 10%).</li>
    <li>Trade lots and cash with any baron on your turn. Lots in districts with buildings can't be traded.</li>
    <li>If you owe more than you have, sell buildings or mortgage. If you still can't pay, you're bankrupt: your holdings go to the creditor (or back to the town).</li>
    <li><strong>Full game:</strong> the last baron standing wins (or the richest at the year limit). <strong>Short game:</strong> 12 months, two starting lots each, richest net worth wins.</li>
    <li><strong>Common Ground</strong> variant: base rent, fares, the utility and taxes go to a public treasury that pays every baron an equal dividend each month. Inspired by the anti-monopolist rules of the public-domain Landlord's Game (1904); the rules here are our own.</li></ol>
    <p class="fine">Net worth = cash + lot prices (half if mortgaged) + half the cost of buildings.</p>`;
}

export function aboutHtml() {
  return `<div class="prose"><p><strong>Bathhouse Barons</strong> is an original property-trading game set in Hot Springs, Arkansas, part of the open-source Hot Springs Games collection (MIT license).</p>
  <p>Real places appear as setting and history only. No logos are used and nothing implies endorsement by any business, park or organization. The AI barons are fictional archetypes.</p>
  <p>Every historical line in the game shows its source. Facts come from the collection's audited trivia bank and research corpus (Encyclopedia of Arkansas, National Park Service, Wikipedia and others). Prices, rents, seasons as rent rules and card effects are <span class="gamelogic">Game logic</span>.</p>
  <p>Rules heritage: the Common Ground variant is inspired by the anti-monopolist rules of <em>The Landlord's Game</em> (Elizabeth Magie, U.S. patent 748,626, 1904), which is in the public domain. This game uses none of any commercial game's names, board, cards or wording.</p>
  <p>Art: the board pictures, map painting, card art, portraits and title are original illustrations made for this game (AI-assisted image generation, then reviewed); the people in them are fictional. The tokens, buildings and dice are our own 3D models. The 3D table uses three.js (MIT). Fonts: Barlow Condensed, Alfa Slab One, Libre Caslon Text and Abril Fatface (SIL Open Font License). Sounds are synthesized in code; dice use the public-domain mulberry32 generator.</p>
  <p>Map: the centre map is painted over real geography: USGS 3DEP elevation and NHD water, U.S. Census TIGER/Line streets and rail (public domain), and Bathhouse Row and Oaklawn outlines from OpenStreetMap, © OpenStreetMap contributors, ODbL. Pins mark each space's real place; places known only from old accounts are marked "approx.". The map labels are game captions, not survey names.</p></div>`;
}

export function districtOf(i) { const sp = SPACES[i]; return sp.type === 'lot' ? sp.d : sp.type; }
export function lotLabel(i) {
  const sp = SPACES[i], c = sp.type === 'lot' ? DISTRICTS[sp.d].color : '#355E41';
  return `<span class="swatch" style="background:${c}"></span>${esc(sp.name)}`;
}
export { PERSONAS, DISTRICT_ORDER, LOTS_BY_D, buildCost, unmortgageCost, ownerOf };
