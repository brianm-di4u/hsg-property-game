// Real places on the centre map. Each board space with a known real location has a WGS84 point; the game converts it
// to metres east/north of the Fordyce Bathhouse and then to map pixels using the frame the base map was built with
// (art-src/map/map-frame.json). Sources: research/map-anchors.md (and games/trivia/research/geo-anchors.json for the
// Row, hotels, clubs and ballparks). `approx` marks places known only from narrative accounts.
export const MAP_FRAME = { x0: -3250, x1: 2350, y0: -3550, y1: 2050 };
const LAT0 = 34.5136, LON0 = -93.0533;
const M_LON = 111320 * Math.cos(LAT0 * Math.PI / 180), M_LAT = 110946;
export const toM = (lat, lon) => ({ x: (lon - LON0) * M_LON, y: (lat - LAT0) * M_LAT });

// space index -> [lat, lon, approx?]
export const PLACES = {
  0: [34.507457, -93.052689],  // Missouri-Pacific depot (c.1917), Broadway & Market
  1: [34.5163, -93.0522, 1],   // settlers' cabins: "at the springs" (narrative only)
  3: [34.5149, -93.0547, 1],   // Belding's inn: "at the springs" (narrative only)
  4: [34.5075, -93.0527, 1],   // Diamond Jo terminus: the Broadway/Market rail yard (1876 station site not found)
  5: [34.5146, -93.075, 1],    // Ostrich Farm: south side of upper Whittington Ave (no street number)
  6: [34.515, -93.07333],      // Alligator Farm, 847 Whittington Ave
  7: [34.516717, -93.062935],  // IQ Zoo, 380 Whittington Ave (1955 to about 1990)
  8: [34.504812, -93.058513],  // Garland County Courthouse, 501 Ouachita Ave
  9: [34.5151, -93.07403],     // Whittington Park ballfield (Ban Johnson Park site)
  11: [34.51468, -93.07255],   // Fogel Field: a field on the Alligator Farm's lot (shares its address)
  12: [34.495457, -93.051642], // Majestic Park, 109 W Belding St
  13: [34.531389, -93.045833], // Park Ave motor-court strip, north end
  14: [34.521389, -93.054722], // Langdon Filling Station, 311 Park Ave
  15: [34.521, -93.0555],      // Velda Rose Tower Motor Hotel, 218 Park Ave
  16: [34.512079, -93.049903], // Government Free Bathhouse (1922), 500 Reserve St
  17: [34.50775, -93.05065],   // Pythian Bathhouse, 415 Malvern Ave (from the address)
  19: [34.506933, -93.049477], // Woodmen of Union, 501 Malvern Ave
  20: [34.508417, -93.05455],  // streetcar lines met at Central and Ouachita
  21: [34.516103, -93.053511], // Southern Club, 250 Central Ave
  22: [34.514916, -93.053751], // Ohio Club, 336 Central Ave
  23: [34.521724, -93.055138], // The Vapors, 315 Park Ave
  24: [34.504812, -93.058513], // Courthouse
  25: [34.511667, -93.053889], // Eastman Hotel site (federal building, 100 Reserve St)
  26: [34.519162, -93.056484], // Majestic Hotel site, 101 Park Ave at the Y
  27: [34.516667, -93.053056], // Arlington Hotel (1924)
  28: [34.514086, -93.053074], // Display Spring behind the Maurice (thermal water)
  29: [34.514551, -93.053363], // Hale Bathhouse
  30: [34.512428, -93.053597], // Buckstaff Bathhouse
  31: [34.513714, -93.053473], // Fordyce Bathhouse
};

// Painted-map captions drawn in code (crisp at any size): [text, lat, lon, kind]
export const LABELS = [
  ['Bathhouse Row', 34.5126, -93.0598, 'district'],
  ['Central Ave', 34.4990, -93.0562, 'street'],
  ['Park Ave', 34.5270, -93.0505, 'district'],
  ['Whittington Ave', 34.5185, -93.0670, 'district'],
  ['Pleasant St', 34.5058, -93.0440, 'district'],
  ['Oaklawn', 34.4835, -93.0610, 'district'],
  ['Hot Springs Mtn', 34.5195, -93.0420, 'mountain'],
  ['West Mtn', 34.5090, -93.0700, 'mountain'],
  ['North Mtn', 34.5280, -93.0385, 'mountain'],
];

export function mapXY(i) {
  const p = PLACES[i]; if (!p) return null;
  const m = toM(p[0], p[1]);
  return { u: (m.x - MAP_FRAME.x0) / (MAP_FRAME.x1 - MAP_FRAME.x0), v: (MAP_FRAME.y1 - m.y) / (MAP_FRAME.y1 - MAP_FRAME.y0), approx: !!p[2] };
}
export function labelXY(lat, lon) {
  const m = toM(lat, lon);
  return { u: (m.x - MAP_FRAME.x0) / (MAP_FRAME.x1 - MAP_FRAME.x0), v: (MAP_FRAME.y1 - m.y) / (MAP_FRAME.y1 - MAP_FRAME.y0) };
}
