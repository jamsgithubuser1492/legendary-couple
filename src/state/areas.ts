import type { LifeArea, QuestReward } from '../types';

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
  /** Suggested player, taken from the Q3/Q4 check-in. */
  suggestedFor?: 'A' | 'B';
}

// Preset habits drawn from the check-in notes and the 8 Areas of Life.
export const TEMPLATES: QuestTemplate[] = [
  { title: 'In bed by 11 PM', area: 'body', description: 'Sleep schedule reset. Lights out on time.', reward: { coins: 20, gems: 0 }, recurring: true, suggestedFor: 'B' },
  { title: 'Plan this week\'s meals or date', area: 'romance', description: 'Take full ownership of 1 or 2 weekly decisions without being asked.', reward: { coins: 40, gems: 5 }, recurring: true, suggestedFor: 'B' },
  { title: 'Zero agenda bum day', area: 'soul', description: 'A true day with no chores or errands.', reward: { coins: 50, gems: 10 } },
  { title: 'Scratch card date', area: 'romance', description: 'One spontaneous, low pressure date.', reward: { coins: 40, gems: 10 } },
  { title: 'Joint workout or walk', area: 'body', description: 'Exercise together, or sync up on a video call.', reward: { coins: 30, gems: 0 }, recurring: true },
  { title: 'Share an appreciation note', area: 'romance', description: 'Tell each other one thing you are grateful for.', reward: { coins: 15, gems: 0 }, recurring: true },
  { title: 'Review the life and finance timeline', area: 'money', description: 'Sit down in person and update the shared spreadsheet.', reward: { coins: 80, gems: 20 } },
  { title: 'Work on a personal passion project', area: 'mind', description: '30 minutes at a comfortable pace, no pressure.', reward: { coins: 20, gems: 0 }, recurring: true },
  { title: 'Call a friend or host one', area: 'friends', description: 'Keep a real connection alive.', reward: { coins: 25, gems: 0 } },
  { title: 'Call family', area: 'family', description: 'Check in with someone in the family.', reward: { coins: 25, gems: 0 } },
  { title: 'Career or grad school step', area: 'mission', description: 'One concrete step, like applications or a plan.', reward: { coins: 40, gems: 5 } },
];
