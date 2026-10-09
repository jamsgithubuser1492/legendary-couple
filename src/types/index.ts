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

export interface GameState {
  startingPath: StartingPath | null;
  coins: number;
  gems: number;
  xp: number;
  names: Record<PlayerId, string>;
  quests: Quest[];
  inventory: InventoryItem[];
  placed: PlacedObject[];
}
