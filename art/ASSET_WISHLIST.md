# Our Little World: the art wish list (updated)

This is the master list of what is still needed to make the game fully on brand, beautiful and alive. It reflects the game as it stands today (Build 28). Every section says what is already painted and live, what is saved but not used, and what is still missing.

Legend
* **Live**: your painted art is in the game today.
* **Saved**: your art exists in `art/source/` but is not used yet. I can wire these in without you drawing anything.
* **Missing**: nothing painted exists. This is what to create.
* **Code drawn**: the game paints it with shapes, so it works but looks plainer than your art.

---

## Part 1. How to add or replace art

### A. Single sprites (furniture, props, buildings, icons)
1. Make a transparent PNG, tightly cropped, no labels and no sheet background, at 2x size (one island tile is 128 x 64 px at 2x).
2. Name it after the key (for example `plant_a.png`) or tell me what it is.
3. Send it, or drop it in `art/replace/`. I register its on screen width and rebuild the sprite lists.
4. A brand new item needs a name, price, footprint in tiles (width by depth) and shop category. I add one line in `src/state/catalog.ts`.

### B. Sheets (many things on one picture)
This is the workflow we have used all along, and it works well.
* One object per cell, clear gaps, a flat plain background, no text touching an object.
* Keep labels in a margin or on a second copy.
* Tell me the key for each object in reading order. If you do not, I choose names from the sheet title.
* For animations, keep every frame the same size, bottom aligned, left to right.
* The cutters live in `tools/` (`slice_sheets41_45.py`, `slice_town.py`, `slice_minigames.py`, `slice_starters2.py`, `slice_floors.py`, `slice_npcs.py`). A new sheet gets a small new cutter.

### C. Walk cycles
One horizontal strip per direction, every frame the same size and bottom aligned. The layout I want for every character from now on:

| Strip | Frames |
|---|---|
| Walk toward the camera (south), screen left and screen right | 4 to 6 each |
| Walk away from the camera (north), screen left and screen right | 4 to 6 each |
| Walk east and walk west (side views) | 4 to 6 each |
| Idle: front, back, left, right | 2 each (a gentle breath) |
| Sit, sleep, wave, cheer | 2 to 4 each |

Diagonals are what make town walking look right on an isometric map, so northeast, northwest, southeast and southwest matter more than the straight up and down views.

### D. Things drawn by code
The plaza paving, the island ground and sea, the wall materials, all aura effects and a lot of interface are drawn by code. To replace one, send the art and say which part it replaces, and I change the code to draw your sprite instead.

### Delivery checklist
* Transparent PNG, sRGB. WebP is fine for large backgrounds.
* Soft light from the upper left, warm brown outlines, pastel palette, chibi proportions (see `art/ART_GUIDE.md`).
* Always give the footprint in tiles for anything that sits on the grid.
* For seasonal pieces, give spring, summer, autumn and winter (holidays can reuse winter).
* Do not bake a pale background or a cream halo into a sprite. The cutters work best with a flat background and a clear outline.

---

## Part 2. Where we are today

### Live and painted
* The three starting paths (RV, Shop and Café, Home Foundation): cards, day one buildings, stage props, and the three sunset paintings for See on Island.
* About 345 shop items, including 95 new home, outdoor, café, wall decor, pet and seasonal pieces, and 16 painted floors.
* 14 civic buildings, the Town Square props, trees, boats, houses, towers, park, road signs and cars.
* 5 walking townsfolk, James and Rachel (two looks), the golden retriever (side view), Kitty, Miffy and Snoopy outfits (standing).
* 12 Crane figures and 4 capsule series.
* Quadrant icons, Focus lantern, sealed bottle, bunting, Wisdom Bookshelf stages, Dream Vault and blueprints, bids, streak flames, whisper cards, campfire and scratch card icons, coin, gem and blind boxes.
* Matcha Masters: café interior, 12 ingredient jars, 6 customers, cups.
* Stellar Fishing: 3 skies (time of day), 4 fish species with glow variants, crate, bottle.
* The Crane: claw, rail, light and heavy boxes in 3 colours.

