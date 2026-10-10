/** Daily check-in prompts. Built around love maps (knowing each other's inner world), gratitude,
 *  growth, and play. Each one is meant to start a real conversation, not just a typed answer. */
export const QUESTIONS: string[] = [
  // love maps
  'What is one small thing from this week that made you smile that I might not know about?',
  'What is something you are quietly worried about right now?',
  'Who is someone you have been thinking about lately, and why?',
  'What is a dream you have not told many people about?',
  'What song has been stuck in your head or on repeat lately?',
  'What is your favorite memory of us from the last month?',
  'What is a small thing I do that makes you feel loved?',
  'What is one thing you wish people understood about you?',
  'What did you need most this week that you did not ask for?',
  'What is a place you want us to see together, and what would we do there?',
  'What is something you are proud of that nobody has noticed?',
  'What was the best part of your day, and the hardest part?',
  'What is something new you would like to learn this year?',
  'What does a perfect lazy Sunday look like for you?',
  'What is a fear you have about the future that we could plan for together?',
  // gratitude and appreciation
  'What is one thing I did recently that you are grateful for?',
  'What is something about me that you admired this week?',
  'Who in your life are you thankful for right now, and have you told them?',
  'What is one thing about our relationship that you would never want to change?',
  'What is a moment this week where you felt really supported?',
  'What is something small that you usually take for granted that you are thankful for today?',
  'What is a quality of mine that you hope grows stronger as we grow together?',
  // growth and goals
  'What is one habit you want to build or break this month, and how can I help?',
  'What does being your best self look like this week?',
  'What is one thing you are avoiding that you could take a small step on today?',
  'How are you feeling about your sleep and energy lately?',
  'What is one personal goal that excites you, and what is the next tiny step?',
  'What is something you are learning about yourself right now?',
  'When do you feel most like yourself?',
  'What is one boundary you want to protect this week?',
  'What would make this month feel like a win for you?',
  'What is something you want to be braver about?',
  // us and the long term
  'What is one tradition you want us to start together?',
  'What does home feel like to you, and how do we build that together?',
  'What is one thing we do well as a couple that we should celebrate?',
  'What is one thing we could do to make the time apart feel easier?',
  'What is something you want more of in our relationship?',
  'What is one thing you would like us to try that we have never done?',
  'How can I make planning feel lighter for you this week?',
  'What is a decision coming up that you would like to talk through together?',
  'What is something we have overcome together that you are proud of?',
  'What does our life look like in five years in your dream version?',
  // play and fun
  'If we had a free day with no plans and no budget, what would we do?',
  'What would you order for our dream cafe menu?',
  'If our island had one secret place, what would it be?',
  'What is the cutest thing you saw today?',
  'What is a food you want to try together soon?',
  'If you could teleport us anywhere for dinner tonight, where?',
  'What movie, show or book would you like us to share next?',
  'What would be the soundtrack to our week?',
  'What outfit would you wear on the perfect date night?',
  'Which character from your favorite stories is most like us, and why?',
  'What is a silly inside joke of ours you still laugh about?',
  'What is one thing that always cheers you up?',
  'If we adopted a pet together, what would it be and what would we name it?',
  'What is something you could teach me in ten minutes?',
  'What is something you love about where I live or where you live?',
  'What would you put in a time capsule to open together in ten years?',
];

export const dateKey = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The original hashed question. Only used to show check-ins that were answered before the 50 day journey existed. */
export function legacyQuestionFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return QUESTIONS[h % QUESTIONS.length];
}

const prevKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d - 1));
};

/** Consecutive days both of you answered, counting back from today (or yesterday if today is still open). */
export function streakOf(checkins: Record<string, { paid?: boolean }>, today = dateKey()): number {
  let key = checkins[today]?.paid ? today : prevKey(today);
  let n = 0;
  while (checkins[key]?.paid) {
    n++;
    key = prevKey(key);
  }
  return n;
}

