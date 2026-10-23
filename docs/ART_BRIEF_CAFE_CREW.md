# Art brief: the Café crew, Menu R&D Lab and Rush Hour Manager

For the agents who draw the sheets. Every asset needed for the three new features in `docs/CAFE_STRATEGY.md`. Read section 0 first, then draw the sheets in the priority order of section 12. Each sheet entry says what goes on it, how many frames, what size, and the key name I will cut it to.

## 0. Rules for every sheet

**Style (match what already exists):** soft pastel chibi look, thin warm brown outlines (never pure black), upper left light, a soft warm pink or brown ground shadow at about 15 percent opacity, simple dot eyes, blush cheeks. Palette: pinks #FFD3DE and #F7B8C8, sage #C9E4B8, cream #FFF4EE, warm wood #E3C295 to #B9854F, sky #BFE6F2, matcha #9FC77A, cocoa text #6B4F4F. No pure white, no pure black, low saturation.

**Scale:** in the game a person is about 54 px tall. Draw each full figure about 216 px tall on the sheet (4 times the game size). Never smaller than 110 px. All frames of one character use the same height and the same feet baseline.

**Views for isometric characters:** `fl` front left, `fr` front right, `br` back right, `bl` back left. If I say "front and back", I mirror them for the other side, so draw only one pair and keep the character symmetric enough to mirror (carry items in the hand that still reads when flipped).