### Saved but not wired (I can use these now)
* Sheets 36, 37, 38, 39, 45: shoreline pieces, depth gradient, transition mats, roofs, stairs, half walls, modular wall sets. We chose to keep the soft pastel island and plain blue sea, so most of these are on hold.
* Sheet 53: town edge cases (road transitions, curbs, cliffs, riverbend, awnings, alert markers).
* Sheets 46 and 47: arcade edge cases, the full cabinet view, and the arcade front.
* Together art: gratitude note frames, pop open sequence, love map heart meter stages, confetti and balloons, the tea parachute frames.
* Matcha: recipe book cover and page art, 4 recipe illustrations, 6 topping stencils, tip jar, star states, order window and prep station.
* Fishing: octopus, starfish and jellyfish idle frames, the aquarium tank, the Beach Memory Journal page.
* Crane: figure reveal cards, token art, prize drop and heavy slip frames, magnetic aura.
* 6 of the 8 Matcha customers and only one expression each.

### Code drawn (works, but not at your art quality)
* The island ground, shoreline and water, the ripple lines.
* Walls (the materials are code drawn in your colours), floors that are seamless.
* The Town Square paving and the road ribbons.
* Orchard Harvest: the whole scene.
* The Perfect Catch meter, sync ring, tension bar, and most game interface.
* All aura bursts, Vitality Glow, Synergy Aura.
* The interface icons (side buttons are emoji) and resource icons for shells, driftwood, event tokens and ingredients.

---

## Part 3. Characters (the biggest remaining gap)

### James and Rachel (both the cream cap and dark cap looks)
Missing:
1. **Diagonal walks**: northeast, northwest, southeast, southwest, 4 to 6 frames each. This is the single biggest improvement for how movement feels.
2. **Rachel front and back walk**, 4 to 6 frames each (she uses a standing pose and a bounce today).
3. **Back view walk** for James in both looks.
4. **Sit poses**: couch, chair, bench, beach lounger, picnic blanket, camp chair.
5. **Emote set** for each of you: wave, hug (a shared two person pose), high five, cheer, blow a kiss, laugh, happy tears, sleep, yawn, thumbs up, shy.
6. **Activity poses** that match the game: stretching or jogging (Health), cross legged at a laptop with the lantern above (Focus Beacon), reading (Learning), dropping a coin in a piggy bank (Finance), writing a letter and corking a bottle (Romance), hosting with arms out (Social), casting and reeling (Fishing), steaming and serving (Matcha), pressing arcade buttons (Crane), shaking a tree and holding a basket (Orchard).
7. **Outfit layers or full outfit sets** so the Wardrobe can dress you: hoodie, concert outfit, holiday sweater, pajamas, swimwear, café apron, winter coat, rain coat. Full redrawn sets are best because layers rarely line up on small sprites.
8. **Close up portraits** (about 512 px square) with 6 expressions each: neutral, happy, laughing, shy, sleepy, loving. These would lift the quest, journal, letter and daily question screens a lot.
9. **Couple pose set** for photo moments: hand holding, side by side, dancing, forehead touch.
10. **Starting path characters**: your sheet 59 characters (hooded RV couple, barista couple, builder couple) are saved but not used. Say if you want these as the avatar outfits for each path.

### Companions
1. **Hello Kitty, Miffy, Snoopy**: 4 direction walk cycles (4 frames each) for every outfit. Today they bounce and mirror. There are about 11 outfits.
2. **Sit, sleep and play poses** for each.
3. **Golden retriever**: front and back walk, plus sit, wag, sleep and play. Only the side walk exists.
4. **New companions for future Wardrobe slots**: corgi, bunny, puppy, cat, duck, with walk cycles.
5. **Mochi** (the practice partner bot in the minigames): a proper character with an avatar, an idle and a happy pose. Today Mochi is just a name.

