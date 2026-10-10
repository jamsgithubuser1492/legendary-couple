// The painted sprite list: the sheets cut by tools/slice_sprites.py, the later sheets cut by tools/slice_sheets41_45.py,
// and the island textures cut by tools/slice_env.py.
import { SPRITES as BASE, WALK_SHEET } from './spriteListBase';
import { EXTRA_SPRITES } from './spriteListExtra';
import { ENV_SPRITES } from './spriteListEnv';
import { FLOOR_SPRITES } from './spriteListFloors';

export { WALK_SHEET };
export const SPRITES = [...BASE, ...EXTRA_SPRITES, ...ENV_SPRITES, ...FLOOR_SPRITES] as const;
