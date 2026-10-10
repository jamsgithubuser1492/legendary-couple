// The painted sprite list: the sheets cut by tools/slice_sprites.py, the later sheets cut by tools/slice_sheets41_45.py,
// and the island textures cut by tools/slice_env.py.
import { SPRITES as BASE, WALK_SHEET } from './spriteListBase';
import { EXTRA_SPRITES } from './spriteListExtra';
import { FLOOR_SPRITES } from './spriteListFloors';
import { MG_SPRITES } from './spriteListMg';
import { STARTER_SPRITES } from './spriteListStarters';
import { TOWN_SPRITES } from './spriteListTown';
import { PATH_SPRITES } from './spriteListPaths';

export { WALK_SHEET };
export const SPRITES = [...BASE, ...EXTRA_SPRITES, ...FLOOR_SPRITES, ...MG_SPRITES, ...STARTER_SPRITES, ...TOWN_SPRITES, ...PATH_SPRITES] as const;