// ---------------------------------------------------------------------------------------------------------------
// The 50 day journey. Seven rotating themes, each grounded in relationship research:
//   Gratitude       Gable (capitalization and appreciation build felt security)
//   Fondness        Gottman (fondness and admiration; positive memories protect against conflict)
//   Self-Expansion  Aron (growing and trying new things together keeps closeness high)
//   Love Maps       Gottman (knowing your partner's inner world, stress and hopes)
//   Vulnerability   Aron (gradual, mutual self disclosure builds closeness quickly)
//   Playfulness     Shared play and humor
//   Alignment       Johnson (accessibility, responsiveness, engagement) and shared meaning
// ---------------------------------------------------------------------------------------------------------------
export type QTheme = 'Gratitude' | 'Fondness' | 'Self-Expansion' | 'Love Maps' | 'Vulnerability' | 'Playfulness' | 'Alignment' | 'Milestone';
export const THEME_ORDER: Exclude<QTheme, 'Milestone'>[] = ['Gratitude', 'Fondness', 'Self-Expansion', 'Love Maps', 'Vulnerability', 'Playfulness', 'Alignment'];
export const THEME_INFO: Record<QTheme, { icon: string; color: string; blurb: string; research: string }> = {
  Gratitude: { icon: '🌸', color: 'bg-pink-100', blurb: 'Appreciation that makes love feel noticed', research: 'Gable: capitalization and gratitude' },
  Fondness: { icon: '📸', color: 'bg-amber-100', blurb: 'Warm memories that keep you close', research: 'Gottman: fondness and admiration' },
  'Self-Expansion': { icon: '🌱', color: 'bg-green-100', blurb: 'New things to grow into together', research: 'Aron: self-expansion theory' },
  'Love Maps': { icon: '🗺️', color: 'bg-sky', blurb: 'Learn what is happening in their inner world', research: 'Gottman: love maps' },
  Vulnerability: { icon: '🕯️', color: 'bg-purple-100', blurb: 'Gentle, honest sharing that deepens closeness', research: 'Aron: reciprocal self disclosure' },
  Playfulness: { icon: '🎈', color: 'bg-orange-100', blurb: 'Laughter and lightness', research: 'Shared play and humor' },
  Alignment: { icon: '🤝', color: 'bg-blush', blurb: 'Feeling supported and moving as a team', research: 'Johnson: attachment and shared meaning' },
  Milestone: { icon: '🏆', color: 'bg-yellow-100', blurb: 'A celebration of the journey', research: 'Reflection and capitalization' },
};

export interface JourneyQ { day: number; theme: QTheme; prompt: string }
const q = (theme: QTheme, prompt: string): JourneyQ => ({ day: 0, theme, prompt });
const [G, F, S, L, V, P, A] = ['Gratitude', 'Fondness', 'Self-Expansion', 'Love Maps', 'Vulnerability', 'Playfulness', 'Alignment'] as const;

