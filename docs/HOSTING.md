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

## 2. Link both phones (Supabase, already wired in)
Your project's address and publishable key are built into the game, so there is nothing to put in GitHub secrets.
1. In Supabase open **SQL Editor**, paste all of `supabase/schema.sql`, and press **Run**. This creates the shared table. It is safe to run again.
2. Open the live game, tap your name at the top left, press **New** next to the room code, then **Connect**.
3. Press **Copy invite link** and send it to your partner. When they open it, they join your room already signed in as themselves, so nobody lands on the wrong person.
4. Everything either of you writes is kept in the **Together, Log** tab with names and dates. Messages your partner has not unlocked yet (an unanswered daily question, a whisper, an unopened thank you) stay hidden until they are.

Security note: anyone holding the room code or an invite link can open your room, so share it only with each other. A real sign in could tighten this later.

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
