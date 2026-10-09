# Art guide for Our Little World

Hand this file to whoever (or whatever) makes new sprites so everything matches the existing look.

## How sprites get into the game
1. Put source sheets in `art/source/`. Individual transparent PNGs are even better than sheets.
2. Add a line to `SPRITES` in `tools/slice_sprites.py` (name, sheet, crop box) and its on-screen width in `DISPLAY_W`.
3. Run `python3 tools/slice_sprites.py`. It cuts out the background and writes `public/assets/sprites/`.
4. Point a catalog item at the sprite in `src/state/catalog.ts` (`sprite: 'name'`).

## Style rules (taken from your sheets)
* **Perspective:** isometric, 2:1 diamond. One game tile is 64 x 32 px on screen, so draw tiles at 128 x 64 (2x) to stay crisp.
* **Lighting:** soft light from the upper left. Left faces mid tone, right faces slightly darker, tops lightest. No harsh black shadows.
* **Shadows:** a soft warm pink or brown ellipse under each object, about 15 percent opacity. The game also darkens nothing for you, so keep the baked shadow subtle.
* **Outlines:** thin warm brown outlines (not pure black), about 2 px at 2x. Cream or white inner highlights on edges.
* **Palette:** pastel and warm. Pinks (#ffd3de, #f7b8c8), sage (#c9e4b8), cream (#fff4ee), warm wood (#e3c295 to #b9854f), sky (#bfe6f2), matcha green (#9fc77a). Keep saturation low and avoid pure primaries.
* **Faces and characters:** chibi proportions (large head, tiny body), simple dot eyes, blush cheeks.
* **Canvas:** transparent PNG, tight crop, no text labels or captions touching the sprite, no cream sheet background if you can avoid it.
* **Orientation:** objects face front right by default. Walls: `wall_single` runs along the island's left edge, window and door frames run along the back right edge. Furniture with a long side (beds, sofas) has its long axis running toward the upper right.

## Sprites we still need
Priority first.
1. **RV** (starter path): front view plus campfire and awning, matching the café exterior style.
2. **Rachel walk cycle**: 4 directions x 4 frames, same layout as James in `art/source/sheet2_modular_seasonal.webp`. Today she uses 3 still poses and a hop.
3. **Idle and sit poses** for both of you (sitting on a couch or chair, holding a drink).
4. **Memory plaque** sprite (a little wooden sign with a heart), plus a frame style for photos.
5. **Floor variants**: pink tile, café checker, pastel rug, grass with flowers.
6. **Wall variants**: pastel pink, sage, brick, plus half walls and a fence.
7. **Seasonal ground and roofs**: snow on the café and house roofs, falling leaf and blossom ground decals.
8. **Blind box, gift box and coin and gem icons** for rewards.
9. **Outfits**: layered sprites so avatars can change clothes (hoodie, concert outfit, holiday sweater).
10. **Companions** that walk behind you (golden retriever, corgi, bunny), 4 directions.
11. **Hello Kitty and Miffy walk cycles** (4 directions) for wandering NPCs on the island.
12. **Day and night or sunset tint** reference so we can add a light overlay.

## A note on characters
Hello Kitty, Miffy, Snoopy, Disney and Miniso are trademarks of their owners. That is fine for a private game for the two of you. If it is ever shared publicly, swap those for original characters.
