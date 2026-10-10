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

export type Quadrant = 'health' | 'career' | 'learning' | 'finance' | 'romance' | 'social' | 'environment' | 'recreation';

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
  quadrant?: Quadrant; // which of the 8 quadrants this goal builds
  ifThen?: string; // implementation intention: IF it is 7 AM, THEN I will walk for 20 mins
  recurring?: boolean;
  notBefore?: number; // a repeating habit that came back: it can be done again from this time
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
  q?: string; // the question as it was asked, kept for the library
  theme?: string;
  n?: number; // which question of the journey
  custom?: boolean; // a secret prompt from your partner
}

export type WhisperTier = 'light' | 'medium' | 'deep';
export interface Whisper { tier: WhisperTier; q: string; A?: string; B?: string; paid?: boolean }
export interface Bid { from: PlayerId; kind: 'wave' | 'tea' | 'flower'; ts: number; turned?: boolean }
export interface LoveRound { answers: { A?: number[]; B?: number[] }; guesses: { A?: number[]; B?: number[] } }
export interface GratitudeNote { id: string; from: PlayerId; text: string; day: string; opened?: boolean }

export type MessageKind = 'daily' | 'whisper' | 'gratitude' | 'memory' | 'evidence' | 'review' | 'bottle';
/** Everything either partner writes, kept forever with a name and a time. */
export interface Message { id: string; from: PlayerId; kind: MessageKind; text: string; ctx?: string; ref?: string; ts: number }

export interface FocusSession { start: number; until: number; teas: number; paid?: boolean }
export interface Takeaway { id: string; from: PlayerId; title: string; text: string; ts: number; kind: 'book' | 'scroll'; hue: number }
export interface SealedBottle { id: string; from: PlayerId; text: string; photo?: string; ts: number; tileX: number; tileY: number; opened?: boolean }
export interface TownBanner { id: string; by: PlayerId; title: string; ts: number; until: number }
export interface Celebration { id: string; quadrant: Quadrant; by: PlayerId; ts: number }

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
  looks: Record<PlayerId, 'cream' | 'dark'>; // which outfit set each partner wears
  messages: Message[];
  arcadeTokens: number;
  eventTokens: number; // seasonal event tokens
  driftwood: number;
  fauna: Record<string, number>; // aquarium collection
  figures: Record<string, number>; // blind box figures owned
  freeFigures: string[]; // figures set free to wander the island
  recipes: string[]; // the shared Recipe Memory Book
  mgBest: Record<string, number>;
  shells: number; // Heart Shells, earned by growing closer
  whispers: Record<string, Whisper>;
  glowUntil: number; // starry fireside glow over the island
  auraUntil: number; // Connected aura after turning toward a bid
  bid: Bid | null;
  bidStats: { sent: number; turned: number };
  adventures: Record<string, { rolls: number; questId?: string }>;
  lovemap: Record<string, LoveRound>;
  gratitude: GratitudeNote[];
  notesOpened: number;
  islandSize: number; // tiles per side of the home island
  starterRemoved: boolean; // the starter structure has been picked up
  ingredients: number; // café brewing ingredients
  townAvatars: Record<PlayerId, { x: number; y: number }>;
  healthDays: Record<string, PlayerId[]>; // who finished a health goal on each date
  vitalityUntil: Record<PlayerId, number>; // Vitality Glow
  synergyUntil: number; // Synergy Aura: 1.5x coins while active
  focus: Partial<Record<PlayerId, FocusSession>>; // Focus Beacon lantern
  library: Takeaway[]; // Wisdom Bookshelf
  vault: { coins: number; built: string[] }; // Dream Vault
  bottleCredits: Record<PlayerId, number>; // sealed bottles earned by romance goals, still to write
  bottles: SealedBottle[]; // washed up on the shore
  banners: TownBanner[]; // town celebration banners from social goals
  celebration: Celebration | null;
  customPrompts: Record<string, { from: PlayerId; text: string }>; // secret prompts for a future day's question
  today: { day: string; questCoins: number; quests: number; tokens: number; mgCoins: number; wells: number; duoPaid: boolean }; // daily limits
  questDays: Record<string, PlayerId[]>; // who had a goal approved on each date // the last quadrant goal finished, for the aura effect
}