const BANK_RAW: JourneyQ[] = [
  q(G, 'What is one small gesture I did this past week that made you feel noticed or cared for?'),
  q(F, 'What was the very first thing you found attractive about me when we first met?'),
  q(S, 'If we could pick up a totally new hobby together with zero skill required, what would you want to try?'),
  q(L, 'What is currently the most draining or stressful thing on your mind this week?'),
  q(V, 'What is a compliment you have wanted to receive more often lately?'),
  q(P, 'If our relationship was a cozy café on our island, what would be our signature drink?'),
  q(A, 'In what ways can I best support you when you are feeling overwhelmed?'),
  q(G, 'What is a quality in me that you feel brings balance or peace to your daily life?'),
  q(F, 'What is your favorite memory of us from a trip or weekend getaway?'),
  q(S, 'What is a place in the world you have never visited that you dream of exploring together?'),
  q(L, 'What is something you have been deeply curious about or learning about recently?'),
  q(V, 'What is a fear or insecurity you used to hold that has softened since being together?'),
  q(P, 'If we had 24 hours with unlimited money and no responsibilities, what is our itinerary?'),
  q(A, 'What is a habit or routine we have built together that you hope we keep forever?'),
  q(G, 'What is one thing about our home or shared space that brings you comfort every day?'),
  q(F, 'What is a character trait of mine that you hope our future or island town reflects?'),
  q(S, 'What is a creative project or goal you would love for us to build together over the next 6 months?'),
  q(L, 'How are you currently feeling about your energy levels and work-life balance this month?'),
  q(V, 'What kind of physical touch or affection makes you feel most safe and grounded with me?'),
  q(P, 'What inside joke or funny moment between us still makes you crack up when you think about it?'),
  q(A, 'What is a shared value we hold that makes you feel like we are a truly solid team?'),
  q(G, 'What is a small choice I made recently that let you know I was thinking about you?'),
  q(F, 'When was a moment recently where you looked at me and felt a wave of pride or warmth?'),
  q(S, 'If we could build our dream living room or backyard right now, what core feature must it have?'),
  q(L, 'What is a small detail about your daily routine that I might not realize brings you joy?'),
  q(V, 'What is something sweet or romantic I can do for you when you are having a tough day?'),
  q(P, 'If we were characters in a Studio Ghibli or Sanrio film, what would our island jobs be?'),
  q(A, 'What does feeling truly understood by me look and feel like for you?'),
  q(G, 'What is one thing you appreciate about how we handle disagreements or communicate?'),
  q(F, 'What was your absolute favorite date night we have ever had, and why does it stick out?'),
  q(S, 'What is a new recipe, food, or cuisine you would love for us to cook together at home?'),
  q(L, 'What is a dream or hope you have been quietly holding onto for yourself lately?'),
  q(V, 'What is a secret dream or aspiration you have not talked about in a long time?'),
  q(P, 'What animal or pet do you think best matches my personality and energy, and why?'),
  q(A, 'Is there an area in our daily routine where you would like us to be more connected?'),
  q(G, 'What is a talent or strength of mine that you love seeing in action?'),
  q(F, 'What is a moment where we faced a challenge or hassle together and handled it as a team?'),
  q(S, 'What is a topic, book, or documentary you would be interested in exploring together?'),
  q(L, 'What is your favorite way to unwind at the end of a long day, and how can I help?'),
  q(V, 'What is a non verbal gesture I do that makes you feel deeply loved?'),
  q(P, 'If we entered a co-op game tournament on our island, what would our team name be?'),
  q(A, 'What is one promise to our relationship you want us to keep making every single day?'),
  q(G, 'What is something I did this past month that made your life noticeably easier or brighter?'),
  q(F, 'What is your favorite picture or physical memory of us from this past year?'),
  q(S, 'Where do you envision our little world and life 3 years from today?'),
  q(L, 'What treat, drink, or snack brings you instant joy when brought home unexpectedly?'),
  q(V, 'What is something you have felt grateful for about us that you have not expressed yet?'),
  q(P, 'If we designed a custom mascot for our island town, what would it look like?'),
  q(A, 'What is a tradition or ritual we have not created yet that you would love to start?'),
  q('Milestone', 'We have answered 50 days of questions together! What answer from your partner stayed with you most?'),
];
export const BANK: JourneyQ[] = BANK_RAW.map((x, i) => ({ ...x, day: i + 1 }));

