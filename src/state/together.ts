import { dateKey } from './questions';

/** ISO week key such as 2026-W41, so weekly mechanics reset together for both partners. */
export function weekKey(d = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((+t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

const hashOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

// ---------- 1. Fireside Whispers (Aron: escalating self-disclosure) ----------
export type WhisperTier = 'light' | 'medium' | 'deep';
export const TIERS: { id: WhisperTier; label: string; icon: string; blurb: string }[] = [
  { id: 'light', label: 'Light', icon: '🌤️', blurb: 'Easy and playful' },
  { id: 'medium', label: 'Medium', icon: '🌙', blurb: 'A little more personal' },
  { id: 'deep', label: 'Deep', icon: '✨', blurb: 'Honest and tender' },
];
const WHISPERS: Record<WhisperTier, string[]> = {
  light: [
    'What is a tiny thing that made you smile this week?',
    'What is your favorite way to spend a rainy day with me?',
    'What song makes you think of us?',
    'If we could eat anywhere tonight, where would you pick?',
    'What is the cutest thing I do without noticing?',
    'What is one thing you want to try together this month?',
  ],
  medium: [
    'What is a small moment from this past week where you felt loved by me?',
    'What is something you are looking forward to that you have not said out loud?',
    'When did you last feel really proud of yourself?',
    'What is a habit of mine you have grown to love?',
    'What does a perfect weekend together look like to you?',
    'What is something I do that makes hard days easier?',
  ],
  deep: [
    'What is a dream you have not talked about in a while?',
    'What is a fear you carry that I could help hold?',
    'When have you felt most understood by me?',
    'What is something you wish you could say but never find the moment for?',
    'What do you need more of from me right now?',
    'What does home mean to you, and are we building it?',
  ],
};
export const whisperQuestion = (tier: WhisperTier, day = dateKey()) => WHISPERS[tier][hashOf(day + tier) % WHISPERS[tier].length];

// ---------- 3. Co-op novelty quests with Travel Capsules (Aron: self-expansion) ----------
export interface Adventure {
  title: string;
  blurb: string;
  capsule: string; // catalog item id: a miniature of the memory for your island
}
export const ADVENTURES: Adventure[] = [
  { title: 'Visit a neighborhood you have never been to', blurb: 'Walk it end to end and find one thing you love.', capsule: 'suitcase' },
  { title: 'Cook a dish with an ingredient neither of you has tried', blurb: 'Shop for it together and rate it out of ten.', capsule: 'camp_stove' },
  { title: 'Take a 20 minute walk with no phones', blurb: 'No photos, no music. Just talk and notice things.', capsule: 'radio' },
  { title: 'Have a picnic somewhere new', blurb: 'Pack snacks, find a view and stay until sunset.', capsule: 'kitty_picnic' },
  { title: 'Try a brand new cafe and order something unfamiliar', blurb: 'Each pick a drink for the other.', capsule: 'mugs_enamel' },
  { title: 'Visit a bookstore and pick a book for each other', blurb: 'Read the first page aloud to each other.', capsule: 'books_blanket' },
  { title: 'Spend an evening stargazing', blurb: 'Find a dark spot and make one wish each.', capsule: 'telescope' },
  { title: 'Take a day trip to the beach or a lake', blurb: 'Collect one souvenir from the shore.', capsule: 'beach_set' },
  { title: 'Learn something new together for 30 minutes', blurb: 'A dance, a recipe, a language, a card game.', capsule: 'lantern_oil' },
  { title: 'Make a small bonfire or cozy firepit night', blurb: 'Tell the story of your best day this year.', capsule: 'firewood' },
  { title: 'Try a new outdoor activity', blurb: 'Kayaking, a hike, rollerblading or a bike ride.', capsule: 'surfboard_rack' },
  { title: 'Pack a cooler and go on a spontaneous mini road trip', blurb: 'Pick a direction and see where you end up.', capsule: 'cooler' },
];
export const adventureFor = (week: string, rolls: number): Adventure => ADVENTURES[hashOf(`${week}:${rolls}`) % ADVENTURES.length];

// ---------- 4. Love Map quiz (Gottman) ----------
export interface LoveQ {
  q: string;
  options: string[];
}
export const LOVE_QUESTIONS: LoveQ[] = [
  { q: 'What drink are you craving most this week?', options: ['Matcha latte', 'Iced coffee', 'Boba', 'Something warm'] },
  { q: 'What has felt most draining lately?', options: ['Work or school', 'Chores', 'Planning things', 'Being apart'] },
  { q: 'What would feel like the best break this week?', options: ['A long nap', 'A long walk', 'A movie night', 'Time with friends'] },
  { q: 'Which feels most like you right now?', options: ['Energized', 'Cozy', 'Stressed', 'Dreamy'] },
  { q: 'What are you most looking forward to?', options: ['Seeing each other', 'A trip', 'A project', 'Rest'] },
  { q: 'What do you want more of this week?', options: ['Quality time', 'Sleep', 'Fun', 'Quiet'] },
];
export const loveSet = (week: string): number[] => {
  const start = hashOf(week) % LOVE_QUESTIONS.length;
  return [0, 1, 2].map((i) => (start + i * 2) % LOVE_QUESTIONS.length);
};

// ---------- 2. Bids ----------
export type BidKind = 'wave' | 'tea' | 'flower';
export const BIDS: { id: BidKind; icon: string; label: string; text: string }[] = [
  { id: 'wave', icon: '👋', label: 'Wave', text: 'waved at you' },
  { id: 'tea', icon: '🍵', label: 'Send tea', text: 'sent you a cup of tea' },
  { id: 'flower', icon: '🌸', label: 'Drop a flower', text: 'dropped a flower at your feet' },
];
export const BID_WINDOW_MS = 30000;
