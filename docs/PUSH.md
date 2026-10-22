# Turning on push reminders

Push reminders send your partner one small, kind nudge when you leave something for them, like a goal to approve or a question you answered. The game does the deciding, and a tiny server function does the sending. You set it up once. It takes about 20 minutes and no coding.

What you get, once it is on:
* One notification per kind of thing, at most one every 3 hours, at most 6 a day, and several new things are folded into one message.
* Quiet hours on the receiving phone (22:00 to 08:00 by default, changeable in the Us panel).
* Nothing is sent when you play solo, and nothing is sent about things your partner already knew about.

## Before you start

You need your Supabase project (the same one the game already uses) and the GitHub repository.

## Step 1: make your key pair

On your computer, open a terminal in the project folder and run:

```
npx web-push generate-vapid-keys
```

It prints a **Public Key** and a **Private Key**. Keep both. The public key is safe to put in the app. The private key is a secret: never paste it into the game code or into a message.

## Step 2: add the secrets to Supabase

In the Supabase dashboard, open **Edge Functions**, then **Secrets** (or Project Settings, then Edge Functions, then Secrets) and add three:

* `VAPID_PUBLIC_KEY` = the public key from step 1
* `VAPID_PRIVATE_KEY` = the private key from step 1
* `VAPID_SUBJECT` = `mailto:` followed by your email, for example `mailto:you@example.com`

Supabase already provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to functions. You do not need to add those.

## Step 3: add the new table

Open the **SQL Editor**, paste the whole of `supabase/schema.sql` (it is safe to run again), and press Run. The part at the bottom creates the `push_subscriptions` table.

## Step 4: add the function

Easiest way, in the dashboard: **Edge Functions**, **Deploy a new function**, name it exactly `notify`. Paste the contents of `supabase/functions/notify/index.ts` as the main file. Add a second file called `logic.ts` and paste `supabase/functions/notify/logic.ts` into it. Deploy.

Alternative with the command line (if you use the Supabase CLI): `supabase functions deploy notify --project-ref YOUR-PROJECT-ID`.

## Step 5: add the public key to the app

In GitHub, open the repository, then **Settings**, **Secrets and variables**, **Actions**, **New repository secret**:

* Name: `VITE_VAPID_PUBLIC_KEY`
* Value: the public key from step 1

Then push any change to `main`, or open the **Actions** tab and re run the Deploy workflow, so the app is rebuilt with the key. For local testing, copy `.env.example` to `.env.local` and fill in `VITE_VAPID_PUBLIC_KEY` too.

## Step 6: install the app and turn reminders on (on each phone)

* **iPhone (iOS 16.4 or newer):** open the game in Safari, tap Share, then **Add to Home Screen**. Open the game from the new icon. iPhones only allow reminders from the installed app.
* **Android:** open the game in Chrome. You can also install it from the menu (Install app), which makes reminders more reliable.

Then open **Us** (tap your name at the top left), scroll to **Reminders**, and tap **Enable reminders**. Allow notifications when asked. Make sure you are connected to your shared room first. Tap **Send me a test**: a notification should arrive within a few seconds. Do this on both phones.

## Troubleshooting

* **"Reminders are not set up for this copy of the game yet"**: the public key was not in the build. Check step 5, then redeploy.
* **"Connect your shared room above first"**: reminders are saved per room, so connect the room code on that phone first.
* **"Needs Home Screen" on iPhone**: you opened it in Safari. Use the Home Screen icon instead.
* **"Blocked in your browser settings"**: allow notifications for the site in the browser or phone settings, then reopen the Us panel.
* **The test never arrives**: in Supabase, open Edge Functions, notify, **Logs**. "push keys are not set" means step 2. "no subscribed phone" means the phone did not save (check the room and that `push_subscriptions` exists). A quiet hours window that includes now also blocks real reminders, but not the test.
* **Reminders arrive late or not at all on Android**: battery saver can pause the browser. Allow the app to run in the background.
* **Old reminders keep coming after Turn off**: tap Turn off again, and the server also removes any phone that reports it is gone.

## What was tested here, and what was not

Tested in a headless browser and with unit tests:
* The service worker registers, activates, and the game loads again with the network switched off.
* The Reminders panel in each state (blocked, off, on), turning on, the quiet hours chips, and Send me a test making the right call.
* The "partner is waiting" rules for goals to approve, the daily question, whispers, blind box requests, surprises, weekly goal ticks and café events.
* That one new goal for your partner makes exactly one request to the notify function, with the debounce, the 3 hour, 6 a day and solo rules.
* The quiet hours, rate limit, request checks and message building of the server function.

**Not tested** (needs your real project and real phones): a real push arriving on a phone, the deployed Edge Function itself, iPhone Home Screen behavior, and Supabase row permissions. The function was written for the Supabase Edge runtime and type checked only by reading, so deploy errors in step 4 are the most likely thing to need a second look.

## Privacy note

A push address is a private link that only the server holding your private key can send to. The table currently uses the same open access policy as the rest of the game's tables; the planned security build will tighten it for everything at once.
