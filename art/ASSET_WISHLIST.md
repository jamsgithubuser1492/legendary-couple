# Our Little World: the full asset wish list

This is everything still needed to take the game from "working and cozy" to "polished and immersive", plus how to swap any of my placeholder art for your own designs. Items are grouped, then ranked by priority at the end.

Legend: **Have** means a painted asset of yours is already in the game. **Placeholder** means I drew it with code or reused another sprite, and it is a good candidate to replace. **Missing** means nothing exists yet.

---

## Part 1. How to replace anything I made

There are four kinds of art in the game, and each swaps in a slightly different way.

### A. Single sprites (furniture, buildings, props, icons)
These live in `public/assets/sprites/<key>.png`. The key is the name you see in the lists below.
1. Make a transparent PNG, tightly cropped, no labels and no sheet background, drawn at **2x size** (one game tile is 128 x 64 px at 2x).
2. Name the file after the key. For example `plant_a.png` replaces `plant_a`.
3. Send it to me (or drop it in the repo under `art/replace/`). I register its on screen width in `tools/slice_sprites.py` so it keeps the same footprint, and rebuild `src/game/spriteList.ts`.
4. A new sprite for something that has no key yet needs one line in `src/state/catalog.ts`. Tell me the name, price, footprint in tiles (width x depth) and category and I add it.

### B. Sheets (many sprites in one picture)
Keep doing what you do today: send a sheet, and I cut it with `tools/slice_sprites.py`. To make slicing painless:
* One object per cell, a clear gap between objects, plain flat background.
* No text labels touching a sprite. Put labels in the margin or send a second copy with labels.
* Tell me the key name for each object, in reading order, left to right and top to bottom.

### C. Animated characters (walk cycles)
Each character is one **horizontal strip** in `public/assets/sprites/`, every frame the same size and bottom aligned. Current strips: `james_new`, `rachel_new`, `james_dark`, `rachel_dark`, `dog_walk_side` (see `src/game/walkSheets.ts`). To replace one, send a strip or a grid sheet and say which frames face which way. The standard layout I want for every new character is:

| Frames | Meaning |
|---|---|
| 0 to 3 | Walk right (northeast and southeast get their own rows when you have them) |
| 4 to 7 | Walk left |
| 8 to 11 | Walk toward the camera |
| 12 to 15 | Walk away from the camera |
| 16 | Idle front, 17 idle back, 18 sit, 19 happy bounce |

### D. Things drawn by code (the biggest group, listed in Part 2)
The island ground, water, floors, walls, plaza, all four minigames, the lantern, the bottle, banners, the aura effects and most of the interface are drawn by code or built from emoji. These are the most "placeholder" feeling parts. To replace one, send the art as in A or B and tell me the part. I change the code to draw your sprite instead. No design skill with code is needed from you.

### Delivery checklist
* Transparent PNG, sRGB, no compression artefacts. WebP is fine for big backgrounds.
* Same light direction as your existing art: soft light from the upper left.
* Thin warm brown outlines, pastel palette, chibi proportions (see `art/ART_GUIDE.md`).
* Always tell me the **footprint in tiles** for anything that sits on the grid.
* Seasonal pieces: one version per season (spring, summer, autumn, winter, holidays) or tell me which are shared.

---

## Part 2. What I drew with code or reused (placeholders you can replace)

