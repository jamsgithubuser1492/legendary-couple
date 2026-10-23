# The Café, led together: crew, menu lab and Rush Hour Manager

A design spec. It takes the idea list we received, keeps what fits our values, adapts what does not, and fleshes out the three big pieces: the crew you grow, the Seasonal Menu R&D Lab, and the Café Rush Hour Manager minigame. Nothing here is built yet.

Our values for this spec: the two of you lead the café as a team, nothing punishes you, nobody earns a wage or gets fired, every system gives you something to talk about, and it stays playful, never a chore. The hourly tip pile stays exactly as it is.

## 1. Audit of the idea list

**Keep as written**
* Staff are people you grow: four skills (Speed, Craft, Charm, Care), three training levels, and Mentor moments with kind, specific feedback.
* The Roster Board: you decide together who works which peak shift.
* Training shifts: playing Matcha Masters beside an apprentice trains them.
* The R&D Lab, with Classic, Seasonal and Signature rarity tiers and naming drinks together.
* The Rush Hour Manager as an asymmetric cooperative strategy minigame, contrasting with the action of Matcha Masters.
* Surge events, the closing Shift Summary card, VIP guests and the QA tap.
* The anti chore principles: grace over guilt, surprises over obligations, playful world.

**Adapt to fit our values**
* Payroll expenses become an **energy budget**: each crew member has 3 energy pips per roster. Assigning a shift spends a pip, and pips refill when you start a new roster. It is a planning puzzle, never a coin drain.
* Morale that can drop becomes a **cozy meter that only goes up**. Care raises it (break treats, Mentor moments, a thank you). If you ignore the crew, they stay at Steady. Nobody ever turns grumpy. Glowing staff add a small bonus.
* Apprentice mistakes become **cute oopsies**: a tray wobbles and you can catch it together for a small bonus. A mistake never costs anything.
* The Stockout Freeze becomes a **Low Stock slowdown**: a station that runs low glows amber and works at half speed. It never stops.
* Customers who run out of patience **leave with a wave** and no tip. Nobody leaves sad.
* Dynamic menu pricing becomes a **Spotlight Drink** you pick on the board for a boost, so there are no prices to manage.
* Hello Kitty, Miffy and Snoopy style characters appear as **VIP guests** you already have art for. The crew stays our own four people plus new islanders.
* The Supabase tables in the idea list are not needed. Our game state is one synced document that now merges changes per item, so crew, roster and recipes live inside the café data. Each recipe and crew member gets an id so two phones can edit without clashing.

**Drop**
* The Build 1 kickoff prompt (we are past Build 43), payroll, grumpy customers, dynamic pricing as a money puzzle, and any freeze or shame screens.

## 2. Leading a team together

**The crew.** Start with Mr. Tan, Pip, Mr. Oren and Juno. More islanders join as reputation grows (see Crew arrivals below). Each person has:
* A **main skill**: Speed (drinks ready faster), Craft (higher quality and a wider perfect window), Charm (guests stay patient longer, bigger tips), Care (restocks faster and cheers the team).
* A **favorite shift** (Morning Rush, Weekend Brunch, Quiet Afternoon, Event Night) and a **personal story** of three short chapters that unlock as they level.
* Three levels: Apprentice, Skilled, Expert. Their perk grows with each level.
* Energy pips (3 per roster), and a **cozy meter** from Steady to Glowing.

**Mentor moments.** A short, calm scene, once per crew member per day, from the crew card:
* Pick one of three feedback lines tied to their skill. Examples: "Thank you for staying calm during the rush" (Charm), "I noticed how neat that pour was" (Craft), "Could we try the oat milk first next time?" (a gentle suggestion, never a criticism).
* The lines model kind, specific, soft feedback. Specific praise gives a little more than generic praise.
* **Promotion needs both of you.** Training shifts fill an experience bar. To level up, one of you gives a Praise moment and the other gives a Coaching moment, because a good team has both. Then a small promotion ceremony plays.
* A crew member you ignore just stays where they are.

**Training shifts (the Mentorship Station).** Playing a Matcha rush with a crew member at the bar trains them:
* A 3 star rush gives full experience, 2 stars gives most, 1 star still gives some.
* Apprentices cause oopsies you catch together. A clean catch gives extra experience.
* Your hands on skill directly shapes their growth, which keeps Matcha Masters central.

