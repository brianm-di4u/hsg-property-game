// Board, districts, seasons, decks and AI personas. Prices, rents and effects are game logic;
// every `fact` is a sourced line checked by tools/check-facts.mjs against the audited trivia
// bank (`bank` id) or a research file (`ref`). See research/town-content.md.

export const RULES = {
  startCash: 1200, payday: 150, rowGround: 10, bail: 50, tax: 100,
  lineRent: [0, 25, 60], utilMult: 6, utilFestival: 10,
  mortgageRate: 0.5, unmortgageFee: 0.1, sellRate: 0.5,
  M: [1, 5, 14, 32, 45], fullBonus: 2, minBid: 10,
};

export const DISTRICTS = {
  fv: { name: 'Frontier Valley', color: '#8A6338', pat: 'wood', icon: 'cabin', build: 50 },
  ra: { name: 'Roadside Attractions', color: '#5B7F2E', pat: 'scales', icon: 'gator', build: 50 },
  bp: { name: 'The Ballparks', color: '#1E7F74', pat: 'diamond', icon: 'ball', build: 100 },
  pa: { name: 'Park Avenue', color: '#2A6FB8', pat: 'stripes', icon: 'car', build: 100 },
  ps: { name: 'Pleasant Street', color: '#6E4A9E', pat: 'brick', icon: 'note', build: 150 },
  cl: { name: 'The Clubs', color: '#B3306B', pat: 'chevron', icon: 'dice', build: 150 },
  gh: { name: 'Grand Hotels', color: '#B8741A', pat: 'sunburst', icon: 'key', build: 200 },
  br: { name: 'Bathhouse Row', color: '#A9432C', pat: 'tile', icon: 'steam', build: 200 },
};
export const DISTRICT_ORDER = ['fv', 'ra', 'bp', 'pa', 'ps', 'cl', 'gh', 'br'];

