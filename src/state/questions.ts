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

/** Same question for both of you on a given day. */
export function questionFor(key: string): string {
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