### Collectible figures (the 12 Crane figures)
1. A small **walk cycle** for each (4 frames, front and side) so freed figures can really roam. They hop and sway today.
2. The **secret figure** (the Golden series has room for it).
3. **Figure reveal cards** (saved, not used), one per figure.
4. A **capsule shake and open** animation per series (3 frames each).

### Townspeople and visitors
1. **Back views** for the 5 walkers (the sheet only had front, side and one back row). Without them, walking away from the camera reuses a side view.
2. **The student row** (6 different people on one row) as separate characters, each with their own walk.
3. **10 or more new townsfolk** with 4 direction walks: a child, an older man, a jogger, a dog walker, a vendor, a musician, a painter, a postal worker, a barista, a surfer, a teacher.
4. **Celebration visitors** for the Town Square (party hats, balloons, cake, cheering loops).
5. **Friends and family characters** for the Social goals: a friend couple, a grandparent, a baby.
6. **Shopkeepers** that stand at the new civic buildings (baker, librarian, teacher, doctor, firefighter, cinema clerk).

### Matcha Masters characters
1. **Customers**: the other 2 of 8 customers, and **four expressions each** (happy, neutral, impatient, delighted). Today the game uses one image per customer.
2. **Sous chef and barista avatars** in aprons for the two roles.
3. **Serve animation**: a hand passing the cup across the counter.

---

## Part 4. Home island

### Ground, shoreline, water
We chose to keep the soft pastel island and plain blue sea. If you ever want more life there, the useful pieces are:
1. A **refined seasonal ground** in the same soft pastel language (no leaf texture), one for each season, with the same flat feel as today.
2. **Shoreline foam** pieces for the island edge in 4 corners and 4 straight pieces.
3. **Water ripple** sprites or a very subtle painted sea tile.

### Structures
1. **Roofs**: modular roof pieces for placed rooms (straight, corner, valley, L hip), in tile, thatch, snow and autumn leaf versions. The finished starters have roofs, but a room you build yourself does not.
2. **Wall materials as sprites** (pink, sage, brick, board and batten, wainscot, picket, hedge, glass) with corner, T, cross, end cap and pillar pieces. They are code drawn today.
3. **Doors and windows** for each material that has none (picket, hedge, glass).
4. **Stairs and half walls** (we are skipping multi level homes for now, so this is low priority).
5. **Memory plaque** sprite (wood, brass, pastel) plus polaroid and framed photo styles. It is code drawn today.
6. **Front door mailbox** for love letters as an alternative to the shoreline.
7. **Island growth**: the 12, 14 and 16 tile expansions in 3 stages each (blueprint, scaffolding, finished) so a bigger island shows the work.

### Items still missing from the shop
* Kitchen: oven hood, pot rack, dish rack, stand mixer, microwave.
* Living: bar cart, floor lamp variants, bean bag, rocking chair, fireplace, bookshelf variants.
* Bedroom: bunk bed, crib, hamper, jewelry box.
* Bathroom: shower, towel rack, bath mat, mirror cabinet.
* Outdoor: fountain, pond, windmill, bird bath, sandbox, picnic table, pizza oven.
* Wall decor: more prints, pennants, a chalkboard, clocks, a cork board.
* Seasonal: 8 or more pieces per season (8 per season now exist for spring through winter, but holidays has only a few).
* Pets: more beds, bowls, toys and a pet house.
* Café: a counter in more finishes, a juice bar, a pastry display with animation, an open sign.

### Mechanic objects (partly live)
1. **Wisdom Bookshelf in the room**: the 5 stage shelf is live in the Library screen, but a version that sits in your home and fills with spines is not.
2. **Dream Vault in the room**: a piggy bank or safe sprite you can place, in 3 fill states.
3. **Focus lantern animation**: a soft glow loop, an extinguished frame, and a tea cup arriving on a little parachute.
4. **Sealed bottle**: drifting, washed up and opened, plus splash and sparkle loops.
5. **Gratitude jar and notes**: the pop open animation.
6. **Confetti and balloons** for the plaza.

