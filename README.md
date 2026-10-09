# Our Little World

A couple's gamified experience that serves as a catalyst for real-world relationship growth, connection, and habit building rather than an addictive digital distraction. All in-game progress is unlocked by meaningful offline actions.

## Build 1 status: Core Interactive Foundation

* Vite + React + TypeScript + Tailwind, with Phaser 3 mounted via `useRef` and cleaned up with `game.destroy(true)`
* 10x10 isometric island drawn procedurally (no image files needed yet)
* Click or tap to walk (BFS pathing, tweened, live depth sorting), drag to pan, wheel or pinch to zoom, Center button, tile hover highlight
* Starting Path modal (RV Life, Shop & Café, Home Foundation) saved to `localStorage`, with a placeholder 2.5D structure on tile (4,4)
* GitHub Actions deploy to GitHub Pages
* Supabase placeholders for Build 2: `src/lib/supabase.ts`, `.env.example`, `supabase/schema.sql`

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
