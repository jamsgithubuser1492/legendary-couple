// The painted sprite list: the sheets cut by tools/slice_sprites.py, the later sheets cut by tools/slice_sheets41_45.py,
// the town and starter art cut by tools/slice_town.py and tools/slice_starters2.py.
import { SPRITES as BASE, WALK_SHEET } from './spriteListBase';
import { EXTRA_SPRITES } from './spriteListExtra';
import { FLOOR_SPRITES } from './spriteListFloors';
import { MG_SPRITES } from './spriteListMg';
import { OUTFIT_SPRITES } from './spriteListOutfits';
import { CAFE_SPRITES } from './spriteListCafe';
import { CAFE2_SPRITES } from './spriteListCafe2';
import { CAFE3_SPRITES } from './spriteListCafe3';
import { CAFE4_SPRITES } from './spriteListCafe4';
import { TOWN_SPRITES } from './spriteListTown';
import { START_SPRITES } from './spriteListStart';

export { WALK_SHEET };
export const SPRITES = [...BASE, ...EXTRA_SPRITES, ...FLOOR_SPRITES, ...MG_SPRITES, ...OUTFIT_SPRITES, ...CAFE_SPRITES, ...CAFE2_SPRITES, ...CAFE3_SPRITES, ...CAFE4_SPRITES, ...TOWN_SPRITES, ...START_SPRITES] as const;