**Roster Board.** You can open it on any day, whenever you want to start the mechanic. A roster lasts 7 days from the day you start it, then you can start a new one. You both open the board (it can be done in turns, like quest approval: one of you proposes, the other signs off). You can move people around freely during the 7 days. Energy only refills when a new roster starts:
* Slots: Weekday Rush, Weekend Brunch, Quiet Afternoon, and an Event Night when the Community Board has an event.
* Assign crew to slots. Each assignment spends one energy pip. A crew member working their favorite shift gets a happy sparkle and a bonus.
* **Duets:** certain pairs have a synergy (for example Pip's Craft with Mr. Oren's Speed). Seating the pair together on the same slot gives a Duet bonus.
* The result is a **team buff** for the week: it widens the Matcha perfect window, slows patience loss, speeds up the Rush Hour Manager baristas, or raises the tip pile fill rate. This is how the passive tip pile connects to leading the team: the pile fills faster when your crew is Glowing and well matched.

**Well being and break treats.** Crew need no breaks to avoid trouble, but treats are a lovely way to say thanks:
* Craft treats from Orchard apples and baked goods in the pantry (an apple tart, honey toast, a matcha cookie).
* Giving a treat raises the cozy meter and plays a short animation of the crew sharing it.
* Treats are optional and never required.

**Crew arrivals.** Reputation milestones (the 3, 5, 8 and 12 popularity levels) bring a new islander to the café door looking for work. They start as Apprentices with a short intro scene, so growth always feels like a welcome.

**Crew Album.** Each personal story chapter you unlock becomes a card in a keepsake album, with a short written note about the person. It is where leading together becomes memories.

**Employee of the Week wall.** Each time you start a new roster, each of you writes one real appreciation for your partner. It pins to the café wall as the Employee of the Week card and also becomes a gratitude note. This is the real world step that keeps the game tied to the relationship.

## 3. The Seasonal Menu R&D Lab

**Where and when.** The Test Kitchen counter in the café back room. It unlocks at 2 stars and a Whisk Station. It is turn based and calm, with no timers.

**Ingredients.** Each experiment uses a Base, a Flavor and a Topping from what is in your pantry, and each experiment spends a small amount of pantry ingredients (the ones you already earn from healthy goals and the Orchard).
* **Bases:** Matcha, Espresso, Earl Grey Tea, Golden Turmeric Milk (the last two are discoveries you unlock).
* **Flavors:** Strawberry, Honey, Salted Caramel, Yuzu, Lavender Honey, Apple (from Orchard Harvest), plus a seasonal flavor each season.
* **Toppings:** Boba Pearls, Cream Cheese Foam, Cherry Blossom Sprinkles, Dried Rose Petals, Edible Gold Flakes (rare).
* New ingredients come from real world effort and the games: a farm or garden goal unlocks Lavender Honey, an Orchard golden apple unlocks Apple Honey, a spring season unlocks Blossom, and so on. Nothing is bought outright.

**Two roles, one drink (swap each time).**
* **Flavor Alchemist:** moves the temperature and sweetness sliders. A soft glow pulses when the balance is close, and a chime plays at the sweet spot. Each flavor combination has a hidden sweet spot, so discovery feels like detective work.
* **Visual Decorator:** picks the glass (Mason Jar, Character Mug, Pastel To Go Cup), traces the latte art (reusing the existing Latte Art Studio), and adds the rim garnish.
* The two panels update live for each other so you can talk it through.

**Quality and rarity.** Quality is 1 to 3 stars from how close the sweet spot and the art trace were:
* 1 star: **Classic**. A tasty everyday drink.
* 2 stars: **Seasonal**. It matches the current season and draws cozy regulars.
* 3 stars with a rare topping or a seasonal flavor: **Signature VIP**. It draws VIP guests.

**Naming and memory.** A new recipe plays a short celebration and asks you to name it together. A prompt suggests naming it after a real memory ("Our First Date Sunset Matcha"). You can attach a photo or save it to the Journal as a memory. The drink art goes on your menu board as wall decor.