**Layout of a sheet (the format that cuts cleanly):**
* Flat warm cream paper background (#FFF4EE), a faint grid is fine. **Do not paint a fake transparency checkerboard.** The last icon sheet had one baked in and it left speckled edges.
* One figure per cell, a strict grid, at least 24 px of empty paper between cells, never overlapping neighbours, never touching the sheet edge. Do not let motion blur, shadows, glows or speech bubbles cross into the next cell.
* Labels go below each cell in plain type, with at least 16 px of gap. No text on top of the art. No text baked into any sprite that the game will translate or change (numbers, names, "COMBO").
* Draw glows, auras and sparkles on their **own cell on a dark navy tile**, separate from the base sprite, so I can lift them as overlays (the pale body of a glowing sprite always disappears when the glow is baked in).
* Every frame of an animation in one row, left to right in play order, with the frame number below.
* Keep rounded tile backgrounds out of cut sprites: the figure sits on bare paper.
* Show full objects. Nothing cropped by the cell edge, handles, steam or tails included.

**Naming and size note on each sheet:** put a title strip at the top (sheet number, what it contains, the key prefix) and a small ruler showing the 216 px figure height.

**Gemini character sheet prompt template (fill the brackets):**
"A cozy pastel chibi character sheet for the game Our Little World. Character: [name, role, personality, signature colors, accessory]. Draw a clean grid on flat cream paper with these poses: [list]. Isometric views front left, front right, back right, back left where listed. Thin warm brown outline, soft upper left light, soft pink ground shadow, no fake transparency checkerboard, no text on the art, 24 px gaps between cells, nothing cropped, every figure the same height and feet line. Label each cell underneath."

## 1. The crew (the four we have and four new islanders)

Each crew member has a skill, a favorite shift, a personality and an accent color. Keep the existing four recognizable.

* **Mr. Tan, The Cheerful Manager.** Skill Charm. Favorite shift Weekend Brunch. Round, warm, bow tie and clipboard, sunny yellow accent. (Exists as stills.)
* **Pip, The Eager Apprentice.** Skill Speed. Favorite shift Morning Rush. Small, big grin, oversized apron, mint accent. (Exists.)
* **Mr. Oren, The Experienced Brewmaster.** Skill Craft. Favorite shift Quiet Afternoon. Calm, spectacles, tidy mustache, deep green accent. (Exists.)
* **Juno, The Pet Sitter.** Skill Care. Favorite shift Event Night. Gentle, soft scarf, lavender accent. (Exists.)
* **Hana, the pastry artist.** Skill Craft. Favorite shift Weekend Brunch. Hair bun with a chopstick pin, flour dusted apron, peach accent.
* **Kenji, the runner.** Skill Speed. Favorite shift Morning Rush. Sporty, headband, sneakers, sky blue accent.
* **Maya, the storyteller.** Skill Charm. Favorite shift Event Night. Curly hair, tote bag, mustard cardigan, rose accent.
* **Ollie, the gentle helper.** Skill Care. Favorite shift Quiet Afternoon. Tall, soft knit hat, round glasses, sage accent.

### Sheet C1: Level looks (all 8 crew)
Each crew member in 3 looks, front left view, full body, 216 px tall:
* Apprentice: plain apron, no badge.
* Skilled: apron with their accent trim and a small skill pin.
* Expert: signature piece (jacket, scarf or hat) with a gold star pin and their accent color shown more boldly.
Keys: `crew_<id>_<level>_fl` (id is tan, pip, oren, juno, hana, kenji, maya, ollie; level is 1, 2 or 3). 24 figures. The existing four stills (fl, fr, br, bl) should be redrawn consistent with these.

### Sheet C2: Four view stills for the new islanders and expert looks
For Hana, Kenji, Maya and Ollie at Apprentice level: `fl`, `fr`, `br`, `bl`. For all 8 at Expert level: `fl`, `fr`, `br`, `bl`. Keys `crew_<id>_<level>_<view>`. 48 figures.

### Sheet C3: Walk cycles
For each of the 8 crew at their current look: front walk (4 frames, facing front left) and back walk (4 frames, facing back left). Arms swing, a gentle bounce, feet on the same line. Keys `crewwalk_<id>_f_1..4` and `crewwalk_<id>_b_1..4`. 64 figures. Also the same cycles carrying a tray (a separate sheet C3b, front and back, 4 frames each, tray in the hand that stays readable when mirrored). 64 figures.

### Sheet C4: Station work loops
For each crew member, one working loop at their main station, facing front left, 6 frames each: 
* Espresso or matcha station: tamp, pull, pour, wipe (Pip, Mr. Oren, Kenji).
* Whisk station: whisk, lift, taste (Mr. Oren, Hana).
* Pastry case: arrange tray, slide in, smile (Hana, Pip).
* Register: ring up, hand change, wave (Mr. Tan, Maya).
* Floor and pets: wipe table, pet the corner pet, pour water (Juno, Ollie).
Keys `crewwork_<id>_<station>_1..6`. About 40 figures. The station props (steam, whisk, tray) are baked into the frames on the figure's side only, no large effects.

### Sheet C5: Emotes and moods (per crew member, front left)
10 poses each, 8 crew, 80 figures:
1. idle breathing frame A, 2. idle frame B, 3. happy, 4. proud (hands on hips), 5. shy (thanked, blush), 6. surprised, 7. eating a treat (a 4 frame loop, so 4 cells), 8. sleepy nap sitting, 9. cheering both arms, 10. Glowing (the same figure with a warm aura, drawn on a separate dark tile as an overlay).
Keys `crewemote_<id>_<emote>`.

### Sheet C6: Portrait busts for the UI
Each crew member, head and shoulders, 256 by 256 px, 3 levels by 3 expressions (neutral, happy, glowing). 72 busts. Warm rounded frame not included. Keys `crewbust_<id>_<level>_<expr>`.

### Sheet C7: Apprentice oopsies (cute, never punishing)
Pip and Hana (the two apprentices): 
* Tray wobble, 4 frames (tilts, wobbles, recovers), with a pastry tray.
* Dropped cup, 4 frames (slips, tosses, sparkles, caught by hands overlay).
* Surprised face with a tiny "oops" puff (a symbol, not text).
* Sweeping up spilled oat milk, 4 frames.
Plus oopsie props on their own: a small cartoon oat milk puddle (3 sizes, cute, not gross), a tipped cup, three floating pastry crumbs. Keys `oops_<id>_<name>_<n>`.

### Sheet C8: Crew promotion ceremony
A promotion banner (blank ribbon), confetti burst 4 frames on a dark tile, a new apron reveal (curtain sparkle) 4 frames, a gold star pin, a small trophy cup, a glow ring. Keys `promo_*`.

### Sheet C9: Crew arrivals
A new islander at the café door: silhouette in the doorway, walking in with a bag (4 frames, front and back), a hello wave (4 frames) and a bow (3 frames), for a generic newcomer in plain clothes who can be tinted. Plus a small suitcase and a letter. Keys `arrive_*`.

## 2. Crew life: the Roster Board and growth UI

### Sheet R1: The Weekly Roster Board
* The wooden board itself, isometric free standing and a flat UI version (about 960 by 560 at 2x), with four slots: Weekday Rush, Weekend Brunch, Quiet Afternoon, Event Night. Each slot has an icon (a sunrise, a croissant basket, a teacup, a moon with a note).
* Round crew tokens, 64 px, for all 8 crew (portrait in a round frame with their accent ring), plus an empty token.
* Energy pips: full and empty, 3 sizes (a small leaf or heart).
* Favorite shift star, Duet link icon (two small hearts joined by a thread), Duet glow line (a soft curved line on a dark tile), slot filled sparkle, week header ribbon, Sunday lock and unlock lock icons.
Keys `roster_*`.

### Sheet R2: Skill and meter icons
* Four skill icons, 64 px: Speed (a swift tea cup with motion lines), Craft (a whisk and star), Charm (a heart with sparkles), Care (a hand holding a leaf). Each in a soft badge in the skill's color, and a plain version.
* Three level badges: Apprentice (bronze leaf), Skilled (silver leaf), Expert (gold star leaf).
* Cozy meter: a horizontal meter frame with three zones, Steady (a small cloud), Warm (a sun), Glowing (a gold sparkle). Meter fill and a marker. Keys `skill_*`, `level_*`, `cozy_*`.
* Experience bar frame and fill, a Praise icon (a heart note) and a Coaching icon (a lightbulb note), both 64 px.

### Sheet R3: Crew card and Mentor moment UI
* A crew card frame (about 480 by 640 at 2x) with a portrait window, name plate, skill row, level row and a story chapter strip. Plain and "level up ready" versions (soft glow border).
* Mentor moment scene: a cozy crew room backdrop (a couch, a tea table, a window, a plant), 960 by 540 at 2x, plus a speech option card frame (3 sizes), a thank you star burst and a notebook icon for specific feedback.
* A chapter strip of three tiny story icons per crew member (24 icons total, 64 px): simple vignettes of their backstory, one drawn, one in progress, one locked (a silhouette).
Keys `card_*`, `mentor_*`, `chapter_<id>_<n>`.

### Sheet R4: Treats for the crew
Six cozy treat objects, each 128 px plus a 4 frame "sharing" bite animation of the crew eating them (the animation uses the crew eat emote cells in C5): apple tart, honey toast, matcha cookie, fruit parfait, mochi pair, onigiri. Plus a treat tray, a small wrapped gift and a heart tag. Keys `treat_*`.

### Sheet R5: Crew Album and Employee of the Week
* Album cover, page frame (left and right), a polaroid frame for chapter pictures (blank), a ribbon bookmark, sticker sheet of 12 small stickers (a tiny star, cup, heart, bow, paw, leaf and so on).
* The Employee of the Week wall frame (a wood plaque with a star, 3 sizes), a pin, a small note card (blank), a paper heart garland strip, a confetti pop (4 frames).
Keys `album_*`, `eotw_*`.

### Sheet R6: Quiet Mode (a rest day for the café)
The crew napping: a couch scene for 4 crew (4 frames of a slow breathing loop with "z" puffs drawn as shapes), a blanket, a "Closed, resting" door sign (blank ribbon so I add text), a moon and a teacup on the counter, a sleeping pet corner. Keys `quiet_*`.

## 3. Menu R&D Lab

### Sheet L1: The Test Kitchen back room
* A room backdrop, 960 by 540 at 2x, with a Test Kitchen counter in the middle, shelves of jars, a chalkboard, a window and a sleeping cat.
* The counter as a placeable isometric object (2 by 1 tile) in all 4 views, `fl`, `fr`, `br`, `bl`.
* The back room door (open and closed), a small key tag. Keys `lab_*`.

### Sheet L2: Ingredient icons (match the existing jar style)
Each icon 128 px, in a jar or bottle with a lid and a tiny label shape (no text). Also each as a 40 px small swatch dot color and as a layer color band (a horizontal strip showing how it looks inside a clear cup).
* Bases (4): Matcha (exists, redraw consistent), Espresso, Earl Grey tea, Golden Turmeric milk.
* Flavors (8): Strawberry, Honey, Salted Caramel, Yuzu, Lavender Honey, Apple, Blossom (spring), Pumpkin spice (autumn). Plus one empty seasonal slot for winter (Peppermint).
* Toppings (6): Boba pearls, Cream cheese foam, Cherry blossom sprinkles, Dried rose petals, Edible gold flakes, Cinnamon dust.
Also "locked" versions (a soft padlock over a silhouette) and "new" sparkle badge. Keys `ing_<name>`, `ingband_<name>`.

### Sheet L3: Flavor Alchemist controls
* A temperature thermometer slider (frame, glass, fill gradient from cool to warm, a draggable knob in 3 states), 
* A sweetness dial wheel (frame, a dial, marker, 12 tick marks),
* A sweet spot meter (a ring with a soft glow that pulses: 4 frames on a dark tile), a "close" warm glow, a "perfect" chime burst, a hot and cold hint icon (a sun and a snowflake),
* An experiment button set (Mix, Taste, Keep) with normal, pressed, disabled states, and an experiments left counter frame with 3 pips.
Keys `alch_*`.

### Sheet L4: Visual Decorator controls
* Three glassware types in 3 views each (empty, layered fill, topped): Mason jar, Character mug, Pastel to go cup. Each with a straw or lid option. 128 px tall. Fill layers drawn as separate transparent bands so the game can tint them by ingredient color.
* Rim garnishes (6): sugar rim, cinnamon rim, blossom rim, gold rim, a berry on the edge, a mint leaf.
* Extra latte art patterns to add to the existing cat, frog and heart: bear, star, bunny, swirl, flower. Each a dotted trace line (for tracing) and the finished art, 200 px, on a plain foam circle.
* A tracing guide dot (3 states), a gold completion check, a drawing hand cursor (a small pointing hand).
Keys `deco_*`, `glass_*`, `art_*`.

### Sheet L5: Discovery and recipe cards
* A "New Signature Recipe" celebration: a spotlight, a ring of sparkles (6 frames on a dark tile), confetti (4 frames), a ribbon banner (blank), a drumroll icon.
* Recipe card frames in 3 rarity styles, about 360 by 480 at 2x, with a window for the drink art and blank areas for the name: Classic (cream with a leaf corner), Seasonal (the season's motif corner, one style for each of the 4 seasons), Signature VIP (gold foil edge, tiny crown, shimmer overlay).
* A naming plaque (a small wood sign, blank) and a pencil icon, a "name it after a memory" heart bookmark.
* A tier chip set: Classic (leaf), Seasonal (sun), Signature (crown), 64 px each.
Keys `recipe_*`.

### Sheet L6: The menu board and Spotlight
* Menu board frame with 6 drink slots (about 720 by 960 at 2x), as an in world wall decor object and a flat UI version, with slot windows, a chalk border and a small Spotlight star ribbon.
* A Spotlight Drink banner (a ribbon with a star), a slot empty state (a dotted frame) and a slot locked state.
* Seasonal collection page: a 3 slot display shelf, and one badge per season (4) plus 4 limited decor items (one per season) for finishing a collection: Spring Blossom Lamp, Summer Citrus Cart, Autumn Maple Stand, Winter Mug Tree.
Keys `menu_*`, `collection_*`.

## 4. Café Rush Hour Manager

The view is isometric using the player's own café. These pieces are for the game layer on top of it.

### Sheet M1: Party tokens and guest states
* Party tokens for a party of 1, 2 and 4: a small round marker above the guests with person icons, 96 px. Each in neutral, seated, waiting, happy, VIP.
* Guest reaction emotes for any generic guest bubble (symbols only): wants a drink, waiting, delighted, leaving happy (a wave), thank you heart. 8 icons, 64 px.
* A guest waving goodbye, 4 frames, for the generic guest silhouette in plain clothes, tintable.
* The queue line: three guests standing in a line, front and back, and a velvet rope stanchion pair (4 views) for the Express Standing Line, plus a small "Standing Line" sign (blank ribbon).
Keys `party_*`, `guestemote_*`, `queue_*`.

### Sheet M2: Seating and table service
* Table markers: a "reserved for 2", "reserved for 4" and "fits" glow outline (a diamond on the floor on a dark tile, 3 states: neutral, matching, wrong size).
* Cozy Seating bonus: a heart sparkle for the window seat (4 frames).
* Dirty dishes on a table: 3 small prop states (cups, plates, crumbs), isometric 1 tile, 4 views. A tidy sparkle (4 frames) for a cleared table.
* Tip coin stacks on a table: small, medium, large (3 states), plus a coin collect pop (4 frames) and a floating coin trail.
* A busser cloth and a broom icon (for the table clear tap).
Keys `seat_*`, `dish_*`, `tip_*`.

### Sheet M3: Stations and stock
* Station stock gauge: a small vertical bar with an icon area, in 4 fill states (full, half, low, empty), plus a low stock amber glow (4 frame pulse) on a dark tile.
* A station slowdown icon (a snail curl) and a station helped icon (a handshake or sparkles).
* Pantry crates (4 types, isometric, 1 tile, 4 views each): Oat Milk, Matcha, Pastry Trays, Espresso Beans. A refill carry animation for a crate (carried crate overlay, 4 frames).
* The Back Pantry Storehouse: an isometric room object (2 by 2), open and closed doors, stocked shelves.
* Station overheat: the espresso machine with sparks and steam (4 frame loop), and a "vent" valve with a pressure arc (a 3 second hold meter, 4 frames), plus a cooled down puff.
* The Bulk Cold Brew Pitcher: a large pitcher object (isometric), pour animation (4 frames), and a "clears 3 orders" burst.
Keys `stock_*`, `crate_*`, `pantry_*`, `overheat_*`, `pitcher_*`.

### Sheet M4: VIP, QA and Duets
* VIP star crown badge for a guest, 64 px, and a VIP glow ring (4 frame pulse on a dark tile).
* The QA tap icon: a glowing sparkle over a drink, 3 sizes, a Garnish Polish animation (a cloth shine, 4 frames) and a perfect polish stars burst (4 frames).
* The Duet sparkle: two partner colors (pink and sky) twirling into a heart (6 frames on a dark tile), plus a Duet label ribbon (blank).
* Call out buttons: "Need help!" (a waving hand) and "Got it!" (a thumbs up), normal, pressed and cooldown states, and matching bubble icons that appear over the partner's side (4 frames each).
* Role badges: Floor Manager (a bell and clipboard) and Supply Lead (a crate and check), 96 px, in each partner's color.
Keys `vip_*`, `qa_*`, `duet_*`, `callout_*`, `role_*`.

### Sheet M5: Events and surges
* Tour Bus: an isometric pastel bus, 4 views, parked at the café door, plus a door open animation with guests stepping off (4 frames) and a bus honk puff.
* Event banners (blank ribbons I add text to), each with a distinct icon: Tour Bus Surge, Overheat, Rainy Day, Sunny Mood, Regular Arrives, VIP Visit. 6 banners at about 480 by 120 at 2x.
* Rainy Day overlay: a soft window rain streak overlay (transparent, tileable, 4 frames) and a few puddle ripples; Sunny Mood: a warm light shaft overlay and floating sparkles.
* A Flash Special chalkboard: frame, 30 second ring timer (a ring with 12 fill states), a promotional ribbon and a small star burst when activated.
* A Regular badge (a heart ribbon pin) and a favorite drink thought bubble (blank, 3 sizes).
Keys `event_*`, `bus_*`, `flash_*`, `regular_*`.

### Sheet M6: HUD and Shift Summary
* A shift clock: a round café clock face from 8:00 to 10:00 with a moving hand and a time ring (12 fill states), a closing bell (3 swing frames) and a "bell ring" sound wave overlay.
* Patience hearts: full, three quarter, half, quarter, empty (5 states), 32 px, plus a heart pop when a guest leaves happy.
* The Shift Summary card frame (about 640 by 800 at 2x) with rows for guests, hearts, stars, tips, VIPs and crew experience (blank), a ribbon header (blank), three big stars (empty, filled, and gold filled with shine 4 frames), a stamp "Shift complete" (blank), and a thumbnail area for the crew group photo.
* A crew group photo frame: a small group shot template with the on duty crew posed in a row (the game places the crew in it).
* The decor reward: the Golden Espresso Tamper (an isometric tamper with a stand, 4 views, gold glow overlay on a dark tile).
* Buttons: Start shift, Skip, Retry later, Done (normal, pressed, disabled).
Keys `hud_*`, `summary_*`, `reward_*`.

## 5. Guests for these features

### Sheet G1: VIP guests (companions you already own)
Hello Kitty, Miffy and Snoopy as café guests, each in the clothes of their current outfit set, front left, 216 px: walk front 4 frames and back 4 frames, sit on a chair (front left and front right), order (a thought bubble pose), delighted (jump with sparkles), waving goodbye (4 frames), holding a drink, tasting (4 frames), with their VIP star crown overlay (a small separate sprite). Keys `vip_<name>_*`.

### Sheet G2: Optional original VIP guests
If you want new VIP characters beyond the ones you own, draw 4 original characters with the same sets: a cloud bunny, a toast bear, a lantern fox and a tea cup cat. Same pose list as G1 for each. Skip this sheet if you prefer to reuse your companions.

### Sheet G3: Regulars
Six regular guests to recognize by silhouette, each with an accent color and one signature item (a book, a camera, a laptop, a knitting bag, a skateboard, a sketchbook): front walk 4 frames, back walk 4 frames, seated, a "usual" drink pose. Keys `regular_<id>_*`.

### Sheet G4: Regulars Book and Business Date
* Regulars Book: cover, page frame with a polaroid portrait window, a heart ribbon pin, a favorite drink bubble, a "gift from a regular" box (3 frames of opening).
* Business Date prompt card: a card frame with a small table for two vignette (a candle, two cups, a notebook and a pen), a ticket and a calendar icon.
Keys `regularbook_*`, `bizdate_*`.

## 6. Shared effects and small details

* Sparkles (5 sizes), hearts (3 sizes), stars (3 sizes), a soft glow ring, a pop burst (4 frames), a confetti burst (4 frames), ribbons (3 colors), coins (single, spinning 6 frames, a coin pop 4 frames), a Shell (heart shell) spinning 6 frames, the crew experience orb (3 sizes). Each on its own dark tile for the glowing ones.
* A speech bubble set (5 shapes) with no text, a thought bubble set (3 shapes), a pointing hand cursor in 4 states, a drag ghost (a faint outline) and a drop target ring.
* A soft ground shadow in 5 sizes, a footstep puff (3 frames).
* Buttons: a standard round icon button (normal, hover, pressed, disabled) in cream, matcha and blush.

## 7. Object notes

* Isometric objects use the 2:1 diamond, one tile is 128 by 64 at 2x, and draw each in 4 views (`fl`, `fr`, `br`, `bl`) unless I say one view.
* Placeable pieces for the café (the Test Kitchen counter, the menu board, the Roster Board, the pantry crates, the pitcher, the tamper, the bus) must sit inside one footprint with no overhang that would cover the guests' heads.

## 8. Checklist to run before handing a sheet back

* Every figure the same height and feet line on its sheet.
* No cell touches another or the sheet edge, and nothing is cropped.
* No checkerboard, no baked text, no glow baked into the base sprite.
* Animations laid out left to right with frame numbers.
* The key prefix and counts match the title strip.
* The palette stays pastel, the outlines stay warm brown.

## 9. Counts at a glance

* Crew: 8 characters with 3 levels, 4 views, walk (front and back, with and without a tray), 5 station loops, 10 emotes, 9 portrait busts, oopsies and promotion pieces, arrival pieces.
* Crew UI and growth: board, tokens, 4 skill icons, 3 level badges, cozy meter, crew card, mentor scene, 24 story icons, 6 treats, album and wall pieces, quiet mode scene.
* R&D Lab: room, counter, 19 ingredient jars, 2 controls sets, 3 glasses, 6 garnishes, 5 new latte art patterns, 3 recipe card styles (6 variants), menu board, 8 collection pieces.
* Rush Hour Manager: party tokens, seating and service props, stations, crates, pantry, overheat, pitcher, VIP and QA, Duet, call outs, role badges, the bus and 6 banners, rain and sun overlays, Flash Special, clock, hearts, summary card, a decor reward.
* Guests: 3 VIP companions (optional 4 new), 6 regulars, Regulars Book and Business Date.
* Shared effects and small details.

## 10. Where each sheet goes in the game (so you know why it matters)

* Crew sheets C1 to C9 and R1 to R6 power Build 44 (crew and roster).
* L1 to L6 power Build 45 (R&D Lab).
* M1 to M6 and G1 power Build 46 (Rush Hour Manager).
* G2 to G4 and the extras power Build 47 (heart and polish).

## 11. Existing art to keep consistent with

* The four staff stills `cy_staff_*` (fl, fr, br, bl), the tray overlay `cy_tray_*`, the café guests `cx_p_*` (standing and seated), the walk guests `cy_granny`, `cy_mail`, `cy_cam`, `cy_coffee`, the ingredient jars in Matcha Masters (`mg_ing_*`), the latte art studio, the Matcha Masters interface (`mm_*`), and the café station pieces (`cy_espresso`, whisk, pastry case, register).

## 12. Suggested drawing order

1. Build 44: C1, C2, C3, C4, C5, C6, R1, R2, R3, R4, C7.
2. Build 45: L1, L2, L3, L4, L5, L6.
3. Build 46: M1 to M6, G1.
4. Build 47: C8, C9, R5, R6, G3, G4, then G2 if wanted.
