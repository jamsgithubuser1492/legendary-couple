# Animation brief: the café crew, frame by frame

For the agents who draw the animation sheets. It lists every animation the crew needs, how many frames, which views, what is already in the game (so you do not redraw it), and exactly what is missing. Read `docs/ART_BRIEF_CAFE_CREW.md` section 0 first for the style, scale and sheet layout rules. They all still apply.

## 0. How the game plays animation (so frames fit)

* The game draws a sprite per frame and swaps frames on a timer. It does not tween between poses, so every pose must be a full drawing.
* A loop plays frame 1 to the last frame, then repeats. The last frame must flow into frame 1 with no jump.
* **Facing.** The game owns two facings per animation, **left** and **right**, and mirrors one to make the other. So draw the **front left (FL)** and **back left (BL)** views only. Front right and back right are the mirror images, so characters must be fine when flipped: keep carried items, badges and asymmetric hair readable either way.
  * Exception: a station piece that includes its own counter (work loops) needs all four views drawn, because the prop is asymmetric.
* **Same canvas for every frame of one animation.** Same canvas size, feet on the same baseline at the bottom, the body centered the same way. A walk cycle that shifts a few pixels between frames jitters in game. Draw each frame on an identical empty tile with a ground line marked on the sheet.
* **Scale.** Character 216 px tall on the sheet (the game shows them 54 px tall). Props and counters in work loops are drawn at the same scale as the character.
* **Outfit consistency (important).** Today a Skilled or Expert crew member changes outfit when they start walking, because the walk art shows one outfit. Every animation below is needed **per level look** (Apprentice L1, Skilled L2, Expert L3) so the outfit stays the same. To control the workload, section 11 lists a minimum set and a full set.
* **Timing.** Walk frames play at about 8 frames a second. Idle breaths about 2 a second. Emotes and oopsies about 6 to 8 frames a second. Work loops about 4 frames a second (slow, calm). Loops should feel calm, never frantic.
* **Sheet layout.** One animation per row, frames left to right with a frame number under each, a row label (character, state, view, level). A dark navy tile for glows and steam, on its own.

## 1. What already exists (do not redraw, but note the outfit problem)

| Animation | Frames in the game today | Notes |
|---|---|---|
| Walk front (FL) | 4 per character, 8 characters | One outfit per character, not per level |
| Walk back (BL) | 4 per character | Same |
| Carry tray front | Pip 4, Juno 4, Kenji 4, Ollie 4, Oren 2, Hana 2, Maya 2, Tan 0 | Incomplete |
| Carry tray back | 2 for most, Hana 1 | Incomplete |
| Work loops | Tan 2 frames each of 4 views, Pip FL FR only (2 frames each), Oren FL FR (2) BL BR (1), Juno FL FR BR, Hana 1 to 2 frames, Kenji FL 4, BL BR 2, Maya mixed, Ollie FL 4, BL BR 2 | Many views missing or only 1 frame |
| Emotes (still poses) | tan 4, pip 4, juno 4, kenji 4, maya 4, ollie 4, oren 4 (a sitting pose), hana 0 plus a glow | Single poses, not loops |
| Oopsies | Pip tray wobble 4, surprise 4. Hana wobble 4, dropped cup 4, sweep 4 plus 4, surprise 2 | Pip is missing a dropped cup and sweep. Hana wobble exists |
| Still level looks | 3 levels, 4 views for all 8 | Some "back" views are really front views (Juno, Kenji, Maya, Ollie, Hana at L1 and L2) |

## 2. Idle: the crew breathe (new, highest priority)

When nobody is walking, the crew stand still. They should breathe and blink.
* **Idle breathing loop:** 4 frames, FL and BL. A slow chest rise and settle, a tiny head bob, and one blink on frame 3. About 2 frames a second, so the loop lasts 2 seconds.
* **Idle variants (one extra loop each, FL only, random pick):** weight shift (4 frames), looks around (4 frames: head turns right, back, left, back), adjusts apron or hat (4 frames, shows their signature item).
* **Per character and per level (3 levels, 8 crew = 24 looks):** breathing for FL and BL at minimum (4 frames × 2 views = 8 frames per look, 192 frames), plus the 3 variants at Expert and Skilled only if time allows.
Key names: `crewanim_<id>_<level>_idle_<fl|bl>_<1..4>`, `crewanim_<id>_<level>_idle_look_<1..4>`.