---

## Part 5. The Town

1. **Sprite roads**: straight, corner, T, crossroads, curbs, sidewalks, crosswalks, parking, bike lanes, cobblestone, dirt trail, drawn in the town's isometric grid. Roads are painted by code in your colours today, because the road sheet was not drawn in the town grid.
2. **Terrain**: grass, sand, forest floor, snow, farm rows, cliff edges and shoreline pieces for the town map (sheet 53 has some, saved).
3. **Buildings**: the 14 civic buildings are live, but still missing a **train with tracks**, a **harbor market**, a **lighthouse close up**, a **church or chapel**, a **museum**, a **post office**, a **hotel**, a **flower market** and a **community garden**. Also separate buildings for the farm, cabin and campus so they can grow in steps.
4. **Growth stages** for every building (a small version, then built).
5. **Day, evening and night versions** of every building, with lit windows and street lamps that glow.
6. **Vehicles in 4 directions**: your pink beetle, the retro van, scooter, bus, bike, a boat or two.
7. **Sky life**: birds, butterflies, a hot air balloon and clouds.
8. **Weather**: rain, snow, fog, fireflies and a rainbow.
9. **Seasonal town swaps**: every tree and building in the 5 themes.
10. **Map markers**: home pin, region labels, locked and unlocked previews, a "new!" burst, alert and lock markers (sheet 53 has some).
11. **Town Square**: a real stage in three states (empty, setup, active), market stalls, a fountain with glowing water for events, string lights, and 3 celebration banner designs. Several are saved.
12. **The Arcade building**: the town map version is live. The full cabinet view is saved.

---

## Part 6. Minigames

### Matcha Masters
Live: café interior, ingredient jars, 6 customers, cups. Missing or saved:
* A **sunset version** of the café.
* The **steamer with a dial**, the whisk and bowls placed in the scene.
* **Order tickets** with a ticket style and a Café Rush badge (the badge is live).
* The **Recipe Memory Book**: cover, page art and the 4 recipe illustrations (Our First Date Matcha, Sunset Strawberry Cloud, Pier Day Boba, Cozy Rainy Latte). Saved, not used.
* **Latte art** variations on the finished drink, and the topping stencils (saved).
* **Reward stars** in 3 states, the tip jar and a coin burst (saved).

### Stellar Fishing
Live: skies, 4 fish species, crate, bottle. Missing:
* **At least 8 fish species**, each swimming left and right, with a glow variant for each (4 exist).
* **Pier and distant island layers** so the background has depth, and the **water in three times of day**.
* **Sea fauna** for the aquarium (octopus, starfish and jellyfish are saved) plus room for 10 more, and the **aquarium tank screen**, which the game does not have yet.
* **Bobber, line, hook and splash rings**, and a painted **sync ring** (code drawn today).
* **Message in a bottle** art and the **Beach Memory Journal** page (saved, not used).

### Blind Box Crane Craze
Live: claw, rail, boxes. Missing or saved:
* The **full cabinet** with glass and a prize chute, as the minigame backdrop (saved).
* Claw frames for **open, closing, closed and lifting** with a cable that scales, plus the **magnetic aura**.
* **Prize drop** and **heavy slipped** animations, and a **figure reveal card** for each of the 12 figures.
* **Edge case art**: jam, tangle, teeter and lid pop frames (sheet 46, saved).

### Orchard Apple Bouncing and Harvest (all code drawn)
Nothing painted exists. Needed:
* An **orchard background** in 4 seasons.
* **Apple trees** with a shake animation, a **basket** and a **harvest crate**.
* **Apples**: red, green and golden, with bounce and squash frames.
* The **Pastel Shower** effect for golden apples, a seasonal event token and the café pantry shelf.

### Shared minigame pieces
* A result screen frame, star art, confetti, an invite banner style and a "waiting for your partner" illustration.

---

## Part 7. Interface

