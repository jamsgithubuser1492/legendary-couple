# Hosting and playing Our Little World

## 1. Put it online (GitHub Pages, free)
1. Merge the `claude/optimistic-planck-hwcauq` branch into `main` (open a pull request on GitHub and merge it). The deploy workflow only runs for `main`.
2. In the repo go to **Settings, Pages**, and set **Source** to **GitHub Actions**.
3. Open the **Actions** tab, wait for "Deploy to GitHub Pages" to turn green (about 2 minutes).
4. Your game lives at `https://jamsgithubuser1492.github.io/legendary-couple/`.

Notes
* Pages on a **private** repo needs a paid GitHub plan. On a free plan the repo has to be public. Public means anyone can read the code and the art, including the Hello Kitty, Miffy, Snoopy and Miniso sprites. Fine for a private hobby, but think about it before sharing the link widely.
* Your game progress is not stored in the repo, only in your browser (and in Supabase once you set it up).

### If you see a blank white page
This almost always means GitHub Pages is serving the repo's source files instead of the built game. Check **Settings, Pages, Build and deployment, Source**. It must say **GitHub Actions**, not "Deploy from a branch". After changing it, open the **Actions** tab, pick the latest "Deploy to GitHub Pages" run and press **Re-run all jobs**. A hard refresh (hold Shift while reloading) clears a cached blank page.

## 2. Link both phones (real time sync with Supabase, free)
1. Create a free project at supabase.com.
2. SQL Editor, paste the contents of `supabase/schema.sql`, run it.
3. Project Settings, API: copy the **Project URL** and the **anon public key**.
4. GitHub repo, **Settings, Secrets and variables, Actions**: add two secrets named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Re-run the deploy (Actions tab, Run workflow). The deploy bakes the keys into the build.
6. On one phone tap your name in the top left, press **New** next to the room code, then **Connect**. On the other phone type the same code and press **Connect**. Choose who is who under "I am playing as".

Security note: the starter policy lets anyone who has the room code and the public key read and write that room. Treat the room code like a password. Tightening this with sign in is on the to do list.

## 3. Install it like an app
* iPhone: open the link in Safari, Share, **Add to Home Screen**.
* Android: open the link in Chrome, menu, **Install app**.
It opens full screen with its own icon.

## 4. Try it locally
```bash
npm install
npm run dev
```
Open the address it prints. Everything works offline, saved in that browser.