| Area | Placeholder today | Replace with |
|---|---|---|
| Home island ground, shoreline, water | Drawn with code (soft shapes, ripples) | Island ground tile set per season, shoreline edge pieces, painted water texture |
| Floors | Code: planks, tiles, café checker, sand | Floor tile sprites (they must tile with no seams) |
| Walls | Code: plaster wall with trim, plus your wall sprites | Full modular wall set (see Part 4) |
| Items with no sprite | `floor_pink`, `floor_checker`, `espresso`, `pumpkin` | Four sprites |
| Memory plaque | Drawn heart plaque | Wooden sign with a heart, plus 3 frame styles |
| Quadrant aura effects | Emoji bursts and coloured rings | 8 sets of painted particle sprites |
| Vitality Glow, Synergy Aura | Coloured ellipses | Painted glow decals, animated |
| Focus lantern | A lantern emoji | Animated lantern sprite |
| Sealed bottle | Small drawn bottle | Animated bottle sprite |
| Town Square plaza and fountain | Drawn paving, fountain and bunting | Plaza, fountain, bunting, stage |
| Celebration visitors | Reuse of the figure and outfit sprites | Dedicated visitor characters |
| Collectible figures (12) | Reuse of the Kitty, Miffy and Snoopy outfit stills | 12 dedicated figure sprites, 3 series |
| Blind box in the crane | Drawn pink and purple cubes | Painted capsule and box art |
| All four minigames | 100 percent drawn by code | Full scene art (Part 6) |
| Interface icons | Emoji | Icon set (Part 7) |
| Shell, arcade token, event token, driftwood, ingredient icons | Emoji | Painted currency icons like your coin and gem |
| Town terrain, mountains, sky, roads | Drawn by code plus `world_map.jpg` | Sprite based roads and terrain (Part 8) |
| Rachel front and back walk | Standing poses with a bounce | Real walk frames |
| Kitty, Miffy, Snoopy walking | Bounce and sway | Real 4 direction walk cycles |
| Sound | None | Music and effects (Part 9) |

---

## Part 3. Characters and animation

### James and Rachel (both looks: cream cap and dark cap)
* **Missing:** diagonal walks for northeast, northwest, southeast, southwest, 4 frames each, both characters, both looks.
* **Missing:** Rachel front and back walk, 4 frames each.
* **Missing:** sit poses (couch, chair, bench, beach lounger, picnic blanket), idle breathing frames, and a "hold a drink" idle.
* **Missing: emote set** for each of you: wave, hug (a shared two person pose), high five, cheer, blow a kiss, laugh, cry happy tears, sleep, yawn, thumbs up.
* **Missing: activity poses** that match the new mechanics:
  * Focus Beacon: sitting cross legged at a laptop or notebook, lantern floating above, 2 frames.
  * Health: stretching, jogging in place, yoga pose, sipping water.
  * Learning: reading a book, writing in a notebook.
  * Finance: dropping a coin in a piggy bank.
  * Romance: writing a letter, corking a bottle.
  * Social: hosting (arms out), clinking glasses.
  * Fishing: casting, holding the rod, reeling, celebrating a catch.
  * Matcha Masters: sous chef scooping and passing, barista steaming and serving.
  * Crane: pressing the arcade buttons, cheering.
  * Orchard: shaking a tree, holding a basket out.
* **Missing: outfit layers** so the Wardrobe can dress you: hoodie, concert outfit, holiday sweater, pajamas, swimwear, café apron, winter coat, rain coat. Either full re drawn sets for each (best) or layered sprites.
* **Missing: close up portraits** (about 512 px square) of each of you with 6 expressions (neutral, happy, laughing, shy, sleepy, loving), for the quest, journal and letter screens.
* **Missing: a "couple" pose set** for photo moments (hand holding, side by side, dancing).

### Companions
* **Hello Kitty, Miffy, Snoopy:** 4 direction walk cycles (4 frames each) for every outfit, plus sit and sleep poses. Today they bounce. There are about 11 outfits in the Wardrobe.
* **Golden retriever:** front and back walk, plus sit, wag, sleep and play. Today only the side walk exists.
* **New companions** for future Wardrobe slots: corgi, bunny, golden retriever puppy, cat, duck. Walk cycles for each.

### Collectible figures from the Crane (12 figures, 3 series)
Draw each as a standing figure, front view, about 256 px tall, plus a small walk cycle so freed figures can roam the island.
* **Beach Vacation:** Beach Kitty, Beach Miffy, Beach Snoopy
* **Barista:** Barista Kitty, Barista Miffy, Barista Snoopy
* **Sleepy Pajama:** PJ Kitty, PJ Miffy, PJ Snoopy
* **Golden series (rare, 3 figures):** Golden Kitty, Golden Miffy, Golden Snoopy, plus room for a secret figure.
* For each series: a **capsule or box** design in a matching colour and the box in 3 states (closed, shaking, opening).

