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