1. **Side button icons** (they are emoji today): town map, together, arcade, rituals, daily question, blind boxes, wardrobe, journal, decorate, quests, see on island.
2. **Currency and resource icons**: coin, gem, blind box and arcade token are painted. Missing: **Heart Shell, event token, driftwood, ingredient, vault coin and blind box key**.
3. **Quadrant icons** are live. The matching **aura effect sprites** are missing: green leaves for Health, lanterns for Career, books for Learning, golden coins for Finance, hearts for Romance, balloons for Social, flowers for Home, music notes and stars for Fun.
4. **Vitality Glow and Synergy Aura**: soft painted glow decals in 3 sizes.
5. **Panels and buttons**: a sheet frame, button states, tab styles, toggles, sliders and progress bars in pink, green and gold, and badges. The interface is plain rounded shapes today.
6. **Cards**: quest card, blind box rarity frames, outfit card, memory polaroid.
7. **Branding**: app icon (192 and 512 px), favicon, splash screen, title logo, loading animation and a share card image.
8. **Onboarding illustrations**: "pair with your partner" and "claim your plot".
9. **Level up and milestone**: a medal, a badge set for approved goal counts and a confetti burst.
10. **Daily question**: a card frame, the Love Map library book, and a floating heart over the box.
11. **Economy screens**: the Today's full pay bar, the Duo Day bonus art.

---

## Part 8. Audio (none exists yet)

* **Music loops** (60 to 120 seconds): home island, town, café, pier at sunset, arcade, orchard, one for each season, and a calm focus track for the Focus Beacon.
* **Ambience**: waves, wind, birds, crickets, rain, fire crackle, café chatter.
* **Interface sounds**: tap, open and close, quest sent, quest approved (a happy chime), coin and gem pickup, level up, blind box shake and reveal, error.
* **Gameplay sounds**: footsteps on sand, wood and grass, place and pick up furniture, tea drop, bottle plop and cork, lantern light, vitality chime, synergy swell, fountain.
* **Minigames**: order bell, steam hiss, whisk, cup clink, fish splash, line cast, ring tick and perfect hit, claw motor, box drop, prize jingle, apple thud, golden apple shimmer, countdown beeps, victory fanfare.
* **Character sounds** (optional): tiny giggles and happy noises.

---

## Part 9. Priority order

**Tier 1: biggest lift for the least drawing**
1. James and Rachel diagonal walks, plus Rachel front and back walk.
2. Close up portraits with expressions (quest, journal, letters, daily question).
3. The Heart Shell, event token, driftwood and ingredient icons, plus the side button icon set.
4. Kitty, Miffy and Snoopy walk cycles for the outfits you use most.
5. Orchard Harvest scene art (the only game with no painted art).
6. Matcha customers, 4 expressions each.

**Tier 2: make the new mechanics feel special**
7. Aura effect sprites for the 8 quadrants, plus Vitality Glow and Synergy Aura.
8. Sprite roads and terrain in the town grid.
9. Townsfolk back views and 10 more townsfolk with walks.
10. Fishing: 4 more fish species, the aquarium screen and sea fauna.
11. Focus lantern, tea parachute and sealed bottle animations.
12. Emotes and activity poses for James and Rachel.

**Tier 3: depth and polish**
13. Outfit sets for the Wardrobe.
14. Day, evening and night variants of the town.
15. Modular roofs and wall material sprites.
16. Weather and sky life.
17. Audio.
18. Branding and onboarding art.

**Tier 4: long tail**
19. More furniture and seasonal sets, more companions.
20. Multi level homes (stairs and half walls).
21. More civic buildings and growth stages.

---

## A note on characters
Hello Kitty, Miffy, Snoopy, Disney and Miniso are trademarks of their owners. That is fine for a private game for the two of you. If it is ever shared publicly, swap those for original characters.


## Part 10: Pastel Co op Dash (platformer) art wish list

