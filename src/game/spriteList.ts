// The painted sprite list: the sheets cut by tools/slice_sprites.py plus the later sheets cut by tools/slice_sheets41_45.py.
import { SPRITES as BASE, WALK_SHEET } from './spriteListBase';
import { EXTRA_SPRITES } from './spriteListExtra';

export { WALK_SHEET };
export const SPRITES = [...BASE, ...EXTRA_SPRITES] as const;
