# Art provenance

All painted art is original, made with OpenAI image generation through the Codex plugin (`codex:codex-rescue`) on
2026-10-29. Raw PNGs in this folder are git-ignored; the packed WebP files in `assets/` ship (`art.json` →
`tools/build-art.mjs`, which runs `shared/test-harness/art-pack.mjs`). The pieces, dice and coins are our own
Blender models (`blender/pieces.py`), and the map's geography comes from public data (`map/build_base.py`).

Every prompt carried the same constraints:
- original art for an open-source board game set in Hot Springs, Arkansas
- no text, letters, numbers, signage words or logos
- no real or recognisable people; people small and generic (portraits: fictional characters)
- do not imitate any living artist

## Style pilots (approved first, then used as the reference for every later batch)
| File | Prompt summary |
|---|---|
| `pilot-vig-fordyce` → `vig-fordyce` | **Style:** a 1930s lithographed board-game print: flat limited palette (cream, brick red, terracotta, sage, teal, ink black, mustard), crisp ink lines, halftone texture, slight misregistration, the subject in a soft vignette fading into cream paper. **Subject:** the Fordyce: three-storey cream brick, red-tile hip roof, lozenge brick band, glass-and-iron marquee, magnolias, Hot Springs Mountain behind. |
| `pilot-vig-ostrich` → `vig-ostrich` | Same style: an early-1900s ostrich farm, wooden fence, a striped-awning ticket booth with no words, a lady with a parasol. |

## Surfaces
`table-oak`, `table-oak-tall` (frameless top-down honey-oak card-table top, after the parlour card table in the
Highsmith Bathhouse Row photo, LOC), `board-stock` (1930s linen board stock).

## Space vignettes (31, one per space)
| Space | Subject |
|---|---|
| The Depot | 1910s brick passenger depot, steam train at the platform |
| Percival's Cabins | 1830s log cabins for visitors, steaming springs over grey tufa |
| Belding's Inn | small 1830s–40s frame inn with a porch, horses at the rail |
| Diamond Jo Railroad | 1880s three-foot narrow-gauge 4-4-0 with two wooden coaches in a pine valley |
| Ostrich / Alligator Farm, IQ Zoo | ostriches in a fenced yard; alligators round a pool; a 1950s trained-animal show stage |
| Grand Jury Room | an empty 1940s courtroom (no people) |
| Whittington Park, Fogel Field, Majestic Park | an 1890s wooden ballpark; 1910s spring training; a 1909 covered grandstand (plain uniforms) |
| Water Co. | 1880s brick pump house, standpipe tower |
| Motor Courts, Drive-In, Tower Motel | 1950s cottages and neon arrow (no words); filling station and carhop; a 1960s tower motor hotel and pool |
| Free Bathhouse | a plain 1920s public bathhouse, visitors with towels |
| Pythian Bathhouse, Woodmen of Union | 1914 three-storey brick bathhouse and sanitarium with dignified 1920s African American visitors; a four-storey 1920s brick lodge building |
| Streetcar Line | 1910s electric streetcar under overhead wire |
| Southern Club, Ohio Club, The Vapors | Art Deco club front at night; a 1900s brick saloon; a 1960 supper club canopy |
| Summoned | courthouse steps at night, a man with a summons |
| Eastman, Majestic, Arlington | huge 1890s Victorian resort hotel; red-brick hotel at a street fork with a later yellow-brick wing; the 1924 Arlington's twin towers with red-tile pyramid caps |
| Thermal Water Tax | steaming water out of tufa into a stone basin with a brass spigot |
| Hale, Buckstaff | Mission-style stucco with a curved parapet and bell opening; cream-brick neoclassical front with seven bays and round medallions |
| Town Talk | two 1910s ladies on a promenade bench with a newspaper |

## Cards, title and portraits
| Asset | Subject |
|---|---|
| `back-news`, `back-talk` | Headline card back: engraved newsprint border with a rolled newspaper and press roller; Town Talk back: Art Deco linen-postcard frame round a magnolia over steam |
| `news-*` (10) | black-and-sepia newspaper engravings: fire, flood, racing, bath hall, park promenade, army arrivals, a club raid, a depot crowd, a 1931 dam, 1880s ballplayers |
| `title-lid`, `title-lid-tall` | box-lid painting: a magnolia avenue of bathhouses (tiled dome, twin towers), steam, the lattice tower, a streetcar and a 1930s car; title set in code |
| `face-*` (7) | oval cameo portraits of the six fictional AI personas (speculator, hotelier, banker, showman, preservationist, gambler) and an ink silhouette for human players |

## The centre map
`map/build_base.py` (run in Blender's Python) draws a plan of the valley from public data: USGS 3DEP elevation
(hillshade), Census TIGER/Line streets (the historic grid only) and rail, USGS NHD creeks and lakes, OSM Bathhouse
Row footprints and the Oaklawn track (OSM is ODbL: attribution in the About text). Codex then repainted that plan
(`base-map.png` as the input image) as a 1930s pictorial tourist map, keeping the geography in place, and the game
draws the labels, pins, flags, compass and scale bar in code over it (`src/js/geo.js`, frame in
`map/map-frame.json`). The repaint is not pixel-exact; the pins were checked against the painted Row, the creek and
the track.

## Checks done on every image
- **Text:** none found at full size. The newspaper backs carry only illegible squiggles.
- **People:** small and generic; the portraits are fictional characters, labelled as AI personas.
- **Captions:** pictures show in-game as "Illustration", never as photographs.
