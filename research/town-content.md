# Bathhouse Barons: town content

Every place, date and number the game shows, with where it comes from. Player-facing facts
use the audited trivia bank (`games/trivia/data/questions.json`, items with `confidence:
confirmed`), cited by id. A few facts come only from `research/*.md`; those cite the corpus
file and its source link. `tools/check-facts.mjs` verifies both kinds against the files.

Everything else (prices, rents, the board order, seasons as rent rules, card effects, AI
characters) is **game logic** and is labelled that way on screen.

## 1. Board places (setting only; no logos, no endorsement)

| Space | District (game) | Fact shown on its deed | Source |
|---|---|---|---|
| Percival's Cabins | Frontier Valley | Trapper John Percival built log cabins to rent to health seekers | hs-0283 (EoA: Garland County) |
| Belding's Inn | Frontier Valley | The Belding family came from Massachusetts in 1828 and built a small hotel | hs-0007 (EoA: Garland County) |
| Ostrich Farm | Roadside Attractions | Thomas Cockburn opened it in 1900; it closed in 1953 | hs-0410 (EoA: Ostrich Farm) |
| Alligator Farm | Roadside Attractions | Founded on Whittington Avenue in 1902 | hs-0399 (Wikipedia: Hot Springs) |
| IQ Zoo | Roadside Attractions | The Brelands opened it in 1955; trained chickens walked tightropes | hs-0413, hs-0495 (EoA) |
| Whittington Park | The Ballparks | The ballfield opened in 1894 | hs-0196 (Wikipedia: Ban Johnson Park) |
| Fogel Field | The Ballparks | Built 1912 for the demand of over 250 major leaguers; also called Fordyce Field | hs-0202 (Baseball Trail) |
| Majestic Park | The Ballparks | John I. Taylor built the stands in 1909 for the Boston Red Sox | hs-0199 (Wikipedia: Majestic Park) |
| Motor Courts | Park Avenue | Park Avenue had a 1950–65 motel boom (motor-court strip, NRHP 2004) | research/downtown-and-landmarks.md → Park Avenue (Rex Nelson; NRHP list) |
| Drive-In | Park Avenue | Drive-ins and a filling station lined the strip (Langdon Filling Station, 311 Park Ave) | research/downtown-and-landmarks.md → Park Avenue |
| Tower Motel | Park Avenue | Tower motor hotels joined the strip in the motel boom | research/downtown-and-landmarks.md → Park Avenue (Velda Rose Tower Motor Hotel, 218 Park) |
| Pythian Bathhouse | Pleasant Street | The Knights of Pythias opened it in 1914, with half-price baths for members | hs-0031 (NPS: African Americans and the Hot Springs Baths) |
| Woodmen of Union | Pleasant Street | Bought in 1950 by the National Baptist Association and run as the National Baptist Hotel | hs-0048 (Wikipedia: Woodmen of Union Building) |
| Southern Club | The Clubs | Built in 1893 as a private club | hs-0074 (EoA: Southern Club) |
| Ohio Club | The Clubs | Founded on Central Avenue in 1905 | hs-0073 (EoA: Ohio Club) |
| The Vapors | The Clubs | Opened at 315 Park Avenue in 1960 | hs-0411 (EoA: Vapors) |
| Eastman Hotel | Grand Hotels | About 500 rooms | hs-0072 (Baseball Trail: The Eastman Hotel) |
| Majestic Hotel | Grand Hotels | Built 1882 as the Avenue Hotel, renamed the Majestic in 1888 | hs-0059 (EoA: Central Avenue HD) |
| Arlington Hotel | Grand Hotels | The first Arlington opened in 1875; there have been three | hs-0058, hs-0112 |
| Hale Bathhouse | Bathhouse Row | The oldest surviving bathhouse (1892–93) | hs-0061 (EoA: Bathhouse Row) |
| Buckstaff Bathhouse | Bathhouse Row | Open continuously since 1912 | hs-0062 (NPS: Buckstaff) |
| Fordyce Bathhouse | Bathhouse Row | Cost $212,749.55 to build in 1914–15 | hs-0064 (Wikipedia: Bathhouse Row) |
| Diamond Jo Railroad | Line | Cut the 21-mile trip from Malvern to about an hour | hs-0016 (EoA: Hot Springs Railroad) |
| Streetcar Line | Line | Buses replaced streetcars in 1938 | hs-0041 (Wikipedia: Intracity Transit) |
| Hot Springs Water Co. | Utility | Formed in 1882 | research/downtown-and-landmarks.md → Utilities history (Wikipedia: Hot Springs) |
| Thermal Water Tax | Tax | An 1877 act taxed thermal water | research/downtown-and-landmarks.md → Utilities history (EoA: HSNP) |
| The Depot (corner) | Payday | Visitors arrived by rail; the Missouri-Pacific depot stands at Broadway & Market | research/downtown-and-landmarks.md → Transport history |
| Grand Jury Room (corner) | Hearing | A 1947 grand jury investigated the McLaughlin machine; most indicted were acquitted | research/gangster-era-and-gambling.md (EoA: McLaughlin) |
| Free Bathhouse (corner) | Rest | Congress established the Government Free Bathhouse on Dec. 16, 1878 | hs-0019 (NPS 1920 brochure) |