## 3. Walk cycles per level (fix the outfit change)

* **Front walk (FL):** 4 frames (contact, passing, contact on the other foot, passing). Arms swing opposite to the legs. A gentle 2 px bounce on the passing frames. Tail ends feed back into frame 1.
* **Back walk (BL):** 4 frames, same rules, show the back of the outfit (the apron tie, pin or scarf tail).
* Per level: Apprentice, Skilled, Expert. The Expert looks already exist as stills.
* Total per character: 4 front + 4 back = 8 frames × 3 levels = 24 frames, 192 frames for 8 crew.
* **Walk turn:** a 3 frame quarter turn from FL to BL and back (so a crew member who changes direction does not snap). Per character at Expert only: FL to BL (3 frames) and BL to FL (3 frames).
* **Stop and start:** a 2 frame brake (foot slides, body leans back a little) and a 2 frame start. Per character at one level (all levels reuse it).
Key names: `crewanim_<id>_<level>_walk_<f|b>_<1..4>`, `crewanim_<id>_turn_<fb|bf>_<1..3>`.

## 4. Carry tray (complete the set)

* **Front carry (FL):** 4 frames, tray held in both hands at belly height, three cups on the tray. Same walk rhythm, the tray stays level and only dips a pixel on the bounce.
* **Back carry (BL):** 4 frames, the tray is hidden behind the body but the elbows and shoulders show it.
* **Pick up tray:** 4 frames (reach to the counter, lift the tray, stand). **Put down tray:** 4 frames (lower, place, hands free, small smile).
* Needed per character at all 3 levels for the loops (4 + 4 frames), and one set of pick up and put down per character (8 frames).
* Missing today: all Tan carry front, all back carries beyond 2 frames, Hana and Maya front carries beyond 2 frames, plus every pick up and put down.
Key names: `crewanim_<id>_<level>_carry_<f|b>_<1..4>`, `crewanim_<id>_pickup_<1..4>`, `crewanim_<id>_putdown_<1..4>`.

## 5. Station work loops (each station, all four views)

Each is a closed loop of 4 frames at about 4 frames a second. The character and the station piece sit on a shared floor tile, the prop is drawn in the sprite, and **all four views** (FL, FR, BL, BR) are drawn, because the counter is asymmetric.

| Station and crew | What the 4 frames show |
|---|---|
| Espresso (Oren) | 1 tamp the grounds, 2 lock in the handle, 3 pull the shot with a small steam wisp, 4 wipe the wand |
| Whisk station (Oren, Hana) | 1 whisk, 2 whisk faster, 3 lift and look at the foam, 4 taste with a small smile |
| Steaming milk (Pip) | 1 pour milk into the pitcher, 2 steam with a small cloud, 3 swirl the pitcher, 4 tap the pitcher on the counter |
| Pastry baking (Hana) | 1 roll dough, 2 cut shapes, 3 tray into the oven shelf, 4 dust with flour |
| Register (Tan, Maya) | 1 tap the screen, 2 hand over the receipt, 3 accept payment with a bow, 4 wave goodbye |
| Prep table (Ollie) | 1 chop herbs, 2 slide to the bowl, 3 stir, 4 set a finished bowl on the shelf |
| Runner counter (Kenji) | 1 grab a bag, 2 sprint step, 3 hand it to the window, 4 return step |
| Pet corner (Juno) | 1 dangle the toy, 2 the cat jumps, 3 pet the rabbit, 4 smile at the pets (the cat, rabbit and hoop are drawn with the pets) |
| Story circle (Maya) | 1 open the book, 2 read aloud with music notes, 3 turn the page, 4 hold up the picture |
| Table service (any crew) | 1 wipe the table, 2 wipe the other side, 3 straighten the chair, 4 thumbs up |

* Per crew member at their Expert level for their main station (full 4 views × 4 frames = 16 frames), and a second station per crew member as a stretch goal. Today most have only 1 to 2 frames per view and several views are missing.
* The prop pieces (counter, machine) must also be supplied **empty** (no character) in all four views as separate placeable objects, so the game can show stations with no one working.
Key names: `crewanim_<id>_work_<station>_<fl|fr|bl|br>_<1..4>`, `prop_<station>_<fl|fr|bl|br>`.

## 6. Emotes as short loops (currently single stills)

