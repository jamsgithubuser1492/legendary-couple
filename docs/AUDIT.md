# Our Little World: audit and next steps

Written after Build 41 plus the edge case pass. This audit comes from reading the code, the README and the economy docs, and from the headless checks we ran during the builds. It was not a test with two real phones, and the Supabase server side was read from `supabase/schema.sql` only.

Our values, as the game states them: progress comes from real world effort, the two of you play on one team, nothing punishes you, it stays cozy, and it should help the relationship, not replace it.

## 1. What we already have

**The real world loop (the heart of the game)**
* Quest Board across 8 areas of life with peer verification: only the partner who did not do the quest can approve it. Photo and note evidence, request edits, and pay once on approval.
* Daily question on a 50 day journey, answers hidden until you both answer, a love map library, secret prompt drops.
* Together: Fireside Whispers, Reach Out, Weekly Adventure, Love Map quiz, Gratitude Tree, Surprise quests, Memory Vault and Message log.
* Weekly couple goal, streak ladder with a monthly Grace Shield, and a weekly recap.
* Economy with daily limits so rewards cannot be farmed (docs/ECONOMY.md): shared wallet, quest coin cap, goals you set for yourself pay less than goals your partner sets for you.

**The world**
* Island with a build and decorate engine, seasons, a Town map that grows with real effort, and a living sky (birds, butterflies, fireflies, weather).
* The café as its own room: themes, 4 direction furniture, staff, a rating, guests who walk in, sit and order, and a Matcha rush to serve them.
* Wardrobe and companions (Hello Kitty, Miffy, Snoopy), blind boxes opened together, the Lucky Cat and the Community Board events.

**Games (5)**
* Matcha Masters, Stellar Fishing, Crane Craze, Orchard Harvest, Pastel Co op Dash. All are cooperative, all pay under a daily cap, all have a practice partner (Mochi).

**Content scale:** about 1,500 painted sprites, sheets 1 to 109 wired, 41 builds of features.

## 2. How well we match our values

**Where we are strong**
* Team first: shared wallet, shared goals, hidden until both answer, co operative games, no leaderboards.
* No penalties: no wages, no spoilage, no punishing needs. Only smaller bonuses.
* Effort is real: the best rewards need your partner, and offline actions drive growth.
* Cozy: pastel art, no timers in fishing, calm pacing, a Pocket Phone drawer instead of a screen full of buttons.

**Where we drift from our values (worth fixing)**
1. Streaks can break. A missed day is forgiven once a month, but after that the run resets. That is a soft penalty and it pushes people to check in out of worry. Better: a streak that rests. Keep the longest run, let you resume from where you were, and celebrate returning.
2. The daily cap reads like a penalty. After 180 quest coins the pay drops to a quarter. Same money, but "reduced" feels like a loss. Better: describe it as a cozy limit and pay a small "rest day" reward for stopping.
3. No low energy mode. On a hard day (illness, grief, travel) the game asks for effort. Add a Rest Day: it counts as a check in, keeps the streak, and offers one tiny "just say hi" action.
4. The tip jar and coin pop show tips earned even after the daily coin cap, which promises more than it pays. Show what was paid.
5. Two sided honesty: a partner can see that you have pending approvals, but nothing helps them approach it kindly. A gentle "your partner finished something, take a look" is better than a red badge.

## 3. Gaps that matter most (ranked)

**A. Trust and privacy (highest priority)**
* The Supabase policy is `using (true)` on every table. Anyone holding the public key can read every room, including whispers, love map answers and photos. A six character room code is not protection when listing all rows is allowed.
* Fix: Supabase anonymous sign in plus a room membership table, so a row can only be read by the two people in the room. Until then, treat the room code like a password and do not store anything you would not want shared.
* Photos are stored inside the same JSON row as everything else (as small data URLs). Move them to Supabase Storage so rows stay small.

**B. Sync can lose data**
* The whole game state is one row, and the last phone to save wins. Only messages are merged. If you both spend coins, approve a quest or place furniture in the same second, one change can overwrite the other.
* Fix: merge per area (quests, wallet, placed items) or send small changes (operations) instead of the whole state. Start with the wallet and quest approvals.

