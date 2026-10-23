# Rush Hour Manager: what art we already have and the smallest set left to draw

Goal: the least new art that still makes Café Rush Hour Manager look finished. The rule: **reuse before you draw**. Almost every piece below is either already drawn, or can be made in code from art we already own.

## 1. Already drawn and usable as is

From the VIP and surge sheet (saved, being cut now):
* **VIP guests:** Hello Kitty, Miffy and Snoopy with Woodstock: walk, sit, order, jump, taste, wave. Used both in the café now and in the rush.
* **Tour bus:** 3 frames (parked, doors open, guests stepping out). Covers the "Tour Bus Surge".
* **Queue shuffle:** 4 frames of a line of guests (including a dog guest). Covers the Express Standing Line look.
* **Espresso overheat:** the machine plus 4 spark frames. Covers the "Overheat" event.
* **Rain overlay and sun overlay:** tileable. Cover the Rainy Day and Sunny Mood events.

From the café event sheets (E1 and E2, saved, not wired yet):
* String lights (warm, pastel, mixed), rain (3 styles), event signs (Study Slam, Saturday Pet Adoption, Late Night Jazz), bunting in pink, sage and sky, music notes, sparkles, confetti.
* Props: adoption pen, pets group, toy basket, power tile, laptop clutter, Wi-Fi owl totem, record player, chai barrel, shared chalkboard.

From the crew and interface sheets:
* All eight crew (stills, walk, tray carry, several work scenes), cozy meter, skill and level badges, tokens, hearts, energy leaves, spill and crumb props.
* Matcha Masters interface (buttons, panels, hearts, ribbons, coin pop) can be reused for the rush screens, so no new panel art is needed.
* Café guests already walk and sit (granny, mail carrier, photographer, coffee guest, capybara, drone, crane).

## 2. What can be built in code from existing art (no drawing)

* **Party tokens (1, 2 or 4 guests):** a round marker made from the existing guest faces and the Matcha heart sprites.
* **Patience hearts:** the existing full, half and empty hearts.
* **Table fit highlights (matching, wrong size):** colored diamond outlines drawn in code over the floor.
* **Stock gauges:** a small bar drawn in code in the existing interface style, using the existing ingredient icons.
* **Low stock glow:** an amber pulse made from the existing sparkle sprites.
* **Duet sparkle:** a heart and the two partner colors from existing sparkles.
* **Call-out buttons ("Need help!" and "Got it!"):** the existing painted button frames plus an emoji or icon.
* **Role badges:** the existing token and skill badge art with a bell or crate emoji.
* **Event banners:** the existing ribbons (green, peach, pink) with text drawn over them.
* **Shift clock:** a round frame from the existing coin or badge art plus a code-drawn hand and arc.
* **Shift Summary card:** the existing panel and ribbon frames, stars and heart sprites.
* **Flash Special timer ring:** a code-drawn ring around the existing chalkboard prop.
* **Dirty dishes and tips on a table:** the existing cup, plate and crumb props and the coin sprite.

## 3. Genuinely missing: the short list to draw

Everything here is small. Draw these four sheets and the Rush Hour Manager is complete.

### Sheet X1: Supply and service props (isometric, 1 tile, one view is enough where it says)
1. **Four stock crates** (Oat Milk, Matcha, Pastry Trays, Espresso Beans): 4 views each, so 16 pieces. Cheaper option: draw one empty crate in 4 views and let me overlay the existing ingredient icons on the front. That is 4 pieces.
2. **Back Pantry Storehouse:** one isometric piece, 2 by 2 tiles, one view (FL), closed and open door: 2 pieces.
3. **Bulk Cold Brew Pitcher:** one piece (FL) plus a 3 frame pour. 4 pieces.
4. **Velvet rope stand pair:** 1 piece, FL and FR. 2 pieces.
5. **Dirty table state:** one table-top clutter piece (cups, plates, crumbs) in 1 view that I place over any table, plus the clean sparkle already coming from existing sprites. 1 piece.
Total: about 12 pieces.

### Sheet X2: Guests and crew animation gaps (all FL and BL only, mirrored by the game)
1. **Generic party guests:** one plain, tintable guest (FL and BL walk, 4 frames each) plus a seated pose (FL), delighted jump (4 frames) and wave (4 frames). I tint it for variety. 20 frames.
2. **Crew carry crate:** for Care and Speed crew, FL and BL, 4 frames each. 8 frames per crew member who does it. If limited to two crew (Kenji and Ollie), 16 frames.
3. **Crew "busy" work loop:** reuse existing work loops played faster. 0 new frames.
Total: about 36 frames.

### Sheet X3: Event overlays not on the new sheets
1. **Flash Special chalkboard:** an easel with a blank board (the existing shared chalkboard prop on sheet E2 already works). 0 new pieces.
2. **Express Standing Line sign:** a small blank standing sign. 1 piece.
3. **Duet link ribbon and VIP crown:** already coming from existing sparkles and the roster duet icon. 0 new pieces.
Total: 1 piece.

### Sheet X4: Reward items
1. **Golden Espresso Tamper:** the decor reward. 4 views (FL, FR, BL, BR) plus a gold glow on a dark tile. 5 pieces.
2. **Seasonal collection decor (optional, for later):** 4 limited items (one per season). Skip until the R&D Lab build.
Total: 5 pieces now.

## 4. Total new art, in the smallest honest form

* **About 20 isometric pieces and 36 character frames:** crates (1 empty crate in 4 views), storehouse (2), pitcher (4), rope stand (2), dirty table clutter (1), standing sign (1), tamper (5), plus the generic guest frames and crew crate carry.
* Everything else is reused or built in code.

Compare with the full brief in `docs/ART_BRIEF_CAFE_CREW.md` section 4, which listed about 150 pieces for Rush Hour Manager. This list is about a tenth of it.

## 5. What to skip entirely for now

* A dedicated Floor Manager and Supply Lead pose set. We show roles with a badge, not new poses.
* Separate emotes for guests beyond what already exists.
* The seasonal collection decor, until the Menu R&D Lab build.
* Extra event banners. Text on the existing ribbons is enough.

## 6. One question for you

Do you want crew to carry crates in the rush (needs the 16 to 32 crate carry frames), or would you rather the crates just appear on the station when Partner B restocks? The second option needs no new crew animation and still reads clearly.
