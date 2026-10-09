import type { LifeArea, QuestReward } from '../types';
import type { Theme } from './season';

export const AREAS: { id: LifeArea; label: string; icon: string; color: string }[] = [
  { id: 'romance', label: 'Romance', icon: '💕', color: 'bg-pink-200' },
  { id: 'body', label: 'Body', icon: '💪', color: 'bg-green-200' },
  { id: 'mind', label: 'Mind', icon: '🧠', color: 'bg-sky' },
  { id: 'soul', label: 'Soul', icon: '✨', color: 'bg-purple-200' },
  { id: 'friends', label: 'Friends', icon: '🫶', color: 'bg-orange-200' },
  { id: 'family', label: 'Family', icon: '🏠', color: 'bg-yellow-200' },
  { id: 'money', label: 'Money', icon: '💰', color: 'bg-amber-200' },
  { id: 'mission', label: 'Mission', icon: '🚀', color: 'bg-rose-200' },
];

export const areaOf = (id: LifeArea) => AREAS.find((a) => a.id === id)!;

export interface QuestTemplate {
  title: string;
  area: LifeArea;
  description: string;
  reward: QuestReward;
  recurring?: boolean;
  milestone?: boolean;
  /** Suggested player, taken from the Q3/Q4 check-in. */
  suggestedFor?: 'A' | 'B';
}

// Preset habits drawn from the check-in notes and the 8 Areas of Life.
export const TEMPLATES: QuestTemplate[] = [
  { title: 'In bed by 11 PM', area: 'body', description: 'Sleep schedule reset. Lights out on time.', reward: { coins: 20, gems: 0 }, recurring: true, suggestedFor: 'B' },
  { title: 'Plan this week\'s meals or date', area: 'romance', description: 'Take full ownership of 1 or 2 weekly decisions without being asked.', reward: { coins: 40, gems: 5 }, recurring: true, suggestedFor: 'B' },
  { title: 'Zero agenda bum day', area: 'soul', description: 'A true day with no chores or errands.', reward: { coins: 50, gems: 10, blindBoxes: 1 } },
  { title: 'Scratch card date', area: 'romance', description: 'One spontaneous, low pressure date.', reward: { coins: 40, gems: 10, blindBoxes: 1 } },
  { title: 'Joint workout or walk', area: 'body', description: 'Exercise together, or sync up on a video call.', reward: { coins: 30, gems: 0 }, recurring: true },
  { title: 'Share an appreciation note', area: 'romance', description: 'Tell each other one thing you are grateful for.', reward: { coins: 15, gems: 0 }, recurring: true },
  { title: 'Review the life and finance timeline', area: 'money', description: 'Sit down in person and update the shared spreadsheet.', reward: { coins: 80, gems: 20 }, milestone: true },
  { title: 'Work on a personal passion project', area: 'mind', description: '30 minutes at a comfortable pace, no pressure.', reward: { coins: 20, gems: 0 }, recurring: true },
  { title: 'Call a friend or host one', area: 'friends', description: 'Keep a real connection alive.', reward: { coins: 25, gems: 0 } },
  { title: 'Call family', area: 'family', description: 'Check in with someone in the family.', reward: { coins: 25, gems: 0 } },
  { title: 'Career or grad school step', area: 'mission', description: 'One concrete step, like applications or a plan.', reward: { coins: 40, gems: 5 } },
];

/** Limited-time joint event quests. One partner does it, the other verifies, like any quest. */
export const SEASON_EVENTS: Record<Theme, QuestTemplate[]> = {
  spring: [
    { title: 'Spring picnic date', area: 'romance', description: 'Pack snacks, find a spot, put the phones away.', reward: { coins: 40, gems: 10, itemId: 'blanket_spring' } },
    { title: 'Plant or tend something together', area: 'soul', description: 'A plant, a garden, a window box. Watch it grow.', reward: { coins: 30, gems: 5, itemId: 'tree_spring' } },
  ],
  summer: [
    { title: 'Beach day or sunset walk', area: 'body', description: 'Get outside together and soak it in.', reward: { coins: 40, gems: 10, itemId: 'blanket_summer' } },
    { title: 'Try a new summer treat', area: 'soul', description: 'A new boba, ice cream or matcha spot.', reward: { coins: 30, gems: 5, itemId: 'tree_summer' } },
  ],
  autumn: [
    { title: 'Cozy fall night in', area: 'romance', description: 'Blankets, warm drinks, a movie, no agenda.', reward: { coins: 40, gems: 10, itemId: 'pumpkin' } },
    { title: 'Autumn walk or apple picking', area: 'body', description: 'Get out for the fall colors.', reward: { coins: 30, gems: 5, itemId: 'blanket_autumn' } },
  ],
  winter: [
    { title: 'Warm drinks winter date', area: 'romance', description: 'Hot chocolate, tea or matcha somewhere cozy.', reward: { coins: 40, gems: 10, itemId: 'blanket_winter' } },
    { title: 'Plan next year together', area: 'mission', description: 'Write down a few shared goals for the year ahead.', reward: { coins: 50, gems: 10, itemId: 'tree_winter' }, milestone: true },
  ],
  holidays: [
    { title: 'Holiday Traditions Review', area: 'soul', description: 'Look back on the year and choose traditions to keep.', reward: { coins: 60, gems: 15, itemId: 'xmas_tree' }, milestone: true },
    { title: 'Pick gifts for each other', area: 'romance', description: 'Plan something thoughtful, not just something bought.', reward: { coins: 40, gems: 10, itemId: 'blanket_red' } },
    { title: 'Call family for the holidays', area: 'family', description: 'Reach out to someone who matters.', reward: { coins: 30, gems: 5 } },
  ],
};