/** After day 50 the journey keeps going: the same weekly rhythm, drawing on this deeper pool so nothing repeats for months. */
const POOL: Record<Exclude<QTheme, 'Milestone'>, string[]> = {
  Gratitude: [
    'What is one thing I did recently that you are grateful for?',
    'What is something about me that you admired this week?',
    'What is a moment this week where you felt really supported by me?',
    'What is something small you usually take for granted that you are thankful for today?',
    'What is one thing about our relationship that you would never want to change?',
    'Who in your life are you thankful for right now, and have you told them?',
    'What did I say or do this week that you want more of?',
    'What is a hard moment we got through that you are now thankful for?',
  ],
  Fondness: [
    'What is a silly inside joke of ours you still laugh about?',
    'What is something we have overcome together that you are proud of?',
    'What is the sweetest surprise or gesture you have ever received from me?',
    'What song reminds you of us, and what memory comes with it?',
    'What is a small ordinary moment with me that you will always remember?',
    'When did you first feel safe with me?',
    'What is something I did early on that told you I was a keeper?',
    'What is a place that now feels like ours, and why?',
  ],
  'Self-Expansion': [
    'What is one personal goal that excites you, and what is the next tiny step?',
    'What is one thing you would like us to try that we have never done?',
    'What is something you want to be braver about?',
    'What is a skill you could teach me in ten minutes?',
    'What would make this month feel like a win for you?',
    'What adventure, big or small, should we put on our list this season?',
    'What is something new about yourself you are discovering right now?',
    'What would you like us to learn together this year?',
  ],
  'Love Maps': [
    'What is something you are quietly worried about right now?',
    'What did you need most this week that you did not ask for?',
    'What is one thing you wish people understood about you?',
    'What was the best part of your day, and the hardest part?',
    'Who has been on your mind lately, and why?',
    'What is something you are proud of that nobody has noticed?',
    'How are you feeling about your sleep and energy lately?',
    'What is a thing that has been stuck in your head lately, a song, a worry or an idea?',
  ],
  Vulnerability: [
    'What is a moment you felt most alone, and what would have helped?',
    'What is something you wish you could be more honest with me about?',
    'When do you feel most loved by me, and when do you feel least?',
    'What is something about your past that shaped how you love?',
    'What is a boundary you want to protect, and how can I help protect it?',
    'What is one thing you are afraid to ask me for?',
    'What would you want me to say to you on your hardest day?',
    'What part of yourself are you still learning to accept?',
  ],
  Playfulness: [
    'If we had a free day with no plans and no budget, what would we do?',
    'What would you order for our dream café menu?',
    'If our island had one secret place, what would it be?',
    'If we adopted a pet together, what would it be and what would we name it?',
    'What would you put in a time capsule to open together in ten years?',
    'What outfit would you wear on the perfect date night?',
    'What would be the soundtrack to our week?',
    'What is the cutest thing you saw today?',
  ],
  Alignment: [
    'What is one tradition you want us to start together?',
    'What does home feel like to you, and how do we build that together?',
    'What is one thing we do well as a couple that we should celebrate?',
    'How can I make planning feel lighter for you this week?',
    'What is one thing we could do to make time apart feel easier?',
    'What is a decision coming up that you would like to talk through together?',
    'What does our life look like in five years in your dream version?',
    'What is something you want more of in our relationship?',
  ],
};

export interface DailyQ { n: number; theme: QTheme; prompt: string; custom?: { from: 'A' | 'B' } }
type CheckinMap = Record<string, { paid?: boolean; custom?: boolean }>;

/**
 * Today's question, the same for both of you. It follows the journey: the 50 day bank first, then the deeper pool in the same
 * weekly rhythm. A day you miss does not use up a question, so you never skip one. A partner's secret prompt for the day wins.
 */
export function journeyFor(key: string, checkins: CheckinMap, customs: Record<string, { from: 'A' | 'B'; text: string }> = {}): DailyQ {
  const c = customs[key];
  const n = Object.entries(checkins).filter(([k, v]) => k < key && v.paid && !v.custom).length + 1; // which question of the journey this is
  if (c) return { n, theme: 'Love Maps', prompt: c.text, custom: { from: c.from } };
  if (n <= BANK.length) return { n, theme: BANK[n - 1].theme, prompt: BANK[n - 1].prompt };
  const theme = THEME_ORDER[(n - 1) % 7];
  const pool = POOL[theme];
  return { n, theme, prompt: pool[Math.floor((n - BANK.length - 1) / 7) % pool.length] };
}

/** Kept for places that only have a date. Prefer journeyFor with the real check-in history. */
export const questionFor = (key: string, checkins: CheckinMap = {}, customs: Record<string, { from: 'A' | 'B'; text: string }> = {}) => journeyFor(key, checkins, customs).prompt;

export const tomorrowKey = (key = dateKey()) => {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + 1));
};