**C. The loop needs a gentle nudge, not a nag**
* The game depends on your partner noticing a request, but there are no notifications at all. A web manifest exists, but there is no service worker, so it is not a full offline installable app.
* Add opt in reminders (web push or email) for: a pending approval, a question waiting, a surprise sealed for you. One a day at most, quiet hours, and wording that is warm. Add a service worker for offline play and fast reopen.

**D. Sound is missing entirely**
* There is no audio. It is the biggest immersion gap. Add soft UI taps, café ambience, fishing water and night crickets, a calm music loop per place, and haptics on sync moments (a perfect catch, a shared tap). Mute by default is fine on first launch, with a clear toggle.

**E. Discoverability and onboarding**
* There are over 40 features behind an 11 item drawer, and only fishing has a how to play card.
* Add a Today card on the home screen: the daily question, this week's goal, anything waiting on you, and one suggested activity. Add a first week guided journey (day 1 to 7) that unlocks things in a good order.

**F. Accessibility and calm modes**
* About 19 labelled controls in total, and reduced motion is respected only by the sky life.
* Add: a global reduced motion setting, text size scaling, color blind safe cues (the green meter band also needs a shape cue), larger touch targets, and a Calm mode in the games that widens timing windows and removes failure.

**G. Time zones**
* Day boundaries use each phone's local date. A couple in different time zones (long distance) can see different days for the daily question and weather. Store one couple time zone in the room and use it for day keys.

**H. Quality safety net**
* No automated tests live in the repository (our headless checks are in a temporary folder). CI only builds.
* Add unit tests for the pure rules (economy, weekly, cafe, questions), plus a small headless smoke test that launches each game and the café. The first load pulls about 2.4 MB of code and every sprite up front, so group sprites by scene and load them on demand.

## 4. Ways to make the experience richer (aligned with our values)

**Deepen the real world connection**
* Date night planner: pick a real date from the Weekly Adventure list, add it to a shared calendar and check it off together.
* Our Year in Review: a printable or PDF memory book from journals, milestones and the love map. A keepsake is the best reward for real effort.
* Gratitude and repair prompts after a hard day, never forced.
* Quest chains: a short story arc of three real world steps (for example "plan a trip": research, book, pack) that ends in a landmark on the island.

**Cooperation that works apart**
* Slow co op that continues while you are not both online: a shared garden or farm that grows from either partner's actions, a letter pier where one of you leaves a message for the other to read.

**Café and town**
* Delivering orders by walking the cup to the guest, guests who return and remember their favorite, the dog walker and vendor (their walk art is not wired yet), and sitting for the capybara and drone.
* Festivals tied to the real calendar, photo mode, and a gentle achievements shelf that celebrates kindness, not volume.

**Games**
* Orchard: the shake and swap visuals deserve a playtest, and the winter tree art is summer green with a tint.
* Fishing: rods, fish animations and more species per season are drawn but not wired.
* Keep every payout under the existing cap, and fix the tip jar so it shows what was paid.

## 5. Suggested next builds

**Build 42: Trust (security and sync)**
* Anonymous sign in with room membership, photos to Storage, wallet and quest merge so nothing overwrites.
* Also add a tiny test suite for the economy and weekly rules.

**Build 43: Reach (reminders, sound, install)**
* Service worker and offline, opt in warm reminders, first sound pass (UI, café, fishing, music), haptics.

**Build 44: Welcome (Today card, week one journey, Rest Day, streak that rests)**
* The home Today card, a guided first week, Rest Day mode, soft streaks, and the cozy limit wording.

**Build 45: Everyone (accessibility and calm modes)**
* Reduced motion everywhere, text scaling, color blind cues, calm game settings, couple time zone.

After that: slow co op (garden or letter pier), Year in Review book, quest chains and festivals.

## 6. Decisions only you can make
* Do you want reminders by push, email, or both (push needs the installed app on a phone)?
* How private should a room be: just the two of you, or can a trusted third person (a friend, a counselor) be invited to view some things?
* Should Rest Day be unlimited, or a few a month?
* Which matters more next: sound and polish (Build 43) or security and sync (Build 42)? Our recommendation is Build 42 first, because intimate content is stored today.
