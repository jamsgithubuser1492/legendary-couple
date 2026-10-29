# Art brief: the Seasonal Menu R&D Lab

For the agents who draw the sheets. The Lab is the café's creative studio: the two of you invent drinks together at the Test Kitchen counter in the back room, name them, and put them on the menu board. This brief says exactly what to draw, how it should look and feel, how many pieces, at what size, and which key names I will cut them to. Rules for sheet layout, scale, palette and the no checkerboard rule are in `docs/ART_BRIEF_CAFE_CREW.md` section 0 and all still apply. Read this document top to bottom once, then draw in the order of section 12.

## 0. The look we want

**Mood:** a cozy, slightly magical test kitchen. Think warm wood, soft jars catching light, a window with a plant, a sleeping cat on a stool. It should feel like a small studio where you are allowed to make a mess and discover something lovely, not like a lab or a factory. No cold steel, no harsh white, no clinical blues.

**Light:** soft light from the upper left, a warm glow from a hanging lamp, gentle rim light on glass. Glass is the hero material in this build: draw it with a thin warm outline, a pale cream highlight stripe on the upper left, a soft inner shadow on the lower right, and a hint of the content's color showing through the wall. Never use pure white highlights. Never draw see through glass as a checkerboard, draw it as a soft tinted tone on the plain paper background (I will mask the glass in code).

**Palette extras for this build (all muted, pastel):** matcha green #9FC77A, espresso brown #6B4A3A, earl grey lavender #B9A9C9, turmeric gold #E8B84A, strawberry rose #E8909E, honey amber #E9B96E, caramel #C98B4C, yuzu butter #F3E18A, lavender honey #C3A8D6, apple red #D9786C, blossom pink #F6C6D3, pumpkin spice #D98A4A, peppermint mint #BFE6D2, plus the usual cream #FFF4EE and cocoa outline #6B4F4F.