### Townsfolk and visitors
* **Today:** 4 townsfolk stills (`npc_grandma`, `npc_photographer`, `npc_woman`, `npc_hat`).
* **Missing:** 12 or more townsfolk, with walk cycles in 4 directions. Include children, an older man, a jogger, a dog walker, a vendor, a musician, a painter, a postal worker, a barista, a surfer.
* **Missing: celebration visitors** for the Town Square: people with party hats, balloons, cake and confetti, 2 frame cheering loops.
* **Missing:** friends and family characters that match the Social goals (a friend couple, a grandparent, a baby).

---

## Part 4. Home island: decor, structures and items

### Foundations
* **Ground:** island grass and sand tile set per season (5 sets), with edge and corner pieces, plus a clean "blank dirt" tile for the start.
* **Floors (seamless tiles):** pink tile, café checker, pastel rug (3 colours), grass with flowers, stone path, wood in 3 stains, tatami, carpet.
* **Walls:** pastel pink, sage, brick, board and batten, half wall, fence, hedge, glass wall, plus corner, window and door variants for each.
* **Roofs:** snow, autumn leaves, cherry blossom petals, and a thatch and tile roof for the starters.
* **Starter structures:** RV, Shop and Café, and Home Foundation, each in 3 growth stages (day one, mid, finished) so they can grow with you.
* **Memory plaque, 3 frame styles** (wood, brass, pastel), plus a polaroid and a framed photo style.
* **Front door mailbox** (for love letter delivery as an alternative to the shoreline).

### Home items that are missing from the shop
* Kitchen: oven, fridge, kitchen island, sink, dining table, dishes, pot rack.
* Living: rugs, floor cushions, TV and console, record player, piano, desk and laptop, easel, yoga mat.
* Bedroom: wardrobe, dresser, vanity, nightlights.
* Bathroom: tub, sink, plants.
* Outdoor: hot tub, hammock, fire pit, bbq grill, garden beds, greenhouse, chicken coop, swing set, gazebo, pergola.
* Wall decor: more prints, mirrors, shelves, pennants, neon signs (a **neon sign** for the café is promised in the Matcha Masters unlock list).
* Seasonal sets for every season: at least 8 pieces each.
* Pets: more beds, bowls, toys.
* Cafe items: **espresso machine** (placeholder), **pastry case**, **patio seating**, **neon sign**, menu boards, a counter in 3 finishes, bar stools, hanging plants, pendant lamps, a record corner, chalkboard.

### New mechanic objects
* **Shared bookshelf (Wisdom Bookshelf):** a big bookcase or library wall with **5 growth stages**, and loose pieces: book spines in 8 colours and 4 thicknesses, a scroll, a tied letter, a bookmark, a ladder. When you add a book it should appear on the shelf.
* **Dream Vault:** a piggy bank or vault, 3 fill states, plus **blueprint art** for each build: Glass Café, Rooftop Deck, and each island expansion (3 stages each: blueprint, scaffolding, finished). The Rooftop Deck and Glass Café also need the finished building sprites.
* **Focus lantern:** a floating paper lantern with a soft glow loop, plus an "extinguished" frame, and a **tea cup drop** animation (a cup arriving by a little parachute or a floating ribbon).
* **Sealed bottle:** bottle in 3 states (drifting, washed up, opened), plus a splash and a sparkle loop and a rolled note.
* **Celebration banner and bunting** for the plaza in a few colour sets, plus confetti and balloons.
* **Quadrant icons:** 8 pastel icons (Health leaf, Career briefcase or lantern, Learning book, Finance coin, Romance heart, Social balloon, Home house, Fun star), each with a matching **aura effect** (see Part 7).

---

## Part 5. Together mechanics art
* Bids: wave, tea and flower icons with a short animation, plus a "turned toward you" glow.
* Starry fireside glow: stars and a campfire sprite with a flicker loop.
* Love Map: card art and a heart meter.
* Gratitude jar and notes: jar, note, and a pop open animation.
* Daily check in: question card art and a streak flame in 5 stages.
* Whisper tiers: light, medium and deep card styles.
* Adventure scratch card: a card with scratch off texture and 6 reveal designs.

