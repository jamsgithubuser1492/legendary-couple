# Our Little World

A couple's gamified experience that serves as a catalyst for real-world relationship growth, connection, and habit building rather than an addictive digital distraction. All in-game progress is unlocked by meaningful offline actions.

## Build 1 status: Core Interactive Foundation

* Vite + React + TypeScript + Tailwind, with Phaser 3 mounted via `useRef` and cleaned up with `game.destroy(true)`
* 10x10 isometric island drawn procedurally (no image files needed yet)
* Click or tap to walk (BFS pathing, tweened, live depth sorting), drag to pan, wheel or pinch to zoom, Center button, tile hover highlight
* Starting Path modal (RV Life, Shop & Café, Home Foundation) saved to `localStorage`, with a placeholder 2.5D structure on tile (4,4)
* GitHub Actions deploy to GitHub Pages
* Supabase placeholders for Build 2: `src/lib/supabase.ts`, `.env.example`, `supabase/schema.sql`

## Build 2 status: Peer-Verification & Quest Engine

* Quest Board for the 8 Areas of Life, with preset habit templates from the Q3/Q4 check-in and custom quests
* State machine: IN_PROGRESS, PENDING_VERIFICATION, APPROVED or REJECTED. Only the partner who did not do the quest can approve it
* Optional note and photo evidence, "Request edit" with a message, and a red badge for quests waiting on you
* Rewards (coins, gems, XP and levels) pay out exactly once on approval. Recurring habits respawn
* Offline first: everything saves to `localStorage`. With Supabase configured, a room code links both phones with real time sync and an offline queue that flushes when you reconnect
* Tap your name in the top left to rename partners, switch who you are playing as (handy for solo testing), and set the room code

To turn on real time sync: create a Supabase project, run `supabase/schema.sql`, then put the URL and anon key in `.env.local` (and as repo secrets for Pages).

## Build 3 status: Building & Placement Engine

* Catalog of 19 procedural items (floors, walls, window and door pieces, furniture, decor, seasonal) in `src/state/catalog.ts`
* Inventory (the bag) plus a Decor Shop priced in coins and gems. Quests can now grant a bonus item on approval
* Decorate mode: pick an item, tap a tile to place it. A green or red ghost shows whether it fits. Rotate in 90 degree steps and pick items back up
* Collision rules in `src/state/placement.ts`: stay on the island, avoid the starter spot and avatar, no overlaps. Floors sit under objects
* Wall auto-tiling: walls join into straight runs, corners and T shapes, and windows and doors fit into any run
* Avatars walk around furniture and walls, and everything is saved in shared state, so your partner sees it live

## Build 4 status: Memory Journal (energy bar and buffs postponed)

* Memory Journal with title, note and photo, saved in shared state
* Every memory plants a heart plaque on the island shoreline. Tap a plaque to open the photo
* Quests can be flagged as milestones. When one is approved the board offers "Capture memory"

## Build 5 status: Seasons and the art pass

* The island follows the real calendar (Spring, Summer, Autumn, Winter, Holidays from Dec 1 to Jan 6), with a palette change and drifting petals, sparkles, leaves or snow
* Limited time shop items and seasonal event quests for every season. Preview a season from the "Us" panel on this device
* Your art is live: James's 4 direction walk cycle, Rachel, the café, walls, windows and doors, furniture, food, pets, landmarks and seasonal trees
* Both partners now appear on the island, and walking is saved in shared state
* Sprites are cut from `art/source/` by `tools/slice_sprites.py`. See `art/ART_GUIDE.md` for style rules and the list of sprites still needed

## Build 6 status: Blind boxes, Wardrobe, Daily question

* **Blind boxes** are opened together: one partner taps start, the other taps open, and both phones show the same reveal. Earned from scratch card dates, zero agenda days, every 5th approved quest and 7 day check-in streaks, or bought with gems. Rarities: common, rare, epic, legendary
* **Wardrobe** dresses Hello Kitty, Miffy and Snoopy in outfits you buy or win. Invite them to the island and they trot after you
* **Daily question** from a bank of 56 prompts. Answers stay hidden until you both answer, then you earn coins and gems and keep a streak. A reminder to talk it through offline
* **Wall decor** (prints, shelves, wreaths, string lights) snaps onto wall pieces, always rendered just above its wall, and comes down with it
* New art: your starter furniture, RV, camping set, wall decor and companion outfits
* Sprite edges are now defringed in `tools/slice_sprites.py`, so no pale halos

## Build 7 status: The Town map

* A zoomed out **Town** (tap the 🌍 button) that mirrors your world map: Cozy Town and Coast, Countryside and Farms, Mountain Trail and Cabin, Downtown Extension, and the Future Campus and Greenhouses
* It starts bare. Locked regions sit under mist, and the town fills with buildings, trees and walking townsfolk as your **growth** rises (approved quests, memories, daily questions and decorating)
* Generic houses, towers, barns and trees are drawn by the game, mixed with your shops, stands, farm, cabin and campus art. New arrivals pop in with a message, and each region announces itself when it opens
* The 🖼️ **dream map** shows your full panorama, with unopened regions hidden behind mist
* Tap the Home pin on the west beach to return to your island. Preview a grown town from the 🌱 panel (this device only)
* Boardwalk floors, street furniture, shops, stands, camping and farm items, and townsfolk are all in the shop

