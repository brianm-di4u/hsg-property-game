# Map anchors: period map of Hot Springs (1880s-1950s)

Pins for the illustrated center map. The machine-readable version is `map-anchors.json`, which also carries 31 anchors reused unchanged from `games/trivia/research/geo-anchors.json`: the bathhouses, the Arlington, the Southern and Ohio clubs, the federal building, the Velda Rose, the Park Ave strip ends, Whittington Park, Ban Johnson, Fogel Field, Majestic Park, Oaklawn, the tower, the mountains and the lakes. Coordinates are WGS84.

**Confidence levels:**
- **surveyed:** a published coordinate, or an NRHP UTM reference converted with NGS NCAT.
- **derived:** from an address or an OSM footprint, accurate to about 15-40 m.
- **approximate:** from narrative only; the pin is a placement, not a measurement.

**OSM:** points marked `osm` are (c) OpenStreetMap contributors, ODbL 1.0. Credit OSM on the board or in the credits.

**Datum caveat:** Wikipedia NRHP-list coordinates rounded to arc-seconds are NRIS NAD27 values. They sit about 17 m east and 9 m south of WGS84, which is below pin precision. The depot shows it: its NRHP UTM converts to a point within 4 m of the OSM footprint, while Wikipedia's value is 17 m off.

## Anchors

