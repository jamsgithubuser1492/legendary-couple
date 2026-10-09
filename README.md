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

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # typecheck and production build
```

## Deploy

In the GitHub repo, go to Settings, Pages, and set Source to "GitHub Actions". Pushing to `main` then deploys automatically.

## Layout

* `src/game/` Phaser scene, iso math, React/Phaser event bridge
* `src/ui/` React HUD, modal, canvas container
* `src/types/` shared TypeScript types
* `public/assets/` future sprites and tilemaps