**Bathhouse Row as federal leases.** The springs were reserved on April 20, 1832 (hs-0001),
and the Row became part of a national park on March 4, 1921 (hs-0033). The game therefore never
sells Row lots outright: they are leased by auction (game rule inspired by the reservation; the
NPS really does lease Row buildings, e.g. Hotel Hale, hs-0101).

**Pleasant Street ("Black Broadway").** Shown with a heritage note, never as a joke or hazard:
the Crystal Bathhouse (1904) was the first built exclusively for African Americans (hs-0063);
the Pythian followed in 1914 (hs-0031); the bathhouses were desegregated in 1965 (hs-0047).
The 1913 fire's origin (hs-0026) is shown only as the fact the bank states, and fire cards never
target this district. The Visitors Chapel AME church is not a property.

## 2. Tourism calendar (game seasons; each month's banner cites its fact)

| Months | Season in the game | Fact | Source |
|---|---|---|---|
| Dec–May | Racing season (the "Fifth Season") | Oaklawn's winter–spring meet, held December through May, is sometimes called the "Fifth Season" | hs-0470 |
| Feb–Mar | Spring training | The Chicago White Stockings first trained here in 1886 | hs-0188 |
| Mar | St. Patrick's parade week | The World's Shortest St. Patrick's Day Parade runs about 98 ft on Bridge Street | hs-0368, hs-0504 |
| Jun | Running of the Tubs / Music Festival | Teams push bathtubs down Central Avenue (since 2006); the classical Music Festival runs mostly in June | hs-0378, hs-0379, hs-0396 |
| Jun–Aug | Summer visitors | (game logic: attractions busier in summer) | — |
| Oct | Documentary Film Festival | The festival runs in October (34th edition, 2025) | hs-0395 |
| Nov–Dec | Holiday Lights | Garvan Woodland Gardens' Holiday Lights: nearly 5 million lights | hs-0384 |
| Jan–Feb | Eagle season, quiet winter | Eagle-watch cruises run in January and February | hs-0175 |

The rent multipliers attached to each season are game logic, not history.

## 3. Headlines deck (town events, drawn each new month)

Card text is ours; each card cites one audited fact. Effects are game rules.

| Card | Fact | Source |
|---|---|---|
| Diamond Jo's Railroad | Trip from Malvern cut to about an hour | hs-0016 |
| Capital for a Summer | Hot Springs was the state capital May 6 to July 14, 1862 | hs-0009 |
| America's Baden-Baden | An 1877 railroad booklet compared the town to Baden-Baden | hs-0018 |
| The Free Bathhouse | 87,040 free baths in 1919 | hs-0020 |
| Great Fire of 1878 | Destroyed most of the south and central downtown | hs-0032 |
| Fire of 1905 | Started in the Grand Central Hotel; nearly 400 buildings destroyed | hs-0028 |
| Great Fire of 1913 | $10 million damage; wood-shingle roofs outlawed afterwards | hs-0029, hs-0030 |
| Creek in a Tunnel | Hot Springs Creek enclosed in an arch, 1882–83 | hs-0119 |
| Spring Training Arrives | White Stockings, 1886 | hs-0182 |
| Racetrack Opening Day | Declared a city holiday | hs-0212 |
| A National Park | March 4, 1921, the 18th national park | hs-0034 |
| The Row Is Complete | The Lamar's 1923 opening completed the Row | hs-0077 |
| The Arlington Burns | April 5, 1923; about $1.6 million damage | hs-0039 |
| Flood of 1923 | Water swept the Central Avenue business district | research/geography-lakes-mountains.md → Floods (1923 wire report) |
| Carpenter Dam | Completed 1931; formed Lake Hamilton | hs-0121 |
| First Arkansas Derby | 1936, a $5,000 purse | hs-0214 |
| Redistribution Center | The Army took over most hotels in August 1944 | hs-0038 |
| The GI Revolt | 1946: almost 24% of poll-tax receipts thrown out | hs-0037 |
| Record Bath Year | 649,270 baths in 1946 | hs-0050 |
| The Vapors Opens | 1960, 315 Park Avenue | hs-0411 |
| First Closure on the Row | The Fordyce closed in 1962 | hs-0089 |
| The Last Train | Passenger rail ended in 1964 | hs-0044 |
| The 1967 Shutdown | Gov. Rockefeller ended the casino revival in 1967 | hs-0049 |
| National Register | Bathhouse Row listed Nov. 13, 1974 | hs-0100 |
| Majestic Fire | Feb. 27, 2014 | hs-0051 |
| Maurice Restoration | About $31.6 million, groundbreaking 2025 | hs-0052 |

