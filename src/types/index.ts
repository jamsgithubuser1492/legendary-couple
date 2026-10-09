export type StartingPath = 'rv' | 'shop' | 'home';

export type LifeArea =
  | 'romance'
  | 'body'
  | 'mind'
  | 'soul'
  | 'friends'
  | 'family'
  | 'money'
  | 'mission';

export type QuestStatus = 'IN_PROGRESS' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';

export type PlayerId = 'A' | 'B';

export interface QuestReward {
  coins: number;
  gems: number;
  itemId?: string;
  blindBoxes?: number;
}

export interface Quest {
  id: string;
  title: string;
  area: LifeArea;
  description?: string;
  assignedTo: PlayerId;
  status: QuestStatus;
  reward: QuestReward;
  recurring?: boolean;
  milestone?: boolean; // approved milestones can be captured in the Memory Journal
  createdAt: number;
  completedAt?: number;
  evidenceNote?: string;
  evidencePhoto?: string; // small data URL
  reviewNote?: string;
  reviewedAt?: number;
}

export interface InventoryItem {
  id: string; // catalog id
  count: number; // owned and not currently placed
}

export interface PlacedObject {
  id: string;
  itemId: string;
  tileX: number;
  tileY: number;
  rotation: 0 | 90 | 180 | 270;
}

export interface Memory {
  id: string;
  title: string;
  note?: string;
  photo?: string; // small data URL
  date: number;
  author: PlayerId;
  questId?: string;
  tileX: number; // where the plaque stands on the island
  tileY: number;
}

export type CompanionId = 'kitty' | 'miffy' | 'snoopy' | 'dog';

export interface Wardrobe {
  owned: string[]; // outfit ids
  equipped: Record<CompanionId, string>;
  invited: CompanionId[]; // companions currently on the island
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface BlindReward {
  kind: 'item' | 'outfit' | 'gems' | 'coins';
  refId?: string;
  amount?: number;
  rarity: Rarity;
  duplicate?: boolean;
}

export interface Reveal {
  id: string;
  reward: BlindReward;
  ts: number;
}

export interface Checkin {
  A?: string;
  B?: string;
  paid?: boolean;
}

export interface GameState {
  startingPath: StartingPath | null;
  coins: number;
  gems: number;
  xp: number;
  names: Record<PlayerId, string>;
  quests: Quest[];
  inventory: InventoryItem[];
  placed: PlacedObject[];
  memories: Memory[];
  avatars: Record<PlayerId, { x: number; y: number }>;
  wardrobe: Wardrobe;
  blindBoxes: number;
  pendingBox: { by: PlayerId } | null; // one partner has asked to open a box together
  lastReveal: Reveal | null;
  checkins: Record<string, Checkin>; // keyed by local date, YYYY-MM-DD
  approvedCount: number;
  islandSize: number; // tiles per side of the home island
  starterRemoved: boolean; // the starter structure has been picked up
  ingredients: number; // café brewing ingredients
  townAvatars: Record<PlayerId, { x: number; y: number }>;
}