---

## Part 6. Minigame art (currently 100 percent drawn by code)

### Matcha Masters (café)
* Background: a café interior at 960 x 540, plus a sunset version.
* Counter, order window, prep station, steamer with a dial, tea whisk, bowls, ingredient shelf.
* **Ingredients (at least 12 sprites):** matcha powder, milk, oat milk, ice, strawberry, syrup, boba, whipped cream, cocoa, cherry blossom, and more, each about 96 px.
* **Cups and drinks:** 6 drink designs with latte art, and a finished tray. Serve animation.
* **Topping trace stencils:** heart, star, cat face, leaf, flower, 3 dot patterns.
* **Customers:** 8 customers with four expressions each (happy, neutral, impatient, delighted) and **patience hearts**.
* **Order tickets:** a ticket style and a "Café Rush" multiplier badge.
* **Recipe Memory Book:** book cover, page art, and 4 recipe illustrations (Our First Date Matcha, Sunset Strawberry Cloud, Pier Day Boba, Cozy Rainy Latte).
* Reward stars (3 states), tip jar, coin burst.

### Stellar Fishing (pier)
* Background layers: sky with sunset gradient, sun, clouds, distant island, wooden pier, water tile with animated waves (in 3 time of day variants).
* **Fish:** at least 8 species, each swimming left and right, plus a **glowing Co op Fish** glow variant for each.
* **Driftwood crate**, glowing, plus open animation.
* **Sea fauna for the aquarium:** octopus, starfish, pastel jellyfish (each in 2 or 3 idle frames), plus room for 10 more.
* Bobber, fishing line, hook, splash rings, **sync ring VFX** (a green zone and a pulsing ring).
* **Message in a bottle**, and the Beach Memory Journal page art.
* Aquarium tank art for the collection screen.

### Blind Box Crane Craze (arcade)
* **Arcade cabinet** (a big pastel crane machine with glass, buttons, and a prize chute), plus the arcade front for the Downtown map.
* **Claw** in open, closing, closed and lifting frames, plus the cable and rail.
* **Boxes:** light box, heavy box (clearly heavier looking), in each of the 3 series colours.
* **Magnetic aura** effect for the Cheer lift.
* Prize drop animation, a "heavy slipped" animation, and a figure reveal card for each of the 12 figures.
* Arcade token art.

### Orchard Apple Bouncing and Harvest (park)
* Orchard background in 4 seasons, apple trees with a shake animation, baskets, a harvest crate.
* **Apples:** red, green, and **golden**, plus a bounce and a squash frame.
* **Pastel Shower** effect for golden apples.
* Seasonal event token art, and the cafe pantry shelf that stores harvested fruit.

### Shared
* Result screen frame, star rating art, confetti, an "invite" banner style, a "waiting for your partner" illustration.

---

## Part 7. Interface

* **Side button icons** (replace emoji): Town, Together, Arcade, Rituals, Daily question, Blind boxes, Wardrobe, Journal, Decorate, Quests.
* **Currency and resource icons:** coin and gem exist. **Missing:** Heart Shell, arcade token, seasonal event token, driftwood, ingredient, vault coin, blind box key.
* **Quadrant icons (8)** plus **aura effect sprites (8 sets)**: green leaves for Health, golden coins for Finance, pink hearts for Romance, lanterns for Career, books for Learning, balloons for Social, flowers for Home, music notes and stars for Fun.
* **Vitality Glow and Synergy Aura:** soft glow decals under the avatars in 3 sizes.
* **Panels and buttons:** a sheet frame, button states (normal, pressed, disabled), tab styles, toggles, sliders, progress bars (pink, green, gold), badges and notification dots.
* **Cards:** quest card, blind box rarity frames (common, rare, epic, legendary), outfit card, memory polaroid.
* **Branding:** app icon (192 and 512 px), favicon, splash screen, title logo, loading animation, a share card image.
* **Onboarding illustrations:** one per starting path (RV, Shop and Café, Home Foundation), and a "pair with your partner" illustration.
* **Level up and milestone animations:** a medal, a badge set for approved quest counts, and a confetti burst.

