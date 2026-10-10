// The painted sprite list: the sheets cut by tools/slice_sprites.py, the later sheets cut by tools/slice_sheets41_45.py,
// the town and starter art cut by tools/slice_town.py and tools/slice_starters2.py.
import { SPRITES as BASE, WALK_SHEET } from './spriteListBase';
import { EXTRA_SPRITES } from './spriteListExtra';
import { FLOOR_SPRITES } from './spriteListFloors';
import { MG_SPRITES } from './spriteListMg';
import { TOWN_SPRITES } from './spriteListTown';
import { START_SPRITES } from './spriteListStart';

export { WALK_SHEET };
export const SPRITES = [...BASE, ...EXTRA_SPRITES, ...FLOOR_SPRITES, ...MG_SPRITES, ...TOWN_SPRITES, ...START_SPRITES] as const;