Each emote is a 4 frame loop that plays once and holds the last frame (not a continuous loop), FL view, at the Expert look. The game plays these over the portrait and in the Mentor moment.
* **Idle A / B:** 4 frames each (covered by section 2).
* **Happy:** a small bounce with a smile, 4 frames.
* **Proud:** hands on hips, chest out, chin up, 4 frames.
* **Surprised:** a hop back and eyes wide, hands up, 4 frames.
* **Shy:** a blush, hands pressed together, a small step turn, 4 frames.
* **Cheering:** both arms up, one hop, confetti-free, 4 frames.
* **Thank you bow:** 4 frames (a gentle bow and rise, used after praise and coaching).
* **Nod (listening):** 3 frames (used during a Mentor moment).
* **Eating treat:** 4 frames (take a bite, chew, smile, brush crumbs).
* **Sleepy nap (sitting):** 4 frames (slow head droop, a small "z" shape that you draw as a separate overlay).
* **Glowing:** a halo overlay loop on a dark tile, 6 frames (a soft pulse), and the glowing pose of each character stays as a still.
* **Per character:** 11 emotes × 4 frames = 44 frames. Hana is missing every emote today. Oren is missing a glow. Every character is missing the loops (only a single still exists).
Key names: `crewanim_<id>_emote_<name>_<1..4>`, `crewanim_glow_halo_<1..6>`.

## 7. Oopsies (cute, never punishing)

* **Tray wobble:** 4 frames, tilts left, tilts right, recovers, a small relieved smile. Have it for Pip and Hana already. Needed: Kenji (because he runs), Ollie and Maya as apprentices if they ever start at level 1 (draw one version for all crew in a plain look, tintable).
* **Dropped cup:** 4 frames (cup slips, tossed up, a catch with the recovering hands overlay, a cheer). Hana exists. Needed: Pip.
* **Sweep up spill:** 4 frames loop (sweep, dustpan, tip, smile). Hana exists in two views. Needed: Pip, Kenji.
* **Surprised oops:** 2 frames (eyes wide, symbol puff drawn as a shape). Pip and Hana exist (Pip 4, Hana 2).
* **Spill props:** a spreading puddle in 4 growth frames and a fading frame (so the game can play the puddle appearing and vanishing), 5 frames each in 2 colors (oat milk, matcha). Today there are three static sizes.
* **Crumbs and a tipped cup:** a 4 frame fade for each.
* Each "oops" must end in a cute recovery, never a failed or sad pose.
Key names: `crewanim_<id>_oops_<wobble|drop|sweep|surprise>_<1..4>`, `prop_puddle_<oat|matcha>_<1..5>`.

## 8. Mentor moment and promotion

* **Receiving praise:** 4 frames (a happy bounce, hands to cheeks, a blush, a nod). Needed for each of the 8 crew.
* **Receiving coaching:** 4 frames (a thoughtful nod, a finger up, a notebook jot, a smile).
* **Promotion ceremony:** a new-apron reveal. The crew member stands, a sparkle curtain wipes across (an overlay, 6 frames on a dark tile), and the outfit changes from the old level to the new level. Needed per crew member for L1 to L2 and L2 to L3: 6 frames of body animation (stand tall, turn, spin, pose, wave, hold) with the old outfit in frames 1 to 2 and the new outfit in frames 3 to 6. 16 transitions.
* **Level badge pop:** a medal that bounces in, 4 frames, for the three levels (apprentice, skilled, expert).
* **Gift or treat given:** the crew member receives a wrapped treat (4 frames: surprise, unwrap, happy, a small bow).
* **Story chapter unlock:** a book that opens with a page flip (4 frames) and a small spark overlay.
Key names: `crewanim_<id>_praise_<1..4>`, `crewanim_<id>_coach_<1..4>`, `crewanim_<id>_promo_<12|23>_<1..6>`, `fx_curtain_<1..6>`, `fx_medal_<level>_<1..4>`.

## 9. Arrival at the door and daily life