## 4. Town Talk deck (personal cards from the two Town Talk spaces)

| Card | Fact | Source |
|---|---|---|
| Ride the Narrow Gauge | The original line was 3-ft narrow gauge | hs-0015 |
| Take the Waters | The Free Bathhouse gave free baths to those who couldn't pay | hs-0482 |
| Ring the Streetcar Bell | Horsecars began in the 1870s; electric cars in the 1890s | hs-0041 |
| Bottled Spring Water | Mountain Valley water was first sold in 1871 | hs-0348 |
| Shortest Street | Ripley's named Bridge Street the shortest street in the world (1940s) | hs-0490 |
| A Course of Baths | 1920 single baths ran 50 to 80 cents | hs-0021 |
| See the "Merman" | The Alligator Farm museum showed a "Merman" (a legend, not a creature) | hs-0484 |
| Ostrich Derby | Black Diamond was one of Cockburn's largest ostriches | hs-0491 |
| On the Radio | Lum and Abner started on KTHS in 1931 | hs-0401 |
| Corned Beef Day | Oaklawn's 50-cent corned beef sandwiches on opening weekend | hs-0361 |
| Batter Up | Fogel Field built 1912 for 250+ major leaguers | hs-0202 |
| The Mayor's Sulky | McLaughlin's horses were named Scotch and Soda | hs-0488 |
| Called to Testify | A 1947 grand jury investigated the machine | research/gangster-era-and-gambling.md (EoA: McLaughlin) |
| Reform Pardon | (fictional reform-era pardon; game logic) | — |
| Building Inspector | Wood-shingle roofs were outlawed after 1913 | hs-0030 |
| Payday Train | Visitors arrived at the depot by rail (to 1964) | hs-0044 |

## 5. Money scale (anchored, not historical)

No land values, rents or wages exist in the research (00-INDEX corpus gaps; downtown
"Historical money values" ends with "No sourced data: … assessed land values or rent series").
Prices are invented on a game scale ($60 to $400 lots, $1,200 start) and labelled "game
prices". The deed of the Fordyce shows its real 1914–15 cost (hs-0064) as a fact line, separate
from its game price.

## 6. Rules heritage

- **The Landlord's Game** (Elizabeth Magie, U.S. patent 748,626, 1904) is public domain. Its
  set carried "anti-monopolist" rules that rewarded all players when wealth was created, and
  "monopolist" rules — [Wikipedia: The Landlord's Game](https://en.wikipedia.org/wiki/The_Landlord%27s_Game).
  The *Common Ground* variant is our own rule set inspired by that anti-monopolist idea; the game
  doesn't reproduce any of its rules text or board.
- No commercial property-trading game's names, board, card text or rule wording is used.

## 7. People

No real person is a character. AI barons are fictional archetypes ("the Speculator", "the
Hotelier", …) with invented names. Real figures appear only inside a cited fact line
(Diamond Jo Reynolds, Mayor McLaughlin, Gov. Rockefeller), never as tokens or portraits.

## 8. Conflicts and hedges respected

- Oaklawn opening 1904 vs. 1905 (hs-0398): the game says "Racetrack Opening Day" without a year.
- Town incorporation 1851 vs. 1876: not used.
- 1946 bath count: the game uses the Row figure 649,270 as the bank states it (hs-0050).
- Capone's room: not used.
- Railroad completion 1875 vs. 1876: not used (the line's effect, not its date).
