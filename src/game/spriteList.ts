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
import { FISH_SPRITES } from './spriteListFish';
import { FISH2_SPRITES } from './spriteListFish2';
import { SKY_SPRITES } from './spriteListSky';
import { FINISH_SPRITES } from './spriteListFinish';
import { BACKDROP_SPRITES } from './spriteListBackdrops';
import { MATCHA_UI_SPRITES } from './spriteListMatcha';
import { RUSH_SPRITES } from './spriteListRush';
import { CREW_SPRITES } from './spriteListCrew';
import { CREW3_SPRITES } from './spriteListCrew3';
import { VIP_SPRITES } from './spriteListVip';
import { BIRD_SPRITES } from './spriteListBirds';
import { WEATHER_SPRITES } from './spriteListWeather';
import { CREW2_SPRITES } from './spriteListCrew2';
import { ORCHARD_SPRITES } from './spriteListOrchard';

export { WALK_SHEET };
export const SPRITES = [...BASE, ...EXTRA_SPRITES, ...FLOOR_SPRITES, ...MG_SPRITES, ...OUTFIT_SPRITES, ...CAFE_SPRITES, ...CAFE2_SPRITES, ...CAFE3_SPRITES, ...CAFE4_SPRITES, ...TOWN_SPRITES, ...START_SPRITES, ...FISH_SPRITES, ...FISH2_SPRITES, ...SKY_SPRITES, ...FINISH_SPRITES, ...BACKDROP_SPRITES, ...MATCHA_UI_SPRITES, ...RUSH_SPRITES, ...CREW_SPRITES, ...CREW3_SPRITES, ...VIP_SPRITES, ...BIRD_SPRITES, ...WEATHER_SPRITES, ...CREW2_SPRITES, ...ORCHARD_SPRITES] as const;