| # | Place | Lat | Lon | Address | Years | Conf. | Main sources |
|---|---|---|---|---|---|---|---|
| 1 | Pythian Bathhouse & Sanitarium (site; earlier Crystal Bathhouse) | 34.50775 | -93.05065 | 415 Malvern Ave (east side, Block 66) | Crystal 1904-1913; Pythian 1914, 4 stories c.1923, closed 1974; demolished | derived (osm) | [EOA Crystal](https://encyclopediaofarkansas.net/entries/crystal-bathhouse-4253/), [LOC HABS](https://www.loc.gov/item/ar0041), [Green Book](https://community.village.virginia.edu/greenbooks/content/pythian-baths) |
| 2 | Woodmen of Union Bldg / National Baptist Hotel | 34.506933 | -93.049477 | 501 Malvern Ave | 1923-24; Natl Baptist Hotel 1950-1981 | surveyed | [OSM node 359023445](https://www.openstreetmap.org/node/359023445), [Wikipedia](https://en.wikipedia.org/wiki/Woodmen_of_Union_Building), [NRHP 97000616](https://npgallery.nps.gov/NRHP/GetAsset/NRHP/97000616_text) |
| 3 | Pleasant Street HD (centroid) | 34.507109 | -93.047722 | Malvern / Gulpha-Church / Laurel-Mound / Kirk-Shiloh | 1900-1950 | surveyed | [NRHP 03000532](https://npgallery.nps.gov/NRHP/GetAsset/NRHP/03000532_text), [Wikipedia](https://en.wikipedia.org/wiki/Pleasant_Street_Historic_District_(Hot_Springs,_Arkansas)) |
| 4 | The Vapors | 34.521724 | -93.055138 | 315 Park Ave | Built 1959, opened 1960; gambling to c.1967; Vapors Live 2017+ | derived (osm) | [EOA](https://encyclopediaofarkansas.net/entries/vapors-3998/) |
| 5 | Majestic Hotel (site) | 34.519162 | -93.056484 | 101 Park Ave, at the Y | 1882 (Avenue Hotel) to 2006; fire 2014; razed 2016 | derived (osm) | [OSM way 1214138575](https://www.openstreetmap.org/way/1214138575), [EOA](https://encyclopediaofarkansas.net/entries/majestic-hotel-8351/), [HMdb 211201](https://www.hmdb.org/m.asp?m=211201) |
| 6 | Eastman Hotel (site) | 34.511667 | -93.053889 | 100 Reserve St | 1890 to 1946 or 1950s | surveyed (reused) | [Wikipedia](https://en.wikipedia.org/wiki/Federal_Building%E2%80%93U.S._Post_Office_and_Court_House_(Hot_Springs,_Arkansas)), [HMdb 211010](https://www.hmdb.org/m.asp?m=211010) |
| 7 | Ostrich Farm | 34.5146 | -93.0750 | Upper Whittington Ave, south side, across from the amusement park | 1900-1953 | **approximate** | [EOA](https://encyclopediaofarkansas.net/entries/ostrich-farm-in-hot-springs-4429/), [AHPP tour script](https://www.arkansasheritage.com/docs/default-source/ahpp-documents/sandwiching-tour-scripts/whittington-park-hd-hot-springs-tour-script-2013d4f82089-4189-413f-bd33-64d6c5cd965a.pdf?sfvrsn=d7fbb9_5) |
| 8 | Alligator Farm | 34.515000 | -93.073330 | 847 Whittington Ave (SW corner of Woodfin) | 1902-present | surveyed | [Wikipedia](https://en.wikipedia.org/wiki/Arkansas_Alligator_Farm_and_Petting_Zoo), AHPP tour script |
| 9 | IQ Zoo | 34.516717 | -93.062935 | **380 Whittington Ave** | 1955-c.1990 | derived (osm) | [EOA](https://encyclopediaofarkansas.net/entries/iq-zoo-2538/), AHPP tour script |
| 10a | First settlers' cabins (Prudhomme, Perciful, Gates) | 34.513889 | -93.053611 | At the springs | 1807 or 1809 | **approximate** | [EOA Hot Springs](https://encyclopediaofarkansas.net/entries/hot-springs-887/), [NPS 1920](https://npshistory.com/publications/hosp/brochures/1920/sec1.htm) |
| 10b | Belding's inn | 34.5140 | -93.0535 | At the springs | c.1828-1833 | **approximate** | [genealogy.com](https://www.genealogy.com/forum/surnames/topics/belding/316/), [ADG 2013](https://www.pressreader.com/usa/arkansas-democrat-gazette/20130915/283515088598860) |
| 11a | Missouri-Pacific depot | 34.507457 | -93.052689 | Broadway at Market St | c.1917; passenger trains to 1964 | surveyed | [NRHP 92000611](https://npgallery.nps.gov/NRHP/GetAsset/NRHP/92000611_text) (UTM via NCAT), [OSM way 1213970866](https://www.openstreetmap.org/way/1213970866) |
| 11b | Diamond Jo (Hot Springs RR) terminus | 34.5075 | -93.0527 | Unknown; placed at the Broadway/Market yard | 1875-76 to 1964 | **approximate** | [Wikipedia](https://en.wikipedia.org/wiki/Hot_Springs_Railroad), [EOA](https://encyclopediaofarkansas.net/entries/hot-springs-railroad-14157) |
| 12a | Streetcar hub (Central & Ouachita) | 34.508417 | -93.054550 | Central Ave at Ouachita Ave | 1875-1938 | surveyed | [HMdb 264082](https://www.hmdb.org/m.asp?m=264082), [HMdb 211154](https://www.hmdb.org/m.asp?m=211154) |
| 12b | Streetcar car barn (Whittington) | 34.515432 | -93.072378 | about 810 Whittington Ave | c.1900-1938 | approximate | AHPP tour script |
| 13 | Hot Springs Water Co. works | - | - | Unknown | franchise 1881 (reported) | **not found** | see notes |
| 14a | Free Bathhouse 1878/1891 (Mud Hole Spring) | 34.5126 | -93.0520 | Behind the Row, between the Quapaw and the Rehab Center | 1878 to 1921/22 | **approximate** | [EOA](https://encyclopediaofarkansas.net/entries/government-free-bathhouse-14771/), [NPS Mud Hole](https://www.nps.gov/places/mud-hole.htm) |
| 14b | Free Bathhouse 1921/22 (later Libbey Center) | 34.512079 | -93.049903 | 500 Reserve St | 1921/22 to 1957; Libbey Center to 2001 | derived (osm) | EOA, [NPS 2021](https://www.nps.gov/hosp/learn/news/libbey-physical-medicine-center-thermal-water-jug-fountain-to-close-temporarily.htm) |
| 15 | Garland County Courthouse | 34.504812 | -93.058513 | 501 Ouachita Ave at Hawthorne | 1905; rebuilt after the 1913 fire | derived (osm) | [OSM node 367128821](https://www.openstreetmap.org/node/367128821), [Wikipedia](https://en.wikipedia.org/wiki/Garland_County_Courthouse) |
| 16 | Motor courts and drive-ins (13 NRHP items) | see JSON | | Park Ave 311-1007; Central 135 and 240 | 1920s-1960s | surveyed | [Wikipedia NRHP list](https://en.wikipedia.org/wiki/National_Register_of_Historic_Places_listings_in_Garland_County,_Arkansas) |

**Item 16 detail:** These are all on Park Ave unless noted.
- Taylor Rosamond Motel, 316
- Langdon Filling Station, 311
- Butchie's Drive-In, 534
- Cottage Courts, 609
- Bellaire Court, 637
- Cove Tourist Court, 771
- Wheatley Courts / Kloss Motel, 811 (razed 2015)
- Parkway Courts, 815
- Lynwood Tourist Court, 857
- Opal's Steak House, 871
- Perry Plaza Court, 1007
- Hill Wheatley Downtowner, 135 Central Ave
- Aristocrat Motor Inn, 240 Central Ave

The Vapors at 315 Park Ave replaced the Phillips Drive-In.

## Notes and conflicts

1. **Pythian.** The Crystal Bathhouse opened on 1904-04-01 and burned on 1913-09-05. The Pythian opened in 1914. W. T. Bailey's letter of 1924-01-04 calls the 4-story building "completed six months ago".
   - **Closing date conflict:** the EOA says 1974; a Tuskegee-linked secondary source says 1965.
   - **Status:** demolished (Green Book, SAH Archipedia); the date is unknown.
   - **HABS number:** search snippets give AR-29, not AR-41. Unverified, because loc.gov blocked the fetch.
   - **Pin:** the interpolated address, nudged about 20 m east of the street centerline. The nearest OSM building today is a parking structure.
2. **Pleasant Street.** The JSON carries the 12 NRHP boundary vertices (converted from NAD27) and a bbox: S 34.5052, N 34.5091, W -93.0507, E -93.0452.
   - Pleasant St runs NW-SE through the middle. Its 4-block core runs from Jefferson to Church.
   - The 1950s Malvern Ave commercial strip, the Black business district with the Woodmen and Pythian buildings, formed its west edge.
3. **Majestic dates conflict.**
   - EOA Majestic entry: Avenue Hotel 1882; renamed 1888; yellow brick 1892; domed building 1902; red-brick annex 1926; Lanai Tower 1963.
   - EOA Hot Springs entry: opened in 1893 as the yellow-brick building.
   - HMdb marker: "constructed in 1902 and expanded in 1926".
4. **Eastman.** Confirmed: the 1959-60 Federal Building stands "on the site of the Eastman Hotel" (Wikipedia). The hotel was built in 1890 with about 500 rooms (HMdb).
   - **Demolition date conflict:** 1946 per the Marmot archive record and a Shorpy caption. A search summary attributes "the 1950s" to an HMdb page, but the inscription I read gives no date.
   - **Drawing:** the hotel filled the whole block, so draw it larger than the federal building.
5. **Ostrich Farm.** There is no street number. The AHPP tour script says it was "across from the amusement park", and the amusement park was west of the ballpark. hsnp.com says 27 acres, "just west of the Leap the Dips".
   - **Size and flock:** 7 acres and 200 birds (Sentinel-Record) vs 27 acres and 300+ birds.
   - **Founder:** Thomas A. vs Charles Cockburn.
   - **Founder's death:** 1930 vs 1936.
   - **Marker:** the HMdb "Ostrich Farm" plaque is on Central Ave downtown and is not the site.
6. **Alligator Farm.** Confirmed at 847 Whittington. A correction to geo-anchors.json: Fogel Field is not the farm itself. It is a field on the farm's property next to its parking lot, so the two share the address.
   - **Purchase-year conflict:** 1945 (Wikipedia, AHPP) vs 1947 (EOA).
7. **IQ Zoo.** It was at **380 Whittington Ave**, not Central (EOA and the AHPP tour script), from 1955 to about 1990. The building is demolished. Nominatim's two interpolations differ by 85 m.
8. **Earliest settlers.** No source sites any cabin more precisely than "at the springs".
   - **Dates conflict:** 1807 (NPS 1920: Prudhomme, joined by Perciful and Gates) vs 1809 (EOA: Perciful).
   - **Belding's inn:** about 1828. Ludovicus died in 1833. This is weakly sourced.
   - **First inn:** disputed. A marker credits Josiah and Nancy Mellard with a double-log-cabin hotel in 1820.
   - **Drawing:** a cabin cluster on Hot Springs Creek at the foot of Hot Springs Mountain.
9. **Railroads.** The 1875-76 Hot Springs Railroad (Diamond Jo) was narrow gauge until 1889-10-16, with passenger service to 1964. The site of its first Hot Springs station was not found.
   - **EOA conflation:** the EOA says the line's station "still stands" as the Transportation Depot, but the NRHP says that building is a c.1917 MoPac depot.
   - **Ownership conflict:** the EOA has it pass to the Choctaw, Oklahoma and Gulf and then the Rock Island in 1901-02. Wikipedia places the trackage in the MoPac/UP lineage.
   - **Rock Island depot:** the Little Rock and Hot Springs Western (Rock Island) had a separate depot around 1900 (Shorpy photo); its location was not found.
   - **Where to check:** the 1886-1915 Sanborn sheets show the depots.
10. **Streetcars.**
    - **Dates:** mule or horse cars from 1874-75 (2 cars, about 2 miles of track); electric from about 1893-95; buses from 1938-10-16 (one source says 1939). The 1913 fire knocked out the power plant, and mules filled in.
    - **Sourced routes:**
      - the Central Ave trunk to the Oaklawn race track, which had a 25-car loading yard;
      - the Whittington Ave line to Whittington Park, extended about 1900 (1901 ad: "one mile from heart of city");
      - Central and Ouachita as "the convergence point of the streetcar lines".
    - **Unconfirmed routes:** a Park Ave line, implied by an 1894 note that the principal car barn was on Park Ave "near the terminal of the line on this avenue". The extent of an Ouachita line was not found.
    - **Waypoints and tracing:** the JSON has schematic waypoints. Trace real track from the 1908 or 1915 Sanborn sheets.
11. **Water company.** The location was not found. A 1922 county history reportedly gives a 1881-11-07 franchise, a supply from "two lakes north of the city" and a park around the pump station; I could not open that text to verify it. Leave the item unpinned or use a generic vignette.
12. **Free Bathhouse.**
    - **Opening year:** 1921 (NPS) vs 1922 (EOA).
    - **Conversion year:** 1953 (NPS Libbey bio) vs 1957 (EOA).
    - **Status:** the Reserve St building still stands.
13. **Courthouse.** No source mentions a "Grand Jury Room", so pin that space to the courthouse. Wikipedia's point is about 35 m west of the OSM node.

## Period maps (public domain, LOC)

**Sanborn fire-insurance maps of Hot Springs (online):**

| Edition | Sheets | Link |
|---|---|---|
| 1886-06 | 8 | [sanborn00269_001](https://www.loc.gov/item/sanborn00269_001/) |
| 1890-02 | 12 | [_002](https://www.loc.gov/item/sanborn00269_002/) |
| 1892-06 | 14 | [_003](https://www.loc.gov/item/sanborn00269_003/) |
| 1896-06 | 21 | [_004](https://www.loc.gov/item/sanborn00269_004/) |
| 1901-02 | 25 | [_005](https://www.loc.gov/item/sanborn00269_005/) |
| 1908-04 | 33 | [_006](https://www.loc.gov/item/sanborn00269_006/) |
| 1915-06 | 35 | [_007](https://www.loc.gov/item/sanborn00269_007/) |

A 1925 edition (46 sheets) appears in LOC listings but not online. The Pleasant St nomination also cites 1945.

**Bird's-eye views:**
- [Bird's eye view of Hot Springs, Ark.](https://www.loc.gov/item/75693081/), 1888?, Henry Wellge & Co.
- [Hot Springs, Arkansas](https://www.loc.gov/item/2001622065/), c.1890, H. C. Townsend for the Iron Mountain Route.

**USGS topographic maps:**
- Hot Springs 30' (1:125,000), 1890. This edition is known only from a reseller listing; confirm it in [topoView](https://ngmdb.usgs.gov/topoview/viewer/#12/34.51/-93.05).
- Hot Springs North and South 7.5' (1966). Earlier 15' editions were not verified.

The USGS API was unreachable during this research.

## Street layout: then vs now

**Hot Springs Creek.** The federal government began arching the creek in the 1880s, and Central Ave along Bathhouse Row is built over the tunnel. Check the 1886 and 1890 Sanborns for which stretches were still open. Today it daylights south of downtown (see `creekDaylight` in geo-anchors).

**Bathhouse Row and the Arlington.**
- The current bathhouses date from 1892-1923.
- The Grand Promenade behind them is post-1950.
- The **second Arlington (1893-1923) stood on today's Arlington Lawn**, at the north end of the Row on the east side of Central. The 1924-25 Arlington is across the Y.
- On an 1880s-1910s map, the Arlington belongs on the lawn.

**The Y.** The Majestic stood at the Park/Central/Whittington Y from the 1880s to 2016, so it belongs on every period map. It was built on the site of Hiram Whittington's house.

**Whittington Park.** Whittington Lake Reserve (1896-97) had four ornamental lakes, filled in 1905. The amusement park, ballpark, Ostrich Farm (1900) and Alligator Farm (1902) lined the upper avenue.

**Streets renamed or added.**
- Convention Blvd was **Benton St**.
- The Convention Center (late 20th century; the 2002 nomination calls it "recently constructed") and the boulevard from US 70 cut into the north and east edges of the Pleasant St neighborhood.
- Malvern Ave's historic commercial fabric is mostly gone.
- The expressway and bypass network around downtown (King Expressway, US 70/270 bypasses) is post-1950, so omit it. Its exact dates were not verified.

**The 1913 fire.** It burned about 50 blocks south and east of Central, including the Crystal Bathhouse and the courthouse interior. Pre-1913 and post-1913 maps of that area differ.

**Lakes.** Lake Catherine dates from 1924 (Remmel Dam) and Lake Hamilton from 1931-32 (Carpenter Dam). Lake Ouachita dates from 1953 (Blakely Mountain Dam), so it is too late for most of the period. An 1880s-1920s map shows only the Ouachita River.

**Hot Springs Mountain observatory.** The mountain had earlier observatory towers before the current 1982 tower. If one is drawn, it should be a period tower, not the modern one. The earlier towers' dates were not researched here.