const L = (name, short, d, price, fact) => ({ type: 'lot', name, short, d, price, fact });
export const SPACES = [
  { type: 'corner', kind: 'depot', name: 'The Depot', short: 'Depot', fact: { text: 'Visitors arrived by rail; the Missouri-Pacific depot stands at Broadway and Market.', ref: 'research/downtown-and-landmarks.md', quote: 'Missouri-Pacific Depot, Broadway & Market', src: 'NRHP list (research)' } },
  L("Percival's Cabins", 'Cabins', 'fv', 60, { text: 'Trapper John Percival built log cabins to rent to visitors to the springs.', bank: 'hs-0283', src: 'Encyclopedia of Arkansas: Garland County' }),
  { type: 'talk', name: 'Town Talk', short: 'Talk' },
  L("Belding's Inn", "Belding's", 'fv', 70, { text: 'The Belding family came from Massachusetts in 1828 and built a small hotel.', bank: 'hs-0007', src: 'Encyclopedia of Arkansas: Garland County' }),
  { type: 'line', name: 'Diamond Jo Railroad', short: 'Railroad', price: 200, fact: { text: "Diamond Jo Reynolds's line cut the 21-mile trip from Malvern to about an hour.", bank: 'hs-0016', src: 'Encyclopedia of Arkansas: Hot Springs Railroad' } },
  L('Ostrich Farm', 'Ostrich', 'ra', 100, { text: 'Thomas Cockburn opened the Ostrich Farm in 1900; it closed in 1953.', bank: 'hs-0410', src: 'Encyclopedia of Arkansas: Ostrich Farm' }),
  L('Alligator Farm', 'Gators', 'ra', 100, { text: 'The alligator farm was founded on Whittington Avenue in 1902.', bank: 'hs-0399', src: 'Wikipedia: Hot Springs, Arkansas' }),
  L('IQ Zoo', 'IQ Zoo', 'ra', 120, { text: 'The Brelands opened the IQ Zoo in 1955.', bank: 'hs-0413', src: 'Encyclopedia of Arkansas: Keller Breland' }),
  { type: 'corner', kind: 'jury', name: 'Grand Jury Room', short: 'Grand Jury', fact: { text: 'In March 1947 a grand jury investigated the McLaughlin machine; most of those indicted were acquitted.', ref: 'research/gangster-era-and-gambling.md', quote: 'Grand jury investigates McLaughlin', src: 'Encyclopedia of Arkansas: McLaughlin (research)' } },
  L('Whittington Park', 'Whittington', 'bp', 140, { text: 'The Whittington Park ballfield opened in 1894.', bank: 'hs-0196', src: 'Wikipedia: Ban Johnson Park' }),
  { type: 'util', name: 'Hot Springs Water Co.', short: 'Water Co.', price: 150, fact: { text: 'The Hot Springs Water Company was formed in 1882.', ref: 'research/downtown-and-landmarks.md', quote: '| 1882 | Hot Springs Water Company', src: 'Wikipedia: Hot Springs (research)' } },
  L('Fogel Field', 'Fogel', 'bp', 140, { text: 'Fogel Field was built in 1912 to meet the demand of over 250 major leaguers.', bank: 'hs-0202', src: 'Hot Springs Historic Baseball Trail: See the Trail' }),
  L('Majestic Park', 'Majestic Pk', 'bp', 160, { text: 'John I. Taylor built the Majestic Park stands in 1909 for the Boston Red Sox.', bank: 'hs-0199', src: 'Wikipedia: Majestic Park' }),
  L('Motor Courts', 'Motor Cts', 'pa', 180, { text: 'A motor-court strip grew along Park Avenue in the 1950–65 motel boom.', ref: 'research/downtown-and-landmarks.md', quote: '1950–65 motel boom on Park Avenue', src: 'Rex Nelson (research)' }),
  L('Drive-In', 'Drive-In', 'pa', 180, { text: 'Drive-ins and a filling station (311 Park Ave) lined the strip.', ref: 'research/downtown-and-landmarks.md', quote: 'Langdon Filling Station (311 Park Ave)', src: 'NRHP list (research)' }),
  L('Tower Motel', 'Tower', 'pa', 200, { text: 'Tower motor hotels joined the Park Avenue strip, such as one at 218 Park.', ref: 'research/downtown-and-landmarks.md', quote: 'Velda Rose Tower Motor Hotel (218 Park)', src: 'Rex Nelson (research)' }),
  { type: 'corner', kind: 'free', name: 'Free Bathhouse', short: 'Free Bath', fact: { text: 'Congress established the Government Free Bathhouse on Dec. 16, 1878.', bank: 'hs-0019', src: 'NPS 1920 brochure' } },
  L('Pythian Bathhouse', 'Pythian', 'ps', 220, { text: 'The Knights of Pythias opened the Pythian Bathhouse and Sanitarium in 1914.', bank: 'hs-0031', src: 'NPS: African Americans and the Hot Springs Baths' }),
  { type: 'talk', name: 'Town Talk', short: 'Talk' },
  L('Woodmen of Union', 'Woodmen', 'ps', 240, { text: 'The National Baptist Association bought the building and ran it as the National Baptist Hotel.', bank: 'hs-0048', src: 'Wikipedia: Woodmen of Union Building' }),
  { type: 'line', name: 'Streetcar Line', short: 'Streetcar', price: 200, fact: { text: 'Buses replaced streetcars in Hot Springs in 1938.', bank: 'hs-0041', src: 'Wikipedia: Hot Springs Intracity Transit' } },
  L('Southern Club', 'Southern', 'cl', 260, { text: 'The Southern Club was built as a private club in 1893.', bank: 'hs-0074', src: 'Encyclopedia of Arkansas: Southern Club' }),
  L('Ohio Club', 'Ohio Club', 'cl', 260, { text: 'The Ohio Club on Central Avenue was founded in 1905.', bank: 'hs-0073', src: 'Encyclopedia of Arkansas: Ohio Club' }),
  L('The Vapors', 'Vapors', 'cl', 280, { text: 'The Vapors opened at 315 Park Avenue in 1960.', bank: 'hs-0411', src: 'Encyclopedia of Arkansas: Vapors' }),
  { type: 'corner', kind: 'gojury', name: 'Called before the Grand Jury', short: 'Summoned', fact: { text: 'In March 1947 a grand jury investigated the McLaughlin machine.', ref: 'research/gangster-era-and-gambling.md', quote: 'Grand jury investigates McLaughlin', src: 'Encyclopedia of Arkansas: McLaughlin (research)' } },
  L('Eastman Hotel', 'Eastman', 'gh', 300, { text: 'The Eastman Hotel had about 500 rooms.', bank: 'hs-0072', src: 'Hot Springs Historic Baseball Trail: The Eastman Hotel' }),
  L('Majestic Hotel', 'Majestic', 'gh', 300, { text: 'Built in 1882 as the Avenue Hotel, it was renamed the Majestic in 1888.', bank: 'hs-0059', src: 'Encyclopedia of Arkansas: Central Avenue Historic District' }),
  L('Arlington Hotel', 'Arlington', 'gh', 320, { text: 'The first Arlington Hotel opened in 1875.', bank: 'hs-0058', src: 'Arlington Hotel: History' }),
  { type: 'tax', name: 'Thermal Water Tax', short: 'Water Tax', fact: { text: 'An 1877 act taxed thermal water.', ref: 'research/downtown-and-landmarks.md', quote: '1877 act taxed thermal water', src: 'Encyclopedia of Arkansas: HSNP (research)' } },
  L('Hale Bathhouse', 'Hale', 'br', 350, { text: 'The Hale, built in 1892-93, is the oldest surviving bathhouse on the Row.', bank: 'hs-0061', src: 'Encyclopedia of Arkansas: Bathhouse Row' }),
  L('Buckstaff Bathhouse', 'Buckstaff', 'br', 380, { text: 'The Buckstaff has offered baths continuously since 1912.', bank: 'hs-0062', src: 'NPS: Buckstaff Bathhouse' }),
  L('Fordyce Bathhouse', 'Fordyce', 'br', 400, { text: 'The Fordyce cost $212,749.55 to build in 1914–15, including fixtures.', bank: 'hs-0064', src: 'Wikipedia: Bathhouse Row' }),
];
SPACES.forEach((s, i) => { s.i = i; });