### Town backdrop (Build 7b)

* The whole world is painted and visible from the start: a sunset sky with sun and drifting clouds, a curving coastline with foam and shallow water, two wooden piers, a lighthouse on the headland, snow capped mountains, forests, farm rows and palms
* Locked regions stay visible under a soft mist, and buildings you have not earned yet show as pale previews, so you can see everything you are growing toward
* The sky and land follow the season, and the camera opens fitted to the whole map

### Build 8 status: Seamless rooms, room designs and a polished world

* Floors are painted so tiles join with no seams, walls form one continuous plastered wall with skirting and trim, and the island is a soft rounded shape with a faint grid only while decorating
* **Room Designs** in the shop: eight ready made, fully furnished rooms (Cozy Bedroom, Sunny Café Corner, Little Living Room, Matcha Kitchenette, Camper Cozy Interior, Campfire Night, Boardwalk Beach Lounge, and a limited time Holiday Cabin). Buy one, preview it as a ghost on the island (green fits, red does not), tap, and the whole room lays itself out
* Smooth gradient sea with drifting swell lines and twinkling sparkles, gentle ripple rings around the home island, and tuned sizes for trees, palms and townsfolk
* `npx esbuild tools/checkPresets.ts --bundle --platform=node --outfile=/tmp/c.cjs && node /tmp/c.cjs` checks that every room design fits

### Build 9 status: WASD walking and animated characters

* **WASD or arrow keys** walk in eight directions: W, A, S, D go north, west, south and east on screen, and two keys together go diagonally. You still slide along walls and furniture, and typing in a text box never moves you
* **James:** his 4 direction walk plus a new 7 frame side cycle for east and west. **Rachel:** a real 5 frame side cycle for east and west
* **Golden retriever:** a new companion with a real 6 frame walk cycle that sits when you stop. Invite it from the Wardrobe
* **Placeholders until more art exists:** Rachel's front and back walk uses her standing poses with a bounce, and Hello Kitty, Miffy and Snoopy bounce, sway and mirror toward the way they move. Everyone gets a gentle idle breath
* `python3 tools/slice_walks.py` cuts the walk strips from the walk sheets automatically

### Build 10 status: Consistent characters, bigger build area, a walkable and interactive town

* **James and Rachel rebuilt** from one consistent sheet: a shared east and west walk (mirrored), a walk toward the camera, and front and back standing poses. The old east and west cycles and mismatched outfits are gone
* **Expand your build area:** 10 to 12, 14 and 16 tiles, bought with coins from the Decorate bar
* **Pick up the starter:** in Decorate, Pick up, tap your starter structure. It goes into your bag and leaves a blank area
* **Walk the town:** tap the 🌍 button, then tap anywhere open or use WASD. The camera follows you and unlocked regions are walkable. Locked regions stay blocked
* **Places you can visit:** cafés let you brew drinks into placeable decor using ingredients earned from Body and Mind quests, shops open their shelves, and spots like the ice cream stand and stargazing spot hand you a date idea you can add as a quest

### Build 11 status: Painted town art and living water

* The Town now uses your new sheets: 6 house styles, a barn, a windmill, 4 apartment towers, a fountain, round, pine, blossom, maple and snowy trees (matched to the season), palms, umbrellas, a sandcastle, pine clusters, the lighthouse, pier ends and your painted mountain peaks and waterfall
* **Boats:** sailboats and fishing boats drift along the coast, turning to face their direction, bobbing on the swell with a soft wake, and dinghies sit moored at the pier
* **Water:** rolling wave crests travel in from the open sea and break on the shore, the surf foam breathes, a swash creeps up the sand, and sparkles twinkle. The coastline is a smooth curve
* The town repaints only when the season or the open regions change

### Build 12 status: Water effects and a second outfit set

* **Breaking waves:** your small, medium and large wave sprites roll in from the open sea toward the shore, curl through their frames and dissolve, scattered along the coast
* **Boat wakes and ripples:** sail and fishing boats trail your propeller and dinghy wake sprites, turned to follow their heading, with ripple rings spreading out from each boat and the moored dinghies
* The coastline orientation is fixed so the beach bands no longer spike at tight turns, and the sails and masts of the boat sprites are intact
* **Dark cap and beanie look** for James and Rachel, from the new walk sheet: separate left and right walk cycles plus front and back poses. Switch each partner's look in the Wardrobe

### Build 13 status: Park, street and rewards art

* **Seaside Park** grows into the coast as you do: duck pond, gazebo, picnic tree, flower garden, playground and a park sign, each with a real life date idea you can add as a quest. Parked pink beetle and retro van, a postbox and street bin dress the streets
* The shop has a **Park** tab (pond, fountain, tennis court, playground, gazebo, flower garden, benches, lamp posts) and more **Street** items (crosswalks, cars, scooter, mailboxes, bike rack, signs)
* Your **blind box, coin and gem art** now appears on the HUD, shop, blind box screen and reveal. Reveal screens show a different box for each rarity

### Build 14 status: Together, five science backed mechanics

Open the new 💞 Together button (or tap the Gratitude Tree on your island).