---

## Part 8. The Town

* **Roads, sprite based:** straight, corner, T junction, crossroads, curbs, sidewalks, crosswalks (2 exist), parking, bike lanes, cobblestone, dirt trail.
* **Terrain:** grass, sand, forest floor, snow, farm rows, cliff edges, shoreline pieces.
* **Buildings missing:** school, library, train station, town hall, hospital, fire station, bakery, bank, cinema, gym, yoga studio, bookstore interior hints, pet shop, park pavilion. Also a **stage and market stalls** for the Town Square, and an **arcade building** for the Crane.
* **Houses and towers:** you have 6 houses, a barn, a windmill and 4 towers. More colour variants and holiday decorated versions would help.
* **Growth stages:** the farm, cabin and campus are single pieces. Separate buildings let each grow in steps.
* **Day, evening and night versions** of every building, with lit windows, and street lamps that glow.
* **Vehicles in 4 directions:** your pink beetle, retro van, scooter, bus, bike, and a boat or two. Plus a **hot air balloon, birds, butterflies and clouds** for the sky.
* **Weather:** rain, snow, fog, fireflies, and a rainbow.
* **Seasonal town swaps:** every tree and building in 5 themes.
* **Map markers:** home pin, region labels, locked and unlocked previews, a "new!" burst.
* **Plaza:** a full Town Square tile set (paving, fountain, benches, trees, string lights, stage, flower beds) and 3 celebration banner designs.
* **Poster and world map:** a clean illustrated map for the Dream Map screen.

---

## Part 9. Audio (none exists today)

* **Music loops** (60 to 120 seconds each): home island, town, café, pier at sunset, arcade, orchard, one for each season, and a calm focus track for the Focus Beacon.
* **Ambience loops:** waves, wind, birds, crickets, rain, fire crackle, café chatter.
* **Interface sounds:** tap, open and close, quest sent, quest approved (a happy chime), coin and gem pickups, level up, blind box shake and reveal, error.
* **Gameplay sounds:** footsteps (sand, wood, grass), place and pick up furniture, tea drop, bottle plop and cork, lantern light, vitality chime, synergy swell, fountain.
* **Minigames:** order bell, steam hiss, whisk, cup clink, fish splash, line cast, ring tick and perfect hit, claw motor, box drop, prize jingle, apple thud, golden apple shimmer, countdown beeps, victory fanfare.
* **Voice and character sounds (optional):** tiny giggles and happy noises per character.

---

## Part 10. Priority order

**Tier 1: biggest visual upgrade for the least work**
1. Walk cycles: diagonal directions, Rachel front and back, and Kitty, Miffy and Snoopy.
2. The 12 collectible figures plus the three capsule or box designs.
3. The 4 items with no sprite, plus the neon sign.
4. Icons: 8 quadrant icons, 7 currency and resource icons, and the side button set.
5. The Town Square tile set and bunting.
6. Matcha Masters ingredients, customers and the café scene.

**Tier 2: makes the new mechanics feel special**
7. Aura effect sprites for the 8 quadrants, plus the Vitality Glow and Synergy Aura.
8. The Wisdom Bookshelf (5 stages plus loose books).
9. Dream Vault and blueprint art for Glass Café, Rooftop Deck and expansions.
10. Focus lantern, tea cup drop and sealed bottle animations.
11. Stellar Fishing fish, fauna and background.
12. Crane cabinet, claw and boxes.

**Tier 3: depth and polish**
13. Orchard art.
14. Outfits and close up portraits.
15. Emotes and activity poses.
16. More townsfolk and visitors.
17. Town buildings, roads and vehicles.
18. Day and night variants.
19. Audio.
20. Branding and onboarding art.

**Tier 4: long tail**
21. Extra furniture and seasonal sets.
22. Weather.
23. Extra companions.

---

## A note on characters
Hello Kitty, Miffy, Snoopy, Disney and Miniso are trademarks of their owners. That is fine for a private game for the two of you. If it is ever shared publicly, swap those for original characters.