**The menu board.** Six slots. What you place decides what guests order, so the lab shapes the whole café:
* Custom recipes join the pool of drinks guests order, and Matcha Masters uses their layers. Each recipe is stored as a list of layers, so it works in the same rush you already play.
* A **Spotlight Drink** slot gives that drink a boost for the day. Pick it together at the Morning Huddle (see Rush Hour Manager).
* Daily experiments are limited to 3, so the lab stays a treat.

**Rarity effects (kept inside our economy).** Instead of fixed coin amounts, each tier multiplies the tip bonus of an order, and all coin income still respects the daily limits:
* Classic: normal tips.
* Seasonal: 1.4 times the tip bonus.
* Signature VIP: 2 times the tip bonus plus a Shell, and a chance that a VIP guest orders it.

**Seasonal collections.** Each season has a 3 recipe collection. Finishing it earns a limited decor item and a Crew Album card.

## 4. The Café Rush Hour Manager (full spec)

A 2 minute cooperative strategy minigame set in your own café, played from the same isometric view as the café scene. It contrasts with Matcha Masters: there you cook with your hands, here you lead the team.

**Your real café is the level.** The map is your actual café layout:
* Seats and tables come from what you placed. A party of 1, 2 or 4 needs a matching table, so decorating is strategy.
* Stations are your placed station items (espresso station, whisk station, pastry case, register). If you have not built one, a plain station stands in.
* The crew on your current roster work the stations.

**Pace and mood.** Gentle and quick, never frantic. Calm mode slows patience and spawns fewer parties. A solo practice mode has Mochi take the other role.

**Roles (swap each time you play):**

* **Partner A, Floor Manager**
  * Greets a party by tapping it, then drags it to a matching table. A 2 seater window seat for a pair gives a Cozy Seating bonus.
  * Watches patience hearts. A tap on a station sends support: the Care crew member walks over to help for 10 seconds.
  * Taps a table to clear dishes and collect the tip. Clearing fast keeps the line moving.
  * Opens the **Express Standing Line** during a surge.
* **Partner B, Supply and Quality Lead**
  * Watches each station's stock gauge (Oat Milk, Matcha, Pastry Trays, Espresso Beans). Taps the back pantry, then taps a station to restock.
  * Taps the chalkboard to start a **Flash Special** when a stock is full: a 30 second promotion that nudges guests toward that drink and raises tips.
  * Does the **VIP QA tap**: a glowing icon over the drink for a VIP. A tap in time gives a Garnish Polish and bonus Shells.

**What the crew does.** The baristas cook automatically, using their skills. Your decisions (who sits where, who gets support, what gets restocked) shape how well they do. No player makes the drinks, which is why this feels different from Matcha Masters.

**Duets.** If both of you touch the same guest or station within 2 seconds, for example A seats a VIP while B polishes their drink, a Duet sparkle plays and the bonus doubles. It rewards talking and moving together.

**Call outs.** Two big buttons, "Need help!" and "Got it!", show icons on the other's screen. Using them counts toward the Teamwork bonus and helps when you are not on a call.

