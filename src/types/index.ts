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

export interface Quest {
  id: string;
  title: string;
  area: LifeArea;
  description?: string;
  assignedTo: 'A' | 'B';
  status: QuestStatus;
  reward: { coins?: number; gems?: number; itemId?: string };
}

export interface InventoryItem {
  id: string;
  kind: 'floor' | 'wall' | 'window' | 'door' | 'furniture' | 'decor';
  count: number;
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
  level: number;
  quests: Quest[];
  inventory: InventoryItem[];
  placed: PlacedObject[];
}