**Scale:** the existing Matcha Masters ingredient icons are drawn about 128 px, so draw every jar and tool at about 128 px tall on the sheet. Isometric room pieces use the 2:1 diamond, one tile is 128 by 64 on the sheet, and a person is 216 px tall (so a counter reaches about the character's waist, about 110 px tall).

## 1. Sheet L1: the Test Kitchen back room

The room is a small back room behind the café. It is its own scene, shown as a painted backdrop with a placeable counter in front.

**1a. Room backdrop, 960 by 540 at 2x (1920 by 1080 on the sheet).** A cozy back room seen straight on with soft perspective. Left wall: a big window with a plant on the sill, a pastel curtain and a view of the café garden at golden hour. Back wall: three floating wooden shelves holding rows of jars (empty jar shapes in the same style as section 2, they will be overlaid by the real ingredient icons in code, so draw them empty and evenly spaced in 3 rows of 6 slots), a chalkboard with a hand drawn border (blank inside, I add text), and a hanging copper lamp with a warm glow. Right wall: a hook rail with two aprons, a small potted herb shelf (basil, mint) and a framed recipe card. Floor: warm wide wooden planks with a round woven rug. Props in the corners: a sleeping cat curled on a stool (drawn as a separate piece, see 1d), a stack of recipe notebooks, a tea tin tower. Keep the middle third of the image calm and uncluttered because the counter and two characters stand there. Do not draw the counter or any character in the backdrop.

**1b. The Test Kitchen counter, isometric, 2 by 1 tiles, in 4 views (fl, fr, bl, br).** A sturdy wooden workbench with a butcher block top. Top surface: a mortar and pestle, a small brass scale, a clear measuring cup, two stacked ramekins, a tiny hand whisk lying across a saucer, a jar of honey with a wooden dipper and a small spirit lamp (unlit, I add the flame as an overlay). Under shelf: two baskets of fruit (strawberries, yuzu), a bottle of milk. Front panel: a little chalk plate that says nothing (blank). Draw the top mostly clear in the center 60 percent so I can place the two role panels and drinks there. 4 pieces (one per view). Also supply **an empty version of the counter top**, same 4 views, with nothing standing on it, so the game can draw changing items on top. 4 more pieces.

**1c. The back room door, isometric, 1 by 1, open and closed, in 2 views (fl and fr).** A wooden door with a round window and a small hanging sign (blank). 4 pieces. Also a tiny brass key tag icon, 64 px, and a "Test Kitchen" door sign (blank ribbon so I add text).

**1d. Sleeping cat on a stool, 4 frame breathing loop,** FL view only, 4 frames, plus a "stretching awake" 4 frame animation. The cat is a quiet ambient friend. 8 frames.

**1e. Ambient lab effects, each on its own dark navy tile, so I can lift them:** a steam wisp loop (6 frames), a soft lamp glow (1 frame, round, additive), a drifting dust mote sparkle loop (6 frames), and a warm window light shaft (1 frame, long diagonal, additive).

## 2. Sheet L2: ingredient jars (19 jars plus states)

Every ingredient lives in a jar or bottle. The jar is the same family across the set so the shelf looks like a collection: a rounded glass jar with a cork or wooden lid, a small rope or ribbon tie around the neck, and a tiny blank paper tag (I never add text on the art, I add icons and text in code). The contents are drawn so you can tell what it is from the silhouette and color alone.

Draw each jar 128 px tall, three-quarter view as in the Matcha Masters jars, in 4 states on one row: **normal**, **locked** (the same jar as a soft grey silhouette with a small padlock hanging on the tie), **new** (the normal jar with a small gold sparkle badge top right, drawn as a separate overlay on a dark tile), and **selected** (the normal jar with a warm glow ring, separate overlay on a dark tile). For the locked, new and selected states, draw them once for a generic jar (not once per ingredient), I will apply them to all 19. So draw the normal state 19 times and the three state overlays once each.

**Bases (4 jars)**
* **Matcha:** fine bright green powder in a short wide jar with a bamboo scoop lying across the lid. (A version exists in Matcha Masters: redraw it to match this family.)
* **Espresso:** dark roast beans in a tall jar, a few beans spilling onto the shelf, a small steam curl.
* **Earl Grey tea:** loose dark leaves with a few blue cornflower petals, in a tin style jar with a pale lavender lid.
* **Golden turmeric milk:** a warm golden paste in a short jar with a little dipper, a tiny pinch of black pepper on the side.

**Flavors (9 jars)**
* **Strawberry:** whole ripe strawberries with tiny green tops.
* **Honey:** amber honey with a wooden dipper, one drip down the glass.
* **Salted caramel:** glossy caramel with a few white salt crystals on top.
* **Yuzu:** two small yellow citrus fruits, one halved, with a leaf.
* **Lavender honey:** lavender-tinted honey with a dried lavender sprig tucked in.
* **Apple:** a red apple and a few slices (this ties to Orchard Harvest).
* **Blossom (spring):** pink cherry blossom syrup with a few petals floating.
* **Pumpkin spice (autumn):** orange-brown spiced purée with a cinnamon stick.
* **Peppermint (winter):** pale mint-green syrup with a candy cane stripe on the lid.

**Toppings (6 jars)**
* **Boba pearls:** shiny dark pearls, a small scoop.
* **Cream cheese foam:** a soft white swirl in a jar, piped peak on top.
* **Cherry blossom sprinkles:** tiny pink petals, sparkly.
* **Dried rose petals:** deep rose petals, a couple floating above the jar.
* **Edible gold flakes:** tiny gold flakes with a little sparkle (this is the rare one, so give it a slightly fancier lid).
* **Cinnamon dust:** warm brown powder with a cinnamon stick leaning on the jar.

Also draw **each ingredient as a small 40 px swatch dot** (just the color with a soft gradient and a tiny highlight) and **as a horizontal color band 128 by 24** showing how the ingredient looks as a layer inside a clear cup (a soft gradient strip, with a gentle wave on its top edge). Those two are 19 swatches and 19 bands, drawn in a single tidy row each. I tint and stack the bands in code to build any drink.

Key names: `lab_jar_<ingredient>`, `lab_jarstate_<locked|new|selected>`, `lab_swatch_<ingredient>`, `lab_band_<ingredient>`.

Count: 19 jars, 3 state overlays, 19 swatches, 19 bands = 60 pieces.

## 3. Sheet L3: the Flavor Alchemist controls (Partner A)

These are the interactive tools for the temperature and sweetness part. Draw them as a set of warm wooden and brass instruments, each clearly tappable, with obvious states.

* **Temperature thermometer slider:** a tall glass thermometer in a wooden frame, about 120 by 420 px. Draw: the empty frame, the glass tube, a gradient fill from cool mint at the bottom through cream to warm amber at the top (as one strip I can mask to any height), and tick marks. Include a **draggable knob** (a round brass bead with a little ring) in 3 states: normal, hover (a soft glow ring), pressed (slightly smaller). 6 pieces.
* **Sweetness dial wheel:** a round brass dial in a wooden mount, about 300 by 300 px, with 12 tick marks, a leaf at the low end and a heart at the high end, a stationary frame and a **separate rotating pointer** in 3 states (normal, hover, pressed). 5 pieces.
* **Sweet spot meter:** a ring with a soft glow that pulses when the balance is close. Draw the ring (empty), and a 4 frame glow pulse on a dark tile (a cream gold ring that brightens and dims), a "close" version in a warmer color, and a "perfect" burst (a chime with 4 little musical notes and star sparkles, 4 frames). Also a hot hint icon (a small sun) and a cold hint icon (a snowflake), 64 px each. 11 pieces.
* **Taste buttons:** Mix, Taste and Keep as soft wooden pill buttons, 3 states each (normal, pressed, disabled), about 200 by 64 px, with the icon area left plain. 9 pieces. If these match the Matcha Masters button frames I already have, say so on the sheet and I will reuse those instead (that saves 9 pieces).
* **Experiments left counter:** a small wooden tag with three empty circular sockets and a filled version of each socket (a bright leaf), 3 pieces.

Key names: `alch_thermo_*`, `alch_dial_*`, `alch_spot_*`, `alch_btn_*`, `alch_left_*`.

## 4. Sheet L4: the Visual Decorator kit (Partner B)

Partner B plates and decorates. This is the most charming sheet, draw it with love.

**4a. Glassware, three types, each in four layers so I can build any drink.** For each glass draw, at 160 px tall: (1) the **empty glass** (outline, highlight, a soft shadow), (2) a **fill mask** (the interior shape in flat plain paper tone so I can place the ingredient bands inside it), (3) a **front glass overlay** (only the highlights and the front lip, drawn on a dark tile so I can lay it over the fill for a glassy look), and (4) the **topped version** (the empty glass with a topping peak, a straw or a lid already added).
* **Mason jar:** a wide mouth jar with a screw rim and a paper straw with a pink stripe.
* **Character mug:** a chunky ceramic mug with a small round handle and a simple face stamp (two dot eyes and a blush on the front, no brand character).
* **Pastel to-go cup:** a tall clear plastic cup with a domed lid, a pastel sleeve and a straw.
Total: 3 glasses × 4 layers = 12 pieces.

**4b. Rim garnishes (6),** each drawn as a ring seen from the front, 160 px wide, to lay on the top edge of any glass: sugar rim, cinnamon rim, blossom rim, gold rim, a berry on the edge, a mint leaf on the edge. 6 pieces.

**4c. Latte art, 5 new patterns.** The existing Latte Art Studio has cat, frog and heart. Add **bear, star, bunny, swirl and flower.** For each pattern draw two pieces on a foam circle 200 px across: the **finished art** (cream foam art on a warm brown latte, with soft shading) and the **tracing guide** (the same shape as a dotted trace line in cream, the dots about 6 px apart with a start dot highlighted). 10 pieces. Also the **base foam circle** (empty latte surface, 200 px) in 3 drink colors (matcha green, espresso brown, honey amber), 3 pieces.

**4d. Tools and cursors.** A drawing hand cursor (a small pointing hand), 3 states (normal, drawing, done), a tracing guide dot in 3 states (waiting, next, covered with a gold check), and a small latte pitcher icon. 7 pieces.

**4e. Garnish picker tray:** a small wooden tray 480 by 120 with 6 slots for the rim garnishes and 3 slots for glass types (empty slots drawn, I place icons). 1 piece.

Key names: `deco_glass_<mason|mug|togo>_<empty|mask|front|topped>`, `deco_rim_<name>`, `deco_art_<pattern>_<done|guide>`, `deco_foam_<matcha|espresso|honey>`.

## 5. Sheet L5: discovery moment and recipe cards

**5a. New Signature Recipe celebration.** A short celebration when the two of you discover a drink. Draw: a warm spotlight cone (additive, on a dark tile), a ring of 8 sparkles that spins in a 6 frame loop (on a dark tile), a ribbon banner (blank ribbon, 640 by 140), a 4 frame confetti burst (pastel paper bits), and a drumroll icon (two small drumsticks). 4 sets, about 18 pieces.

**5b. Recipe card frames, 360 by 480.** Cards are paper cards with a window for the drink art at the top and blank lines at the bottom (I add text). Three rarity styles, drawn on a card with the same layout so they can swap:
* **Classic:** cream paper with a tiny leaf in the top corner and a rope-bound edge.
* **Seasonal:** cream paper with the season's motif corner. Draw four versions: spring (blossom), summer (citrus slice), autumn (maple leaf), winter (snowflake and holly).
* **Signature VIP:** cream paper with a gold foil border, a tiny crown at the top, and a faint shimmer (the shimmer is a separate overlay on a dark tile, 4 frames).
Total: 1 + 4 + 1 = 6 card frames plus the 4 frame shimmer = 10 pieces.

**5c. Naming plaque and tier chips.** A small wooden naming plaque (blank, 360 by 90) with a pencil beside it, a "name it after a memory" heart bookmark, and three tier chips (Classic leaf, Seasonal sun, Signature crown), 64 px each. 6 pieces.

**5d. Discovery stamp:** a round wax seal stamp, blank center, in 3 colors (cream, sage, gold). 3 pieces.

Key names: `recipe_celebrate_*`, `recipe_card_<classic|spring|summer|autumn|winter|vip>`, `recipe_shimmer_<1..4>`, `recipe_plaque`, `recipe_chip_<tier>`, `recipe_seal_<color>`.

## 6. Sheet L6: the menu board and seasonal collections

**6a. Menu board, two versions of the same board.** (1) An **isometric wall piece** (the board hangs on the café wall), a framed chalkboard with six drink slots arranged in two columns of three, a scalloped top, small chalk marks (no words), and a star ribbon in the corner for the Spotlight. Draw it for the back left wall orientation (the game mirrors it), about 720 by 960 on the sheet. (2) A **flat interface version,** the same board straight on, 960 by 560, for the screen where you choose what goes on the menu.
* **Slot states:** empty (a dotted frame), filled (a plain mat for the drink art), locked (a padlock on the mat), spotlight (a gold star frame). 4 slots, each 280 by 200. 4 pieces.
* **Spotlight Drink banner:** a ribbon with a star, 480 by 120, blank. 1 piece.
* Total: 2 + 4 + 1 = 7 pieces.

**6b. Seasonal collection shelf.** A display shelf with 3 slots that a seasonal collection fills, 640 by 240. One badge per season (4, 128 px) and **four limited decor items,** one per season, each isometric 1 by 1 tile in 4 views (16 pieces): Spring Blossom Lamp, Summer Citrus Cart, Autumn Maple Stand, Winter Mug Tree. Total: 1 + 4 + 16 = 21 pieces.

Key names: `menu_board_<iso|flat>`, `menu_slot_<state>`, `menu_spotlight`, `collection_shelf`, `collection_badge_<season>`, `collection_item_<name>_<view>`.

## 7. Sheet L7: seasonal ingredient art (so seasons feel real)

Seasonal flavors appear only in their real season (spring blossom, summer yuzu or citrus, autumn pumpkin spice and apple, winter peppermint). For each season draw a **small seasonal ingredient shelf decoration** that appears in the lab: a spring vase of blossom, a summer fruit bowl, an autumn pumpkin and maple leaves, a winter pine sprig and candy cane jar. 4 pieces, 128 px, isometric 1 tile on a single view (fl).

## 8. Sheet L8: character poses for the two roles

You already have James and Rachel in cafe outfits. For the Lab, draw each of them at the counter in two roles, FL view, with the counter top the character stands behind drawn as part of the sprite is NOT needed (the counter is its own piece):
* **Flavor Alchemist (Partner A):** wearing goggles pushed up on the forehead and a long apron, holding a small glass beaker. 4 frame loop at 4 frames a second (stir, hold up to the light, sniff, smile).
* **Visual Decorator (Partner B):** wearing a beret and a short apron, holding a piping tool. 4 frame loop (pipe, tilt head, step back to admire, smile).
* Plus a shared **celebration pose** where both lift a finished drink and cheer (4 frames, both characters in one frame, side by side).
* For each of James and Rachel, also a **tasting pose** (4 frames: sip, think, eyes widen, thumbs up). Total: 2 role loops + 2 tasting loops + 1 shared = 5 animations, 20 frames.
Key names: `lab_<james|rachel>_<alchemist|decorator|taste>_<1..4>`, `lab_cheer_<1..4>`.

## 9. Sheet L9: Recipe Memory Book

The Shared Recipe Memory Book is the keepsake that holds every discovered drink.
* **Book cover** (closed, isometric 1 tile, FL view) with a ribbon bookmark, and a **flat interface cover** 480 by 640.
* **Open spread** background 960 by 640: two pages with a soft center binding, a window frame on each page for the drink art and blank lines. A page curl.
* **Page flip animation:** 4 frames of a page turning (flat interface view).
* **Photo corner** stickers (4) to attach a memory photo, and a **heart pin** (a small round pin in 3 colors) to mark a favorite.
* **Empty page placeholder:** a faint dotted outline of a cup with a question mark shape (no text), 360 by 480.
Total: about 14 pieces.

## 10. What you do NOT need to draw (we reuse existing art)

* Button frames, panel frames, hearts, ribbons, coin and shell sprites: these come from the Matcha Masters interface sheet.
* The latte cup, cat, frog and heart patterns that already exist in the Latte Art Studio.
* The Matcha Masters recipe book icons (reused as small badges).
* James and Rachel's café outfit stills and walk loops.
* The glow and sparkle bits: I reuse the existing weather and sky sparkles.

## 11. Counts at a glance

| Sheet | Pieces | What it is |
|---|---|---|
| L1 | about 33 plus a 1920 by 1080 backdrop | Back room backdrop, counter 8 pieces, door 4, cat 8 frames, effects |
| L2 | 60 | 19 jars, 3 state overlays, 19 swatches, 19 bands |
| L3 | about 34 | Thermometer, dial, sweet spot meter, buttons, counter |
| L4 | about 40 | 3 glasses × 4 layers, 6 rims, 5 latte art patterns (10) and 3 foams, tools, tray |
| L5 | about 40 | Celebration, 6 recipe card frames, shimmer, plaque, chips, seals |
| L6 | 28 | Menu board (2 versions), 4 slot states, banner, collection shelf, badges, 16 decor views |
| L7 | 4 | Seasonal shelf decorations |
| L8 | 20 frames | Alchemist, decorator, taste and cheer loops |
| L9 | about 14 | Recipe Memory Book |

Roughly 270 pieces. The biggest saving is in L2 (the three state overlays are drawn once) and L4 (glass layers drawn once per glass).

## 12. The smallest version that still ships the Lab

If you want to keep it lean, draw these first and leave the rest for later:
1. **L2:** the 19 jars (normal state only) and the 19 bands. Everything else about ingredients is built in code.
2. **L4:** the three glasses with their layers, the 6 rim garnishes, and the 5 new latte art patterns.
3. **L3:** the thermometer and the dial (I can use plain pills for the buttons).
4. **L5:** the celebration ring and the 6 recipe card frames.
5. **L6:** the flat menu board and the 4 slot states.
6. **L1:** the back room backdrop and the counter (4 views).
That is about 120 pieces, and it gives a complete, beautiful Lab. The characters' role poses (L8), the Recipe Memory Book (L9), the collection decor and seasonal shelf (L6 and L7) can come in a second pass.

## 13. Gemini prompt template for a Lab sheet

"A cozy pastel isometric art sheet for the game Our Little World, a small magical test kitchen. Subject: [sheet name and list]. Draw a strict grid on flat cream paper. Each item in its own cell, same size within a set, a clear 24 px gap, nothing cropped, thin warm brown outline, soft upper left light, a soft pink ground shadow, glass drawn as a softly tinted tone with a cream highlight stripe (no fake transparency checkerboard), no text on the art, labels in plain type under each cell. Palette: matcha #9FC77A, espresso #6B4A3A, lavender #B9A9C9, turmeric #E8B84A, strawberry #E8909E, honey #E9B96E, caramel #C98B4C, cream #FFF4EE, outline #6B4F4F. Glows, steam and sparkles go on their own dark navy tile."

## 14. Checklist before handing a sheet back

* All items in a set are the same size and the same style, and the jars read as one family.
* Glass has a highlight and a soft tint, no checkerboard, no pure white.
* Glows and sparkles are on their own dark tiles.
* No text baked into the art, only blank tags, ribbons and plaques.
* Nothing is cropped by a cell edge, and gaps are at least 24 px.
* The counts and key names match the lists above.