**Flow and timings.**
* 0:00 Morning Huddle recap (10 seconds): choose a Spotlight Drink and see your team buff.
* 0:10 to 2:00 Rush. Parties arrive about every 5 to 8 seconds, scaled by café stars.
* 0:45 **Tour Bus Surge:** 6 guests arrive at once. A opens the Standing Line. B starts a Bulk Pitcher that clears 3 orders, spending milk stock.
* 1:15 **Espresso Machine Overheat:** the espresso station slows to half speed. A holds the vent for 3 seconds. B sends iced matcha drinks to the other station.
* Other possible events: **Rainy Day** (guests linger and tip more but need seats), **Sunny Mood** (patience lasts longer), **Regular Arrives** (a regular's favorite drink is a bonus), **VIP Visit**.
* 2:00 Closing bell and the Shift Summary.

**Rules that keep it cozy.**
* A guest at zero hearts leaves with a wave and a smile and no tip. Nothing is lost.
* Low Stock slows a station to half speed and never freezes it.
* A mistake or a missed tap only reduces the bonus. There are no negative scores.

**Scoring.** 1 to 3 stars from guests served, average hearts, QA taps, Duets and Teamwork.
* Rewards: Shells, crew experience (for the crew on duty), reputation (once a day on a 3 star shift), a chance at a decor item (the Golden Espresso Tamper from the summary card), and coins.
* Rewards are Shells, crew experience and decor, plus **small coin bonuses** that count under the existing daily minigame limit, so the economy stays calm.

**Shift Summary card.** Guests served, average hearts, stars, tips, VIPs pleased, crew experience gained, and one tiny story from the day ("Pip learned to carry two trays"). Each of you can add one line about what went well. Both lines show side by side.

**How it connects.** The Roster Board sets who works, Mentor moments train them, the R&D Lab fills the menu, Matcha Masters trains and serves, and Rush Hour Manager is where leading all of it pays off.

## 5. More ideas that fit our values

* **Regulars Book:** some guests become regulars with a favorite drink. Serving it a few times gives a cozy gift. Missing a regular costs nothing.
* **Business Date prompts:** each reputation milestone unlocks a real 20 minute planning date with a prompt about your shared goals, tying the café to real life.
* **Founders' Call:** you alternate who sets the Spotlight Drink and the weekly priority, so neither of you always decides.
* **Crew Notes:** the crew leave tiny notes on the staff board ("Pip says thanks for the praise").
* **Quiet mode:** a rest day for the café where nothing is asked of you and the crew nap on the couch.
* **Seasonal Festivals:** limited menu and decor tied to the real calendar, using the same lab and crew.

## 6. Data and rules (for building)

* All new data lives in the café state, keyed by id so the per item sync merge works: crew (id, skill, level, experience, cozy, energy, praised, coached, chapters), roster (week, slots), recipes (id, name, layers, tier, glass, art, by, memory), menu board (slots, spotlight), regulars.
* A roster stores the date it started. It ends 7 days later in the couple's time zone, and energy refills when the next roster starts. There is no fixed weekday.
* Coins from Rush Hour Manager use the daily minigame limit. Recipes and crew are not coins.
* Both minigames run like the others: partner A's phone runs the simulation, partner B sends inputs, practice mode uses Mochi.

## 7. Art needs

* **Crew:** the four existing staff plus 4 new islander portraits, each with 3 level looks (Apprentice, Skilled, Expert), idle and work poses, and a happy and a Glowing pose. Mentor moment scene art.
* **Roster Board:** a wooden board with shift slots and crew tokens, energy pip icons, a Duet icon.
* **R&D Lab:** the Test Kitchen counter, sliders and glow meter, ingredient icons for the new bases, flavors and toppings, three glass types, rim garnishes, a discovery celebration, a recipe card in three rarity styles.
* **Rush Hour Manager:** party tokens for 1, 2 and 4 guests with patience hearts, station stock gauges, a pantry crate, a Standing Line sign, Flash Special chalkboard, VIP QA glow, Duet sparkle, event banners (Tour Bus, Overheat, Rainy, Sunny), the Shift Summary card, a decor item (Golden Espresso Tamper).
* **Extras:** Crew Album cards, an Employee of the Week card, treat items, and a Regulars Book page.

## 8. Suggested build order

* **Build 44, Crew and Roster:** the crew data, Mentor moments, training from Matcha rushes, cozy meter, the Roster Board and the team buff, with the tip pile connection.
* **Build 45, R&D Lab:** ingredient unlocks, the two role crafting, naming and Journal link, the menu board, recipes in Matcha Masters and guest orders.
* **Build 46, Rush Hour Manager:** the strategy minigame using your café layout, the events, summary and rewards.
* **Build 47, Heart and polish:** the Crew Album, Employee of the Week, Regulars Book, Business Date prompts, seasonal collections and festivals.

## 9. Decisions made

* **Crew:** our own original characters. Sanrio style crew would not improve the game: the crew are the people you lead and grow, so unique personalities and their own stories matter most, original crew keep the game safe to share, and your Sanrio companions stay special as VIP guests.
* **VIP guests:** the companions you already own (Hello Kitty, Miffy and Snoopy).
* **Roster Board:** open it on any day to start it. A roster lasts 7 days from when you start it.
* **Rush Hour Manager rewards:** Shells, crew experience and decor, with small coin bonuses under the daily minigame limit.
* **Still open:** which art to draw first, the crew sheets (C1 to C6 and R1 to R3) or the R&D Lab ingredients (L2).