The platformer is playable now with simple drawn shapes and your Kitty and Miffy standing sprites. These would make it feel finished.
1. Run, jump, glide and hurt frames for Hello Kitty and Miffy (side view, 4 frame run, 1 to 2 frame jump, 1 glide with the bow, 1 bubble pose).
2. A pastel tileset: grass top, dirt, wooden pier planks, tea saucer platforms, stacked books, a drawbridge.
3. Pickups: golden red apple, strawberry crate, Sanrio gift box (closed and open), Mimmy's yellow bow.
4. Gudetama on his bacon blanket (idle and bounce), boba pearl bubbles, Cinnamoroll and My Melody waving, the checkpoint mug with steam.
5. Parallax backdrops: sunset sea with lighthouse, rolling apple orchard hills, Mama Mary's bakery gate, the friendship archway with bell.
6. Levels 2 and 3 themes (a snowy village and a night market).


## Part 11: anchors and celebrations (new mechanics)

The lantern, postbox and scroll use saved art for now. Dedicated art would make them feel finished.
1. **Synergy Lantern** in four flame tiers: pastel blue, soft pink, golden sparkle and radiant rainbow, plus an unlit version and a small post or hook for the porch.
2. **Striped postbox** for the gate, closed and with a letter peeking out.
3. **Sunday Covenant scroll** under a glass dome for the Town Square pavilion, rolled and unrolled.
4. **Grace Shield** blanket animation: the sleepy avatar under a blanket with the note "Rest day used".
5. **Confetti and sparkle sheet** (pastel paper, hearts, stars) for the celebration card.
6. **Pocket Phone** frame and app icons in your painted style.


## Part 12: café interior (what is in and what is still wanted)

In now (from sheets 70 to 74): three room themes, seating and tables, plants, pastry cases, whisk station, espresso station, window bench, boba rack, cat clocks, frames, hanging plants, floors, goods and 8 customer archetypes (standing).
Still wanted:
1. **Customer walk cycles** that are consistent. The walk rows on your sheets show different numbers of frames per character, so customers currently slide with a small hop. Four frames in each of four directions per archetype would fix it.
2. **Seated customers on real chairs.** The "sit" poses sit on a wooden bench. A pose without the bench would let customers use chairs.
3. **Barista staff** (for hiring): stand, carry tray, brew loop, in four directions.
4. **Storefront exterior** with open and closed sign states, awnings, patio fence and the A frame chalkboard.
5. **Point of sale register, industrial oven and fridge, wash sink, trash bin** with four turns.
6. **Pet furniture** (calico cat bed, rabbit tunnel, scratch post, food and water bowls) and pets that move.
7. **Lucky cat tip jar**, **latte art** tracing kit and the **café scrapbook** pages.
8. **Door and window pieces** in each theme (the room shell uses the existing wall pieces for now), and a **fireplace**, **record player** and **string lights** for seasonal events.

## Part 13: café management art gaps (couple focused)

Saved but not yet cut or wired: barista staff, ovens and fridge, register and pickup counter, couches, pet furniture, new goods, mailbox and lantern, lucky cat jar, chalkboard sign, latte art kit, wifi router, study slam props, community board.
Still missing, and what makes it a couples game:
1. **Two seat "date table" set**: a candlelit table for two, shared dessert plate and two mugs, with a heart glow when you both sit.
2. **Couple roles at stations**: poses of two avatars working side by side (one brews, one serves), and a high five or toast animation when a rush is cleared together.
3. **Anniversary and memory wall**: frames that show your Journal photos, a "first matcha" plaque, a guest book, and a time capsule jar.
4. **Surprise delivery props**: a gift box on a table, a flower vase and a sticky note that appear when your partner sends a surprise.
5. **Event dressing**: rainy window overlay, jazz lighting tint, adoption pen (4 by 4 playpen) and cat, dog and bunny sprites that walk, study slam banner, string lights.
6. **Customer walk cycles and chair sitting poses** (current ones glide), plus staff idle frames.
7. **Quiet corner**: a two person reading nook and a "talk" prompt card set, since events should include a slow moment together.
8. **UI**: star rating, tip jar, order ticket, and weekly goal ribbon in the same painted style.