export const N_SPACES = SPACES.length; // 32
export const DEPOT = 0;
export const JURY = 8;
export const FREE = 16;
export const GOJURY = 24;
export const LOTS_BY_D = {};
for (const s of SPACES) if (s.type === 'lot') (LOTS_BY_D[s.d] ||= []).push(s.i);
export const OWNABLE = SPACES.filter((s) => s.type === 'lot' || s.type === 'line' || s.type === 'util').map((s) => s.i);
export const LINES = SPACES.filter((s) => s.type === 'line').map((s) => s.i);
export const isRow = (i) => SPACES[i].d === 'br';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Tourism calendar (game logic; each season's fact is sourced).
export const SEASONS = [
  { id: 'racing', name: 'Racing season', months: [11, 0, 1, 2, 3, 4], d: { gh: 1.5 }, fact: { text: 'The winter–spring racing meet, held December through May, is sometimes called the "Fifth Season".', bank: 'hs-0470', src: 'Wikipedia: Hot Springs, Arkansas' } },
  { id: 'spring', name: 'Spring training', months: [1, 2], d: { bp: 1.5 }, fact: { text: 'The Chicago White Stockings first held spring training in Hot Springs in 1886.', bank: 'hs-0188', src: 'Wikipedia: Hot Springs, Arkansas' } },
  { id: 'parade', name: "St. Patrick's parade", months: [2], d: { cl: 1.5 }, festival: true, fact: { text: "The World's Shortest St. Patrick's Day Parade runs a 98-foot route.", bank: 'hs-0504', src: "Encyclopedia of Arkansas: World's Shortest St. Patrick's Day Parade" } },
  { id: 'tubs', name: 'Running of the Tubs', months: [5], d: { br: 1.5 }, festival: true, fact: { text: 'Teams push bathtubs down Central Avenue each year.', bank: 'hs-0378', src: 'Visit Hot Springs: 2020 version of the World Championship Running of the Tubs (press release)' } },
  { id: 'summer', name: 'Summer visitors', months: [5, 6, 7], d: { ra: 1.5 }, fact: null },
  { id: 'film', name: 'Film festival', months: [9], d: { gh: 1.5 }, festival: true, fact: { text: 'The Documentary Film Festival runs in October (34th edition in 2025).', bank: 'hs-0395', src: 'UA Little Rock Public Radio: 34th Hot Springs Documentary Film Festival' } },
  { id: 'lights', name: 'Holiday Lights', months: [10, 11], d: { pa: 1.5 }, festival: true, fact: { text: 'Garvan Woodland Gardens\' Holiday Lights feature nearly 5 million lights.', bank: 'hs-0384', src: 'Visit Hot Springs: A reason to visit every season' } },
  { id: 'winter', name: 'Quiet winter', months: [0, 1], d: { ra: 0.5 }, fact: { text: 'Eagle-watch cruises look for bald eagles in January and February.', bank: 'hs-0175', src: 'Arkansas Democrat-Gazette: Eagle-watching excursions take off at state parks (2019)' } },
];

// Headlines: drawn at the start of each month; town-wide. `fx` is game logic.
export const NEWS = [
  { id: 'n-railroad', title: "Diamond Jo's Railroad", fx: { mod: { space: 4, mult: 2 } }, effect: 'Diamond Jo Railroad fares are doubled this month.', fact: { text: 'The line cut the 21-mile trip from Malvern from most of a day to about an hour.', bank: 'hs-0016', src: 'Encyclopedia of Arkansas: Hot Springs Railroad' } },
  { id: 'n-capital', title: 'Capital for a Summer', fx: { mod: { d: 'fv', mult: 2 } }, effect: 'Frontier Valley rents are doubled this month.', fact: { text: 'Hot Springs was the state capital from May 6 to July 14, 1862.', bank: 'hs-0009', src: 'Encyclopedia of Arkansas: Garland County' } },
  { id: 'n-badenbaden', title: "America's Baden-Baden", fx: { all: 30 }, effect: 'Visitors pour in: every baron collects $30.', fact: { text: 'An 1877 railroad booklet promoted Hot Springs as "America\'s Baden-Baden".', bank: 'hs-0018', src: 'NPS: Getting to the American Spa' } },
  { id: 'n-freebath', title: 'The Free Bathhouse', fx: { richPay: { over: 600, n: 50 } }, effect: 'Every baron holding more than $600 cash gives $50 to the bath fund.', fact: { text: 'The Government Free Bathhouse gave about 87,040 free baths in 1919.', bank: 'hs-0020', src: 'NPS 1920 brochure' } },
  { id: 'n-fire1878', title: 'Great Fire of 1878', fx: { repairs: { per: 20, resort: 50 } }, effect: 'Repairs: pay $20 per bathhouse and $50 per Grand Resort.', fact: { text: 'A great fire in 1878 destroyed most of the south and central downtown area.', bank: 'hs-0032', src: 'NPS: History & Culture' } },
  { id: 'n-fire1905', title: 'Fire of 1905', fx: { fire: { d: 'gh' } }, effect: 'Every Grand Hotels lot loses one bathhouse. Grand Resorts are brick and stand.', fact: { text: 'The deadly Feb. 25, 1905, fire started in the Grand Central Hotel; nearly 400 buildings were destroyed.', bank: 'hs-0028', src: 'Encyclopedia of Arkansas: Fire of 1905' } },
  { id: 'n-fire1913', title: 'Great Fire of 1913', fx: { fireAll: true }, effect: 'Each baron loses one bathhouse from their most-built lot. Grand Resorts are brick and stand.', fact: { text: 'The 1913 fire left more than 2,500 people homeless; the damage was put at $10 million.', bank: 'hs-0029', src: 'Encyclopedia of Arkansas: Fire of 1913' } },
  { id: 'n-creek', title: 'Creek in a Tunnel', fx: { all: 20 }, effect: 'Flood control pays off: every baron collects $20.', fact: { text: 'In 1882-83 the government enclosed Hot Springs Creek in an underground arch.', bank: 'hs-0119', src: 'NPS: History & Culture' } },
  { id: 'n-training', title: 'Spring Training Arrives', fx: { mod: { d: 'bp', mult: 2 } }, effect: 'Ballpark rents are doubled this month.', fact: { text: 'The Chicago White Stockings became the first major league club to train here, in 1886.', bank: 'hs-0182', src: 'Wikipedia: Hot Springs, Arkansas' } },
  { id: 'n-opening', title: 'Racetrack Opening Day', fx: { all: 50 }, effect: 'A city holiday: every baron collects $50.', fact: { text: 'Hot Springs declared a city holiday for the racetrack\'s first day of racing.', bank: 'hs-0212', src: 'Wikipedia: Oaklawn Racing Casino Resort' } },
  { id: 'n-park', title: 'A National Park', fx: { mod: { d: 'br', mult: 1.5 } }, effect: 'Bathhouse Row rents ×1.5 this month.', fact: { text: 'The reservation became the 18th national park on March 4, 1921.', bank: 'hs-0034', src: 'NPS: History & Culture' } },
  { id: 'n-rowdone', title: 'The Row Is Complete', fx: { dOwners: { d: 'br', per: 50 } }, effect: 'Each Bathhouse Row lease holder collects $50 per lease.', fact: { text: "The Lamar's 1923 opening completed Bathhouse Row.", bank: 'hs-0077', src: 'NPS: History & Culture' } },
  { id: 'n-arlington', title: 'The Arlington Burns', fx: { mod: { space: 27, mult: 0 }, fireSpace: 27 }, effect: 'The Arlington Hotel collects no rent this month and loses one bathhouse.', fact: { text: 'The second Arlington Hotel burned on April 5, 1923.', bank: 'hs-0039', src: 'Wikipedia: Arlington Hotel' } },
  { id: 'n-flood1923', title: 'Flood of 1923', fx: { repairs: { per: 15, resort: 40, ds: ['cl', 'gh', 'br'] } }, effect: 'Central Avenue cleanup: pay $15 per bathhouse and $40 per Grand Resort on Clubs, Hotels and Row lots.', fact: { text: 'In May 1923 a flood swept the Central Avenue business district, tossing cars.', ref: 'research/geography-lakes-mountains.md', quote: 'Flood swept the Central Avenue business district, tossing cars', src: '1923 wire report (research)' } },
  { id: 'n-dam', title: 'Carpenter Dam', fx: { ownerGets: { space: 10, n: 100 } }, effect: 'The Water Co. owner collects $100 from the bank.', fact: { text: 'Carpenter Dam was completed in 1931, forming Lake Hamilton.', bank: 'hs-0121', src: 'Wikipedia: Lake Hamilton' } },
  { id: 'n-derby', title: 'First Arkansas Derby', fx: { poorestGets: 150 }, effect: 'Long-shot purse: the baron with the lowest net worth collects $150.', fact: { text: 'The first Arkansas Derby was run in 1936 for a $5,000 purse.', bank: 'hs-0214', src: 'Encyclopedia of Arkansas: Oaklawn Park' } },
  { id: 'n-army', title: 'Redistribution Center', fx: { dOwners: { d: 'gh', per: 60 }, mod: { d: 'gh', mult: 0 } }, effect: 'The Army takes the hotels: Grand Hotels owners collect $60 per lot from the bank, but no rent this month.', fact: { text: 'The Army took over most of the hotels in August 1944.', bank: 'hs-0038', src: 'Wikipedia: Hot Springs, Arkansas' } },
  { id: 'n-gi', title: 'The GI Revolt', fx: { mod: { d: 'cl', mult: 0.5, months: 2 } }, effect: 'Reform: club rents are halved for two months.', fact: { text: 'In 1946 Judge John Miller threw out almost 24% of the primary poll-tax receipts.', bank: 'hs-0037', src: 'Encyclopedia of Arkansas: GI Revolt' } },
  { id: 'n-record', title: 'Record Bath Year', fx: { mod: { d: 'br', mult: 2 } }, effect: 'Bathhouse Row rents are doubled this month.', fact: { text: 'A record 649,270 baths were taken on the Row in 1946.', bank: 'hs-0050', src: 'Wikipedia: Bathhouse Row' } },
  { id: 'n-vapors', title: 'The Vapors Opens', fx: { mod: { d: 'cl', mult: 1.5 } }, effect: 'Club rents ×1.5 this month.', fact: { text: 'The Vapors opened at 315 Park Avenue in 1960.', bank: 'hs-0411', src: 'Encyclopedia of Arkansas: Vapors' } },
  { id: 'n-closure', title: 'First Closure on the Row', fx: { mod: { d: 'br', mult: 0.5 } }, effect: 'Bathing declines: Bathhouse Row rents are halved this month.', fact: { text: 'The Fordyce was the first Row bathhouse to close, in 1962.', bank: 'hs-0089', src: 'NPS: History & Culture' } },
  { id: 'n-lasttrain', title: 'The Last Train', fx: { mod: { space: 4, mult: 0.5, months: 3 } }, effect: 'Diamond Jo Railroad fares are halved for three months.', fact: { text: 'The last passenger train to and from Hot Springs ran in 1964.', bank: 'hs-0044', src: 'Encyclopedia of Arkansas: Hot Springs Railroad' } },
  { id: 'n-shutdown', title: 'The 1967 Shutdown', fx: { mod: { d: 'cl', mult: 0, months: 1 } }, effect: 'Raids close the clubs: no club rent this month.', fact: { text: 'Gov. Winthrop Rockefeller ended the casino revival in 1967.', bank: 'hs-0049', src: 'Wikipedia: Sid McMath' } },
  { id: 'n-register', title: 'National Register', fx: { dOwners: { d: 'br', per: 30, perLevel: 20 } }, effect: 'Preservation grant: Row lease holders collect $30 per lease and $20 per bathhouse.', fact: { text: 'Bathhouse Row was listed on the National Register on Nov. 13, 1974.', bank: 'hs-0100', src: 'NPS: History & Culture' } },
  { id: 'n-majestic', title: 'Majestic Fire', fx: { fireSpace: 26 }, effect: 'The Majestic Hotel loses one bathhouse.', fact: { text: "The Majestic Hotel caught fire on Feb. 27, 2014.", bank: 'hs-0051', src: 'Encyclopedia of Arkansas: Hot Springs (city)' } },
  { id: 'n-maurice', title: 'Maurice Restoration', fx: { all: 40 }, effect: 'Construction jobs: every baron collects $40.', fact: { text: 'The Maurice Bathhouse restoration, about $31.6 million, broke ground in August 2025.', bank: 'hs-0052', src: 'NPS: Groundbreaking celebrated for Maurice Bathhouse rehabilitation' } },
];

// Town Talk: personal cards from the two Town Talk spaces.
export const TALK = [
  { id: 't-narrow', title: 'Ride the Narrow Gauge', fx: { advance: 4 }, effect: 'Advance to the Diamond Jo Railroad.', fact: { text: 'The original Hot Springs Railroad from Malvern was 3-foot narrow gauge.', bank: 'hs-0015', src: 'Encyclopedia of Arkansas: Hot Springs Railroad' } },
  { id: 't-waters', title: 'Take the Waters', fx: { advance: 16 }, effect: 'Advance to the Free Bathhouse.', fact: { text: 'The Free Bathhouse gave free baths to health seekers who could not afford the pay bathhouses.', bank: 'hs-0482', src: 'NPS: History & Culture' } },
  { id: 't-streetcar', title: 'Ring the Streetcar Bell', fx: { advance: 20 }, effect: 'Advance to the Streetcar Line.', fact: { text: 'Horsecars began in the 1870s and electric cars followed in the 1890s.', bank: 'hs-0041', src: 'Wikipedia: Hot Springs Intracity Transit' } },
  { id: 't-water', title: 'Bottled Spring Water', fx: { gain: 75 }, effect: 'Your bottled-water stake pays off: collect $75.', fact: { text: 'Mountain Valley Spring Water dates to 1871.', bank: 'hs-0348', src: 'Encyclopedia of Arkansas: Mountain Valley Spring Water' } },
  { id: 't-street', title: 'Shortest Street', fx: { gain: 25 }, effect: 'You win a bar bet: collect $25.', fact: { text: "Ripley's Believe It or Not called Bridge Street the shortest street in the world in the 1940s.", bank: 'hs-0490', src: 'ACHP: The Hot Springs National Park Visitors Center' } },
  { id: 't-course', title: 'A Course of Baths', fx: { pay: 40 }, effect: 'Treat yourself to a course of baths: pay $40.', fact: { text: 'In 1920 a single bath cost 50 to 80 cents before attendant fees.', bank: 'hs-0021', src: 'NPS 1920 brochure' } },
  { id: 't-merman', title: 'See the "Merman"', fx: { pay: 15 }, effect: 'Pay $15 to see the alligator farm\'s "Merman" (a legend, not a creature).', fact: { text: 'The Alligator Farm\'s early museum showed a "Merman", said to be a mummified creature.', bank: 'hs-0484', src: 'Encyclopedia of Arkansas: Arkansas Alligator Farm and Petting Zoo' } },
  { id: 't-ostrich', title: 'Ostrich Derby', fx: { gain: 50 }, effect: 'Your pick wins the ostrich race: collect $50.', fact: { text: 'Black Diamond was one of Thomas Cockburn\'s largest and most popular ostriches.', bank: 'hs-0491', src: 'Encyclopedia of Arkansas: Ostrich Farm' } },
  { id: 't-radio', title: 'On the Radio', fx: { collectEach: 15 }, effect: 'Your radio spot is a hit: collect $15 from each baron.', fact: { text: 'Lum and Abner first performed on KTHS in April 1931.', bank: 'hs-0401', src: 'Encyclopedia of Arkansas: KTHS Radio Station' } },
  { id: 't-cornedbeef', title: 'Corned Beef Day', fx: { payEach: 10 }, effect: 'Lunch at the races is on you: pay each baron $10.', fact: { text: 'Opening weekend brings 50-cent corned beef sandwiches at the track.', bank: 'hs-0361', src: 'Arkansas Democrat-Gazette (2013): Oaklawn Park opens 2013' } },
  { id: 't-batter', title: 'Batter Up', fx: { advance: 11 }, effect: 'Advance to Fogel Field.', fact: { text: 'Fogel Field was built in 1912 for the demand of over 250 major leaguers.', bank: 'hs-0202', src: 'Hot Springs Historic Baseball Trail: See the Trail' } },
  { id: 't-sulky', title: "The Mayor's Sulky", fx: { back: 3 }, effect: 'Stopped by the parade: go back three spaces.', fact: { text: "Mayor Leo McLaughlin's sulky horses were named Scotch and Soda.", bank: 'hs-0488', src: 'Encyclopedia of Arkansas: Leo P. McLaughlin' } },
  { id: 't-testify', title: 'Called to Testify', fx: { jury: true }, effect: 'Go straight to the Grand Jury Room. No Payday.', fact: { text: 'In March 1947 a grand jury investigated the McLaughlin machine.', ref: 'research/gangster-era-and-gambling.md', quote: 'Grand jury investigates McLaughlin', src: 'Encyclopedia of Arkansas: McLaughlin (research)' } },
  { id: 't-pardon', title: 'Reform Pardon', fx: { pardon: true }, effect: 'Keep this card: it releases you from the Grand Jury Room once.', fact: null },
  { id: 't-inspector', title: 'Building Inspector', fx: { repairs: { per: 25, resort: 60 } }, effect: 'Inspection: pay $25 per bathhouse and $60 per Grand Resort.', fact: { text: 'Hot Springs outlawed wood-shingle roofs after the 1913 fire.', bank: 'hs-0030', src: 'Encyclopedia of Arkansas: Fire of 1913' } },
  { id: 't-payday', title: 'Payday Train', fx: { advance: 0 }, effect: 'Advance to the Depot and collect Payday.', fact: { text: 'Passenger trains served Hot Springs until 1964.', bank: 'hs-0044', src: 'Encyclopedia of Arkansas: Hot Springs Railroad' } },
];

export const CARD = Object.fromEntries([...NEWS, ...TALK].map((c) => [c.id, c]));

// AI personalities (fictional archetypes). Weights feed ai.js.
export const PERSONAS = {
  speculator: { name: 'Speculator', who: 'Cornelius Vane', reserve: 0.55, bid: 1.15, buyBar: 0.75, build: 0.8, trade: 0.6, margin: 0.02, taste: {} , blurb: 'Buys nearly everything and bids high.' },
  hotelier: { name: 'Hotelier', who: 'Odessa Marlow', reserve: 0.9, bid: 1.0, buyBar: 0.9, build: 0.6, trade: 0.4, margin: 0.05, taste: { gh: 1.3 }, blurb: 'Builds early and loves the Grand Hotels.' },
  banker: { name: 'Banker', who: 'Thaddeus Crane', reserve: 1.5, bid: 0.85, buyBar: 1.05, build: 1.2, trade: 0.2, margin: 0.12, taste: {}, blurb: 'Keeps a fat cash reserve and drives hard bargains.' },
  showman: { name: 'Showman', who: 'Lulu Delacroix', reserve: 0.8, bid: 1.05, buyBar: 0.85, build: 0.8, trade: 0.4, margin: 0.07, taste: { cl: 1.15, ra: 1.15 }, blurb: 'Trades often and loves the clubs and attractions.' },
  preservationist: { name: 'Preservationist', who: 'Hazel Ashby', reserve: 1.0, bid: 1.0, buyBar: 0.9, build: 0.9, trade: 0.4, margin: 0.06, taste: { br: 1.35, ps: 1.3 }, blurb: 'Prizes Bathhouse Row and Pleasant Street.' },
  gambler: { name: 'Gambler', who: 'Jack Tolliver', reserve: 0.4, bid: 1.25, buyBar: 0.8, build: 0.7, trade: 0.5, margin: 0.0, taste: {}, blurb: 'Plays it loose: thin reserve, wild bids.', wild: true },
};
export const PERSONA_KEYS = Object.keys(PERSONAS);

export const TOKENS = [
  { shape: 'jug', label: 'Jug', color: '#D55E00' },
  { shape: 'hat', label: 'Top hat', color: '#0072B2' },
  { shape: 'shoe', label: 'Horseshoe', color: '#009E73' },
  { shape: 'parasol', label: 'Parasol', color: '#CC79A7' },
  { shape: 'fish', label: 'Sculpin', color: '#E69F00' },
  { shape: 'car', label: 'Streetcar', color: '#56B4E9' },
];