* **Arrival walk:** front walk carrying a small bag (4 frames) to the café door, a door open and close (3 frames, as a prop animation), a hello wave (4 frames), a bow (4 frames). Generic newcomers wear plain clothes and are tinted per crew member, or draw the 4 islanders (Hana, Kenji, Maya, Ollie) each in their Apprentice look.
* **Sit on a stool or chair:** sitting down (4 frames), seated idle breathing (4 frames), standing up (4 frames). FL and FR (mirrored), plus BL. Used for rest times and the Story circle.
* **Napping on the couch (Quiet Mode):** a 6 frame slow breathing loop with a small blanket rise and fall, for each crew member (FL on a couch piece), plus a "wake and stretch" 4 frame animation.
* **Dance:** a 4 frame happy sway loop for Event Night.
* **Handshake (Duet) between two crew:** 4 frames each for the pairs that have a Duet (craft with speed, charm with care, speed with charm, craft with care): 4 pairs × 2 characters × 4 frames.
* **Treat sharing:** two crew sharing a treat at a table, 6 frames per pair, same pairs.
* **Looking at the roster board:** 4 frames (point at a slot, nod, tick, smile) used when a roster starts.
Key names: `crewanim_<id>_arrive_<walk|wave|bow>_<1..4>`, `crewanim_<id>_sit_<down|idle|up>_<1..4>`, `crewanim_<id>_nap_<1..6>`, `crewanim_duet_<a>_<b>_<1..4>`.

## 10. Rush Hour Manager animation needs (for the next build)

* **Party arrival:** a 1, 2 or 4 person party walks in (4 frames each, FL and BL), and a hello wave.
* **Being seated:** a guest sits (4 frames), waits (patience idle 4 frames, with a small look at watch), is delighted (4 frames), waves goodbye (4 frames).
* **Crew at stations under stress:** a "busy" loop (4 frames, faster work), "low stock" slowdown (4 frames, a slow motion look), "helped by a friend" (4 frames, a second hand joins), "overheat vent" (4 frames).
* **Floor Manager gesture set (Partner A):** point to seat (4 frames), wave a team over (4 frames).
* **Supply Lead gesture set (Partner B):** carry crate (4 frames FL and BL), restock (4 frames), polish a drink (4 frames).
* **VIP guest animations** (Hello Kitty, Miffy, Snoopy): walk F and B (4 frames), sit (4 frames), order (4 frames), delighted jump (4 frames), tasting (4 frames), wave goodbye (4 frames).
* **Surge events:** the tour bus door opens and guests step out (6 frames), queue shuffle (4 frames), the espresso machine overheat spark loop (4 frames), a rain overlay and a sun shaft overlay (4 frames each).
Key names: `rush_*`, `vip_<name>_<state>_<1..4>`.

## 11. Priority and counts

**Must have first (the crew looks right in the café):**
1. Walk front and back per level for all 8 (section 3): 192 frames.
2. Idle breathing per level, FL and BL (section 2): 192 frames.
3. Carry front and back per level for all 8, plus pick up and put down (section 4): about 270 frames.

**Then (the crew feels alive and the mentor loop feels good):**
4. Emote loops at the Expert look (section 6): 44 frames per character, 352 frames.
5. Praise and coaching reactions, promotion transitions (section 8): about 330 frames.
6. Work loops, 4 views × 4 frames for each crew member's main station plus the empty prop (section 5): about 200 frames.

**Then (polish):**
7. Oopsies complete set (section 7), arrivals and sitting (section 9): about 400 frames.
8. Rush Hour Manager and VIP animation (section 10): about 450 frames.

Total across all sections: roughly 2,400 frames. A smaller first pass that makes the crew look right is items 1 to 3 (about 650 frames).

## 12. Gemini prompt template for an animation sheet

"A cozy pastel chibi animation sheet for the game Our Little World. Character: [name, role, outfit level, signature items and colors]. Draw a strict grid on flat cream paper. Row 1: [animation name] front left view, [N] frames, left to right. Row 2: [animation name] back left view, [N] frames. Every cell is the same size, the character is exactly 216 px tall, feet on the same ground line marked on the sheet, body centered, nothing cropped, 24 px gap between cells. Frame 1 and frame [N] connect so the loop is smooth. Thin warm brown outline, soft upper left light, soft pink ground shadow, no fake transparency checkerboard, no text on the art. Label each row and number each frame underneath. Draw glows, steam, sparkles and shadows on their own dark navy tile, not on the character."

## 13. Checklist before handing back a sheet

* Same canvas, same feet line, same size across every frame of an animation.
* The loop closes (last frame leads into the first).
* Left facing views only, unless it is a station piece (all four views).
* The outfit matches the level in the row label.
* Counts match the lists above, and frames are numbered.
* No baked text, no checkerboard, no glow baked into a character.