* **Fireside Whispers** (Aron, escalating self-disclosure): pick a light, medium or deep question, both answer, and answers stay hidden until you both do. Earns 2 Heart Shells 🐚 each time and a 24 hour starry, firelit glow over your island. The Campfire Clearing in the mountains opens it too
* **Reach Out** (Gottman, bids for connection): send a wave, a cup of tea or a flower. If your partner taps "Turn towards" within 30 seconds, you both get a pulsing Connected aura and 5 coins each. It tracks how often you turn toward each other
* **Weekly Adventure** (Aron, self-expansion): a mystery date generator offers a novel real world task. Accepting adds a verified milestone quest that rewards a Travel Capsule prop for your island
* **Love Map quiz** (Gottman): each week you both answer three questions about your current state, then guess each other's answers. Right guesses earn shells, wrong ones reveal the truth and add a Thoughtful Gesture quest
* **Gratitude Tree** (Gable, capitalization): one thank you per person per day. Each note grows leaves and blossoms on the tree standing on your island. Opening your partner's note earns a shell, and every third unlocks floral decor
* Heart Shells can be traded 10 for a blind box

### Build 15 status: Invite link and message log

* Your Supabase project is wired in. Run `supabase/schema.sql` once in its SQL editor to create the shared table
* **Invite link:** after you connect a room, "Copy invite link" makes a link that opens the game connected to your room and signed in as your partner. The first time screens no longer appear when a saved game arrives
* **Message log:** Together, Log lists everything either of you wrote (daily answers, whispers, thank yous, memories, quest notes and review notes) with names and dates, filterable by person and type. Sealed messages stay hidden until unlocked, and the log merges between phones so a simultaneous save cannot drop a message

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # typecheck and production build
```

## Host and play

See [docs/HOSTING.md](docs/HOSTING.md) for putting it online, linking both phones and installing it on your home screens.

## Layout

* `src/game/` Phaser scene, iso math, React/Phaser event bridge
* `src/ui/` React HUD, modal, canvas container
* `src/types/` shared TypeScript types
* `public/assets/` future sprites and tilemaps


## Build 16 status: Minigames and Quadrant mechanics

* **Minigames** (`src/game/minigames/`): a MinigameManager launches Matcha Masters, Stellar Fishing, Blind Box Crane Craze and Orchard Harvest as overlay Phaser scenes. Partner A's device runs the simulation and broadcasts at 30 Hz over Supabase Realtime, partner B predicts its own inputs. Practice mode plays against the Mochi bot. Open the 🎮 Arcade button
* **Quadrant goals:** every quest carries one of 8 quadrants (Health, Career, Learning, Finance, Romance, Social, Home, Fun) and an optional If Then plan. Finishing one plays a pastel aura burst over the avatar
* **Pebble's Energy Sync:** a health goal gives both of you a Vitality Glow. When you both finish a health goal in one day, a Synergy Aura gives 1.5x coins for 24 hours, shown in a banner under the top bar
* **Focus Beacon:** start a 45 minute Deep Work session from 🌟 Our Rituals. A lantern glows over you, the game locks until the timer ends, and your partner can tap the lantern to send a tea worth +5 coins
* **Wisdom Bookshelf:** learning goals need a Key Takeaway. Each approved one adds a book or scroll, and tapping it reads the takeaway aloud
* **Dream Vault:** finance goals put half their coins in the vault, and you can add more. Fill it to build the Glass Café, Rooftop Deck or the next island expansion
* **Love Letters:** a romance goal earns a sealed bottle. Write it, and your partner finds it on the island shore (walk next to it) for 3 shells
* **Town Square:** a plaza with a fountain appears after your first approved quest. Social goals fly a celebration banner and gather visitors for 24 hours
* The full list of art still needed, and how to swap my placeholders for yours, is in `art/ASSET_WISHLIST.md`

## Build 17 status: Walking townsfolk

* **Five townsfolk with real walk cycles** (elder, photographer, hiker, sun hat man, courier) are cut from `art/source/sheet40_npc_walks.jpg` by `tools/slice_npcs.py`. They replace the old standing figures in the Town
* **Natural movement:** each person picks a destination, walks a straightened route with rounded corners, speeds up and slows down, bobs a little with each step, then stops and glances around before heading off again. They gather at the Town Square when a celebration banner is up
* **Facing follows the way they walk:** screen right uses the east view, screen left the west view (or a mirror of it), walking toward the camera uses the front view. The sheet has no back views, so walking away from the camera keeps the side view
* The sheet's own N S E W labels were wrong, so every row was checked by eye. The student row mixes six different people and was left out, and a few repeated rows were skipped
* Four more art sheets are saved in `art/source/` (sheets 36 to 39: home foundations, modular walls and floors, shore edge cases, coastal ground and water) and are not wired into the game yet

## Build 18 status: Collectibles, mechanic art and 95 new shop items

Cut from sheets 41 to 44 in `art/source/` by `tools/slice_sheets41_45.py` (210 sprites, listed in `src/game/spriteListExtra.ts`)

* **Crane figures:** all 12 collectible figures now use their own painted art, and the Crane machine shows series coloured capsules (Beach blue, Barista green, Pajama pink, Golden). Figures you have not found yet show the secret silhouette
* **Mechanic art:** painted quadrant icons on the quest board, the Focus lantern over your avatar, the sealed bottle on the island shore, the bunting over the Town Square, the Wisdom Bookshelf (5 stages by library size), the Dream Vault piggy and the blueprint, scaffolding and finished building art for the Glass Café, Rooftop Deck and island expansion
* **Together art:** painted wave, tea and flower bids (with the "turned toward you" glow on the banner), streak flames in the daily check in, and whisper card thumbnails on the Fireside tiers
* **Shop:** 95 new items across kitchen, living, bedroom, bathroom, outdoor, wall decor, pets, café and seasonal sets. The café neon sign is now a 3 star Matcha Masters reward, and the espresso machine and pumpkin use painted art
* Cut but not used yet: gratitude jars and notes, the love map card, the scratch card reveals, the campfire and star sprites, tea parachute frames, confetti and balloons. Sheets 36 to 39 and 45 (ground, shoreline, walls, floors, edge cases) are saved but not wired in
* `src/game/spriteList.ts` is now a small file that joins `spriteListBase.ts` (from `tools/slice_sprites.py`) with `spriteListExtra.ts`

## Build 19 status: Painted island, floors, walls and minigame art

* **Island ground and sea:** your seasonal ground art (spring meadow, summer grass, autumn leaves, winter snow, with winter reused for holidays) now covers the island. The lawn is grassed from day one, with a patch of bare dirt only under the starter structure. The rim is painted sand, and the ground fades from one season to the next, and the sea under the island is your painted water for the season, mirrored so it never shows a seam. `tools/slice_env.py` cuts these
* **Floors:** 16 painted floor tiles (pink tile, café checker, 3 rugs, flower meadow, stone path, parquet, cream stone, mosaic, terracotta, 3 wood stains, tatami, plush carpet) are in the shop. `tools/slice_floors.py` cuts them
* **Walls:** 8 new wall materials (pink, sage, brick, board and batten, wainscot, picket fence, hedge, glass), each with matching window and door where it makes sense. They are drawn by the game on its own wall shape, in your colours and surfaces, so they join, corner, T and cross automatically
* **Minigames:** Matcha Masters has the café interior, ingredient jars, customers and drinks. Stellar Fishing has a painted sky that follows the real time of day and painted fish, crates and bottles. The Crane has the painted claw, rail and boxes (light and heavy, in three series colours). `tools/slice_minigames.py` cuts these
* **Together:** the Fireside shows the campfire and stars, the Love Map its card and hearts, Gratitude its jar, and Adventure the scratch card icons
* Still saved but not wired in: shoreline edge pieces, depth gradients, roofs and starter growth stages, stairs and half walls, the arcade front for the town map, and sheets 46 to 47 (arcade edge cases and cabinet views)

### Build 20 status: Starter growth, seasonal walls, flatter floors

* **Starter structures grow:** the RV, Shop and Café and Home Foundation use your three stage art. Day one shows stage 1, stage 2 appears after 2 approved quests and the finished stage 3 after 6 (`starterStage` in `src/state/town.ts`). Cut by `tools/slice_starters.py`
* **Seasonal wall:** a wall, window and door that follow the season (soft green, golden, warm ochre, frosty white) and change on their own when the season changes. The 8 material walls stay as separate shop choices
* **Floors:** only the decorative pieces (rugs, mosaic, stone path, flower meadow, wood stains, tatami, carpet) use sprites. Pink tile, café checker, parquet, cream stone and terracotta are drawn by the game so they join with no seam
* Walls join into runs, corners, T junctions and crosses automatically. Roofs, stairs and the sheet 38 blend mats are not used

### Build 21 status: Civic buildings and a living Town Square

* **14 new buildings** from sheet 54 along the town's south street and downtown: bakery, school, library, pet shop, yoga studio, town hall, train station, hospital, cinema, bank, gym and fire station. Each has a date idea when you visit. Cut by `tools/slice_town.py`
* **Downtown Arcade:** opens only at town growth 150 AND player level 4 (`arcadeOpen` in `src/state/town.ts`). It is where the Crane game lives, so that game uses the same rule. Before then the building shows as a faint preview
* **Town Square:** a painted fountain, plus a bulletin board (opens the Quest Board), wishing well (10 coins for a wish), newspaper rack (opens the message log), ice cream cart, benches, clock, flower bed, drinking fountain and trash bin. Pigeons peck around the square and scatter when you walk up
* 18 of these pieces (well, stage, stalls, benches, pavilion and more) are also in the shop under Park, for your own island
* Not used yet: sheet 53 (town edge cases), sidewalk and road sprites, terrain tiles, map markers, stage states and seasonal plaza overlays

### Build 22 status: Back to the bare look, original paths, painted roads

* **Reverted** the painted leaf ground and the painted water texture. The island and the sea are the original soft pastel surfaces again, with the code's ripple lines and the plain blue water, and no deep blue halo
* **Starting paths** use your original art: the three path cards on the choice screen, and your original RV, café and home foundation as the day one starter. The later growth stages are the sheet 36 pieces
* **No stretching:** every image the minigames draw is now fitted by its own proportions (`fitBox` and `coverBox` in `src/game/minigames/base.ts`), and the crane rail tiles instead of stretching
* **Town roads** are painted: warm asphalt, a pale sidewalk and a brick curb from your road sheet's colours, and your painted cobblestone texture on the seaside promenade. They replace the old flat grey lines but follow the same curved routes
* Sheet 57 (the original start path sheet) and sheet 53 are saved in `art/source/`

### Build 23 status: Balanced economy

* All limits in `src/state/economy.ts`, explained in `docs/ECONOMY.md`. Quest coins are paid in full up to 180 a day and a quarter after that. Goals you set for yourself pay at most 30 coins, so the big rewards come from each other. Habits count once a day. 3 arcade tokens a day from quests, 120 coins per minigame (240 a day), 3 wishing well tosses a day
* Duo Day: when you both get a goal approved on the same day you earn a bonus together
* The Quest Board shows today's full pay left. New games start with 2,000 shared coins (1,000 each)

### Build 24 status: The 50 day question journey

* The daily question now follows a 50 day journey built on research: seven rotating themes (Gratitude from Gable, Fondness and Love Maps from Gottman, Self-Expansion and Vulnerability from Aron, Playfulness, and Alignment from Johnson's attachment work). The bank is in `src/state/questions.ts`
* A day you miss does not use up a question, so you never skip one. After day 50 the journey continues in the same weekly rhythm from a deeper pool of 56 more questions, with no repeats for about 8 weeks. Finishing day 50 earns a bonus box, 10 gems and 10 Heart Shells
* Answers stay hidden until you both answer, then open together. Every answer is kept in "Our Love Map library", where you can filter by theme
* Secret Prompt Drop: write tomorrow's question for the two of you. It stays hidden until tomorrow
* Voice answers are not built yet. `supabase/schema.sql` has `question_bank` and `daily_question_responses` tables, optional because the game syncs the answers already

### Build 25 status: Your original starting path art, and See on Island

* The path cards on the choice screen are cut cleanly from your original sheet (`tools/slice_paths.py`): rounded, with the tinted panel, no cut-off edges or stray hearts
* Day one on the island is your original building from each card (RV, Shop and Café, Home Foundation), cut out cleanly. It then grows into the later stages
* **See on Island:** tap the top right label ("The Shop & Café · See on island") to open your path's big island picture, the four step Build Up Over Time strip showing where you are, and a "Zoom to my build" button that flies the camera to your build

### Build 26 status: Your detailed starter designs

* The RV, the Shop & Café and the Home Foundation now use your detailed sheet (sheet 59, cut by `tools/slice_starters2.py`; the characters are ignored). The path cards, the day one building on the island and the See on Island view all use them
* They grow with the stages: stage 2 (2 approved goals) adds campfire, stools and packs for the RV, a café table and umbrella for the shop, and lumber and frames for the home. Stage 3 (6 goals) adds the duffel and toolbox, the shelf and menu board, or the wall unit and toolbox
* See on Island now draws your actual starter and its props, and lets you preview all three stages

### Build 27 status: Sunset See on Island art, and a calmer Matcha barista

* **See on Island** now opens your sunset painting for each path (`public/assets/see_island_*.webp`, originals in `art/source/`)
* **Matcha Masters barista** now layers the drink: the ticket shows the layer order with the real ingredient jars (for example Ice, Oat Milk, Matcha, Boba), and the barista taps the matching jar from a tray with one decoy. A wrong tap is a small slip, not a fail. The steam meter is slower and wider, customers wait 50 seconds, orders arrive less often, the round is 2 minutes, and the Couples Combo cheer window is 3 seconds

### Build 28 status: A calmer Stellar Fishing

* A four step how to play card opens the first time (and from the ? button, which pauses the game). Skip is always there
* Calmer pace: fewer, slower fish (and fewer while a ring or tug is on), a slower sync ring with a wider green band and kinder timing, a gentler tug of war with a bigger safe zone and 14 seconds to land it, and non-target fish fade while a ring is up
* Cleaner screen: a single hint bar that changes with the moment, names over each pier ("James (you)"), and the controls moved clear of the Finish button

### Build 29: minigame art wiring
- Matcha Masters: tip jar counter beside the timer, recipe book art in the Arcade Recipe tab.
- Fishing: aquarium tank with drifting creatures, five catchable sea species.
- Crane: figure reveal cards (frames with the figure shown, locked silhouette until won).

### Build 30: new companion outfits
- 27 new Wardrobe looks cut from the outfit sheets (`tools/slice_outfits.py`): Miffy 8, Kitty 12, Snoopy 7. They are standing sprites that use the existing bounce walk. Real walk cycles from the sheets are still to do.

### Build 31: weekly couple goal, streak ladder and weekly recap
- Our Week 📅 button (rules in `src/state/weekly.ts`, screen in `src/ui/WeeklyModal.tsx`).
- Weekly couple goal: pick one shared goal per week (Monday to Sunday). One tick a day, and the other partner confirms it. Finishing pays 60 coins, 4 gems and 3 shells once.
- Streak ladder: daily question streak rungs at 3, 7, 14, 30, 50 and 100 days pay a bonus once per run. One missed day a month is forgiven automatically (a freeze).
- Weekly recap: counts of questions, goals, gratitude notes, memories and whispers for last week and this week so far, with a one time 20 coin bonus for looking back. Empty weeks pay nothing.

### Build 32: Pastel Co op Dash (platformer minigame)
- A fifth Arcade game, unlocked with the Downtown Arcade (town growth 150 and level 4). Level 1 is The Apple Orchard Pier.
- Partner A is Hello Kitty and partner B is Miffy (they wear their equipped Wardrobe outfit). Practice mode has Mochi play the other one.
- Each phone simulates its own avatar and sends its position 20 times a second. The host keeps the shared state: apples, gift boxes, the bow aura, the lever meter, the drawbridge and the finish. Boba pearls move on a fixed schedule so nothing needs sending for them.
- Mechanics: bow glide (hold jump in the air), gift boxes, Mimmy's yellow bow aura, Gudetama trampoline, rolling boba bubbles that trap you in a bubble until your partner touches it, a checkpoint mug, two bow levers held together to lower the bridge, and the friendship archway finish.
- Rewards: 1 coin per apple plus 40 for finishing together (the economy caps a game at 120), 1 heart shell per strawberry crate.
- Level data, physics and Mochi's brain are in `src/game/minigames/platformer/level.ts`. `tools/platformer_check.ts` has two bots play the level headless to prove it can be finished.
- Fixed: the minigame manager of a destroyed game kept listening (a crash when launching in development), and two launch requests at once can no longer start two games.

### Build 33: mechanics expansion and a calmer HUD
- **Pocket Phone** 📱: the stack of round HUD buttons is now one drawer (daily question, together, postbox, memory vault, arcade, rituals, blind boxes, wardrobe, journal, decorate, town tools), with badges. The screen keeps the currency pill, the view switch, the phone and Quests.
- **In world anchors**: the Synergy Lantern on the porch (tap for the streak, and it burns unlit, pastel blue, soft pink, golden sparkle, rainbow by streak), the postbox at the gate (tap for secret surprises, an envelope floats over it when one waits), and the Sunday Covenant scroll at the Town Square.
- **Streak ladder** now pays 25, 50 + arcade token, 100 + 10 shells, 250 + a Golden Kitty figure (30 days), then 50 and 100 day rungs. Grace Shield (one missed day forgiven a month) now shows a moment.
- **Weekly goal**: 100 coins, 5 gems, 8 shells and a Weekly Memory Banner over the Town Square for three days. On a Sunday you can set next week's goal.
- **Surprise quests**: you stake 10 coins, your partner does the act (no sooner than 15 minutes later), then a sealed note unwraps for both and you earn 30 coins and 4 shells. One a day each.
- **Celebrations**: one shared `moment` in the game state drives a confetti card on both phones for goal, streak, Grace Shield, surprise and recap.
- **Memory Vault** (Together, Memory Vault tab) keeps everything written: daily answers, whispers, thank yous, bottles and surprise notes. A love letter in a bottle is now saved the moment it is sealed (the writer can reread it) and shows for the reader as soon as they open it.

### Build 34: the café interior, 4 direction furniture and a much bigger build area
- **Inside and outside are separate spaces.** Tap the café on the island (or Pocket Phone, Our café) to step in; tap the front door, or the 🚪 button, to go back out. The room is its own walled grid with its own furniture (`CafeScene`, `state/cafe.ts`), so the island and the café never mix.
- **Three room themes** from your interior sheet (Matcha Sanctuary free, Sunset Bistro and Cloud Café 400 coins each), each with its own walls and floor. The shell (back walls, windows, front door) is part of the room.
- **Bigger rooms and a bigger island.** The café grows from 8 by 8 up to 24 by 24 in six steps, and the island from 10 to 32 tiles in seven steps (costs 500 up to 18,000 coins).
- **New art** (`tools/slice_cafe.py`, 123 sprites from sheets 70 to 74): chairs, tables, plants, pastry cases, whisk station and boba rack with all four turns, the window bench, espresso station, cat clocks, frames, hanging plants, 10 floors, 24 goods and 8 customer archetypes. Rotating a four direction piece now shows its true front left, front right, back right or back left art.
- **Café that does things:** pastry cases add 10% to Matcha Masters coins (two count), the espresso station teaches a new recipe, the window bench gives a daily sit together bonus (the couple appear on the bench), the whisk station stocks the pantry each day, and matching sets plus decor raise a style score that sets a 1 to 5 star rating. An open café (a seat and a table) earns tips you collect, and little customers walk in, stand at a table or counter and leave happy or confused.
- **Goods stand on surfaces:** display goods (cakes, jars, hoodies, bulk boxes) go on tables, counters and cases.
- **The lantern and postbox moved** to the island's far back corner, so they never crowd your build space.

### Build 35: café management, wired from sheets 75 to 87
- **Art** (`tools/slice_cafe2.py`, 163 sprites): staff, ovens, fridge, register, pickup, couches, pet furniture, bakery goods, Wi-Fi router, power strips, study clutter, lucky cat, rare prizes, chalkboard signs, community board, latte art kit, plus the island lantern and postbox (now your painted versions).
- **Staff**: four hireable baristas (300 to 1200 coins, no wages). They walk the room, and each adds a perk (tips, pantry, Matcha bonus, pet bonus).
- **Latte Art Studio** (tap the espresso station): trace a cat, frog or heart. The score comes from how much of the dotted line you cover and how far you stray. Three paid pours a day, with a streak multiplier.
- **Lucky Cat** (tap it): one free pull a day, then 40 coins. Rare prize guaranteed every 10th pull. Prizes include the Vintage Jukebox.
- **Community Board** (tap it): a weekly calendar of four events (Adopt-a-Pet Saturday, Study Slam Wednesday, Rainy Jazz Friday, Latte Masterclass Sunday). One of you hosts, the other joins, and both are rewarded. Adopt-a-Pet raises your café's popularity for good.
- **Chalkboard** (café panel): pick a message to draw in certain guests, with a small tip boost.
- **Rating** now includes sofas, pets, the kitchen pair (oven and fridge stock the pantry), register (+15% tips), Wi-Fi and power. All tip bonuses multiply together (`tipMult`).

### Build 36: couple art, townsfolk, and a full art and design check
- **No more clipped art.** Every café cut (`slice_cafe`, `slice_cafe2`, `slice_cafe3`, `slice_outfits`) now cuts with extra room and keeps only the main piece. This recovered the fridge, sofas, chairs, cups, lanterns and more that had lost an edge. The unusable prize bubbles were dropped.
- **New art** (`tools/slice_cafe3.py`, 62 sprites): working together poses, memory wall, guest book, time capsule and plaque, photo frames, surprise gift box, vase and note, invite and waiting banners, townsfolk (12), celebration visitors and families.
- **Events are always a team effort and never punishing:** a room that is not fully ready now earns half the bonus instead of being blocked, Study Slam is capped, and every event offers a Surprise Me idea. Celebrations show the couple (high five, toast) instead of an emoji.
- **Gift boxes and vases** appear on a café table when a surprise is waiting for you or sent by you. Townsfolk drop in as café guests. Memory pieces are café decor with style points.

### Build 37: couple poses, walking guests, and the last unplaced art
- **Couple poses** (`tools/slice_cafe4.py`, sheet 88): 10 emotes, couple poses, 13 activity poses and 9 duo scenes.
  - Bids: Reach now has 7 kinds (wave, tea, flower, hug, blow a kiss, high five, cheer), and the new ones float over the island as your couple emotes.
  - Activity cards: each area of life shows its pose on the Quest Board and in Our Rituals, and each Arcade game shows its pose.
  - Duo scenes: a different one tops the weekly recap.
- **Walking guests:** café customers now use their real step frames (front, side and from behind, mirrored for direction). Eight townsfolk walk using their front and back views. Four townsfolk (old man, postal worker, vendor, dog walker) keep standing poses because their views were not clear enough to cut.
- **Placed:** the team work poses (one per event), star rows (café rating, game results), the result frame, confetti and the waiting and invite banners.

### Build 38: one scale for the café, and recut base pieces
- The service counter, pastry cases, shelves, chairs, tables, menus, food, plants and lamp from sheets 6 and 8 were recut with extra room (`tools/recut_cafe_base.py`), so no edge or corner is lost. The counter gained its missing front corner.
- `displayWidth()` in `placedRender.ts` sets one scale for the café: people about 54 px tall, chair seats at their knee, tables at their waist. Guests, staff and walkers now share the same height.
- Guests walk with a 4 step frame swap per tile, a soft shadow that follows them, and depth sorting.
- Cutesy café backdrop: a pastel gradient, soft glow, polka dots, scalloped bunting and drifting little leaves, hearts or clouds that follow the room theme (Build 38).

### Build 39: serving guests (café orders and the Matcha rush)
- Guests who sit down place an order: a drink, a drink plus a pastry (only if a pastry good stands on a pastry case, and goods are never used up), or sometimes a pastry on its own. Orders wait on the Orders rail (🧾 button in the café, or tap a guest) with no timers.
- Take the orders you want, then Start the rush. It launches Matcha Masters with those orders as the tickets (up to four). In a rush nobody leaves unhappy. Pastry orders add a "Plate it" step for the Sous Chef before the Barista serves. Roles swap every rush.
- Finished orders leave the rail and the round's tips pay as usual (still under the daily Matcha cap, with your café bonuses). A clean rush shows the high five.

### Build 40: Stellar Fishing art
- Eight new fish species join the pool (salmon, koi carp, angelfish, sea slug, crab, perch, grouper, eel), twelve in all. They swim both ways and the glowing halo marks the two player fish as before.
- The pier is now a painted cross section: planks and posts above, water, sunbeams and seabed below. It follows the time of day (day, golden hour, night).
- Bobbers are painted (shell for partner A, glowing stardust for partner B) and swap to a bite frame while a ring or tug is on. Casting makes an entry splash and a ring that spreads.
- Cuts come from tools/slice_fishing.py (fish, backdrops, bobbers, splashes). Not wired yet: the rod upgrades and fish animation sheets.

### Build 41: sky life, weather, café guests, the Orchard and the fishing finish
- Island and town maps: gulls and finches by day, butterflies in spring and summer, fireflies at night, and weather that is the same on both phones (snow in winter and holidays, light rain on some spring and autumn days). Weather is cosmetic, can be set in the Us panel, and never costs anything.
- Café: new guests with full walk cycles (an elderly woman, a postal worker, a photographer, a coffee guest) plus a capybara, a drone and a crane. Guests with seated art sit on free chairs while they order. Event days hang string lights, and Study Slam hangs its banner.
- Orchard Harvest is fully painted: seasonal backdrop, trees, fruit, the filling basket, James, Rachel and Mochi in shaking, catching, swap and win poses, and the golden shower and catch effects.
- Stellar Fishing finish: the night pier backdrop with both of you casting from the dock.
- Cuts come from tools/slice_sky_walk.py, tools/slice_orchard.py and tools/slice_fish_finish.py.
- Stellar Fishing at night now uses the full painted pier scene, and James and Rachel sit on the dock in the game itself, casting with the release frame as each line goes out.
- Stellar Fishing now always uses the full painted night pier. Matcha Masters has a new painted counter backdrop (tools/slice_matcha_bg.py), with the game panels kept on top and made see through so the scene shows.
- Matcha Masters interface is painted: stretchy panel frames, order tickets on a rail, wooden prep slots and tray tiles, pressed and off button states, a painted steam meter with a whisk marker, heart patience, a tip jar that fills, ribbons for results (tools/slice_matcha_ui.py).
- Edge case pass: weather and sky life respect reduced motion and low end phones, café guests stand up gracefully when a chair or table changes under them, minigames survive missing art, damaged snapshots, rapid taps and relaunches, and the result sheet shows coins actually paid under the daily limit.
- Build 42: sync merges instead of overwriting (counters add up, quests and furniture merge per item, saves are conditional and retry), with tests that simulate two phones. Push reminders and a service worker (offline reopen). Setup steps are in docs/PUSH.md.
- Build 43: optimized for desktop web browsers. A left dock and a Today panel, keyboard shortcuts (Q D T C G J, ? for the list), centered dialogs with Escape, Back and focus handling, wider two column screens, sharp rendering on high resolution screens, mouse wheel zoom and right drag panning, hover labels, full keyboard play for the minigames, tab title and icon badges, and a fullscreen button. Phones keep their layout.
- Build 44: the café crew. Eight original crew members (Mr. Tan, Pip, Mr. Oren, Juno, Hana, Kenji, Maya, Ollie) with skills and three levels, Mentor moments (one Praise and one Coaching to promote), treats, a 7 day Roster Board you can start on any day, Duet pairs and a team buff that also grows the passive tip pile. Crew walk, carry trays, rest, glow and sometimes wobble (never a penalty) in the café. Crew screens: Café crew in the dock and phone drawer (R key), Roster Board, Mentor moment. Cuts: tools/slice_crew.py, tools/slice_crew2.py. Rules: src/state/crew.ts, design: docs/CAFE_STRATEGY.md, art brief: docs/ART_BRIEF_CAFE_CREW.md.
- Weather is now world scaled and follows the real calendar: gentle rain in spring and autumn, snow in winter, a few summer showers, and small firefly clusters on warm evenings from late May to early September (src/state/weather.ts, tools/slice_weather.py).
- Build 45: crew animation and birds. Crew keep their own outfit while walking and carrying (per level loops, tools/slice_crew3.py, a registry that makes adding sheets cheap), work scenes for Tan, Oren and Juno, spill and crumb props that grow and fade. Birds are cut to real world scale (a gull about 34 px wide against the 54 px person, sparrows about 9 px, butterflies about 6 px): sparrow flocks that perch and take off together, soaring gulls over the water, butterflies on warm spring and summer days (tools/slice_birds.py).
- Build 46: Hello Kitty, Miffy and Snoopy visit the café as small VIP guests (about every 8 to 15 minutes), sit, order through the normal Orders rail, hop with a heart and wave goodbye. Cosmetic only. Surge pieces for the later Rush Hour Manager are cut and saved (tools/slice_vip.py).
- Build 47: saved art is now in the game. Café events have their own decor (adoption pen with pets and toy basket, Study Slam laptops, power tile and Wi-Fi owl, Jazz Night record player with notes and soft rain, chai barrel and chalkboard, bunting and confetti). Stellar Fishing has rod tiers on the dock and real swim, splash and catch effects. Orchard Harvest has fruit laden trees that shake and refill, seasonal tree looks and soft shadows. VIP guests: Miffy walks and sits, Kitty's green cardigan has a back view, Snoopy no longer walks backwards. Rush Hour props are cut and saved for later. The Menu R&D Lab art brief is docs/ART_BRIEF_RD_LAB.md.
- Build 48: the Seasonal Menu R&D Lab. Inside the café (Our Café panel, K key, a café only dock tile) the Test Kitchen opens on a painted back room with a sleeping cat. One of you is the Flavor Alchemist (jars, glass thermometer, sweetness dial, a hidden sweet spot found by gentle hints) and the other the Visual Decorator (glass, rim garnish, latte art tracing in 8 patterns), live together when you are both online. A kept drink becomes a recipe card (classic, seasonal or Signature), is named together, can link a memory, and goes on a six slot menu board that guests order from (small tip bonuses only, capped). A keepsake Recipe Book holds them all. Ingredients unlock through real effort and seasonal ones follow the real calendar. Rules: src/state/lab.ts, art cuts: tools/slice_lab.py and tools/slice_lab2.py, brief: docs/ART_BRIEF_RD_LAB.md.

