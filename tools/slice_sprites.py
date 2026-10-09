"""Cuts individual transparent PNG sprites out of the art sheets in art/source/.

Run:  python3 tools/slice_sprites.py
Writes public/assets/sprites/*.png and src/game/spriteList.ts.
Each entry is (key, sheet, (x0, y0, x1, y1), optional erase rects that paint over stray label text).
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art', 'source')
OUT = os.path.join(ROOT, 'public', 'assets', 'sprites')
SHEETS = {
    's1': 'sheet1_overview.webp', 's2': 'sheet2_modular_seasonal.webp', 's6': 'sheet6_cafe_day.jpg',
    's7': 'sheet7_world_characters.jpg', 's8': 'sheet8_cafe_sunset.jpg',
}

SPRITES = [
    # --- sheet 2: modular home, early furniture, seasonal ---
    ('floor_wood', 's2', (610, 175, 790, 292)),
    ('wall_single', 's2', (800, 108, 905, 282)),
    ('wall_corner', 's2', (943, 108, 1106, 282)),
    ('wall_window', 's2', (1148, 108, 1272, 290)),
    ('wall_door', 's2', (1308, 104, 1422, 292)),
    ('bed_gingham', 's2', (612, 450, 842, 645)),
    ('nightstand', 's2', (898, 458, 1036, 632)),
    ('chair_sage', 's2', (1100, 458, 1230, 632)),
    ('mug', 's2', (1283, 512, 1400, 622)),
    ('xmas_tree', 's2', (468, 705, 622, 982)),
    ('blanket_red', 's2', (632, 795, 800, 958)),
    ('tree_spring', 's2', (835, 828, 945, 930)),
    ('tree_summer', 's2', (993, 828, 1095, 930)),
    ('tree_autumn', 's2', (1150, 828, 1260, 930)),
    ('tree_winter', 's2', (1295, 828, 1418, 930)),
    ('blanket_spring', 's2', (835, 922, 945, 1008)),
    ('blanket_summer', 's2', (993, 922, 1100, 1008)),
    ('blanket_autumn', 's2', (1150, 922, 1265, 1008)),
    ('blanket_winter', 's2', (1295, 922, 1418, 1008)),
    # --- sheet 8: sunset cafe set ---
    ('cafe_exterior', 's8', (60, 380, 415, 668), [(60, 383, 182, 410)]),
    ('wooden_chair_a', 's8', (452, 418, 525, 520)),
    ('wooden_chair_b', 's8', (527, 418, 597, 520)),
    ('cushion_set', 's8', (610, 418, 790, 515)),
    ('round_table_set', 's8', (448, 552, 608, 668)),
    ('square_table_set', 's8', (612, 552, 790, 668)),
    ('bookshelf_cafe', 's8', (805, 410, 892, 500)),
    ('counter_pastry', 's8', (805, 512, 1020, 658)),
    ('food_matcha', 's8', (452, 752, 518, 802)),
    ('food_tray', 's8', (528, 750, 606, 802)),
    ('food_cake_a', 's8', (628, 738, 702, 805)),
    ('food_cake_b', 's8', (712, 735, 790, 805)),
    ('food_slice', 's8', (798, 735, 872, 805)),
    ('food_croissant', 's8', (448, 842, 520, 902)),
    ('food_display', 's8', (532, 842, 622, 905)),
    ('food_macarons', 's8', (624, 848, 702, 902)),
    ('food_loaf', 's8', (710, 842, 792, 902)),
    ('food_bread', 's8', (798, 842, 872, 905)),
    ('plant_a', 's8', (898, 750, 955, 820)),
    ('plant_b', 's8', (955, 752, 1016, 818)),
    ('plant_snake', 's8', (903, 828, 958, 905)),
    ('lamp', 's8', (1028, 752, 1072, 818)),
    ('menu_sign', 's8', (962, 828, 1016, 905)),
    ('suitcase', 's8', (1018, 846, 1082, 906)),
    # --- sheet 6: daylight cafe ---
    ('couch_sectional', 's6', (820, 68, 1058, 228)),
    ('pastry_case', 's6', (462, 742, 684, 950)),
    ('bread_shelf', 's6', (702, 758, 880, 945)),
    ('menu_stand_a', 's6', (922, 835, 990, 935)),
    ('menu_stand_b', 's6', (990, 845, 1056, 940)),
    ('plush_kitty', 's6', (852, 558, 945, 672)),
    ('plush_miffy', 's6', (968, 545, 1056, 672)),
    # --- sheet 7: world, landmarks, pets ---
    ('palm_grove', 's7', (172, 378, 366, 588)),
    ('lifeguard_stand', 's7', (388, 525, 502, 660)),
    ('surfboards', 's7', (505, 568, 556, 652)),
    ('lighthouse', 's7', (12, 385, 232, 642)),
    ('miniso', 's7', (603, 338, 822, 484)),
    ('home_house', 's7', (868, 338, 1066, 486)),
    ('cottage', 's7', (605, 520, 722, 652)),
    ('pet_golden', 's7', (688, 212, 785, 308)),
    ('pet_corgi', 's7', (922, 222, 996, 308)),
    ('pet_bunny', 's7', (1010, 232, 1066, 306)),
    # --- avatars (static, from the overview sheet) ---
    ('rachel_front', 's1', (803, 58, 880, 200)),
    ('rachel_side', 's1', (878, 58, 950, 200)),
    ('rachel_back', 's1', (948, 58, 1014, 200)),
]

# On-screen width in px at zoom 1 (one tile is 64 px wide). Sprites are stored at 2x this for crispness.
DISPLAY_W = {
    'floor_wood': 66, 'wall_single': 36, 'wall_corner': 60, 'wall_window': 43, 'wall_door': 38,
    'bed_gingham': 100, 'nightstand': 44, 'chair_sage': 40, 'mug': 22, 'xmas_tree': 44,
    'blanket_red': 56, 'blanket_spring': 50, 'blanket_summer': 50, 'blanket_autumn': 50, 'blanket_winter': 50,
    'tree_spring': 38, 'tree_summer': 38, 'tree_autumn': 38, 'tree_winter': 40,
    'cafe_exterior': 120, 'wooden_chair_a': 34, 'wooden_chair_b': 34, 'cushion_set': 100,
    'round_table_set': 90, 'square_table_set': 100, 'bookshelf_cafe': 44, 'counter_pastry': 150,
    'food_matcha': 28, 'food_tray': 32, 'food_cake_a': 28, 'food_cake_b': 28, 'food_slice': 28,
    'food_croissant': 30, 'food_display': 32, 'food_macarons': 30, 'food_loaf': 30, 'food_bread': 28,
    'plant_a': 30, 'plant_b': 28, 'plant_snake': 26, 'lamp': 22, 'menu_sign': 24, 'suitcase': 28,
    'couch_sectional': 150, 'pastry_case': 100, 'bread_shelf': 84, 'menu_stand_a': 26, 'menu_stand_b': 28,
    'plush_kitty': 34, 'plush_miffy': 32, 'palm_grove': 100, 'lifeguard_stand': 76, 'surfboards': 28,
    'lighthouse': 130, 'miniso': 130, 'home_house': 130, 'cottage': 80,
    'pet_golden': 46, 'pet_corgi': 34, 'pet_bunny': 22,
    'rachel_front': 31, 'rachel_side': 29, 'rachel_back': 27,
}
WALK_SCALE = 0.85  # james walk frames are 80x134 -> 68x114, drawn at half size in game

# James: 4 directions x 4 frames from the walking cycle sheet. Fixed boxes keep feet aligned.
WALK_ROWS = [(64, 'front'), (200, 'back'), (336, 'left'), (482, 'right')]
WALK_COLS = [155, 260, 365, 466]
WALK_W, WALK_H = 80, 134


def estimate_bg(arr):
    border = np.concatenate([arr[0], arr[-1], arr[:, 0], arr[:, -1]]).reshape(-1, 3)
    return np.median(border, axis=0)


def cut(sheet, box, erase=()):
    im = sheet.crop(box).convert('RGB')
    arr = np.array(im).astype(np.int16)
    bg = estimate_bg(arr)
    for (ex0, ey0, ex1, ey1) in erase:
        arr[max(0, ey0 - box[1]):max(0, ey1 - box[1]), max(0, ex0 - box[0]):max(0, ex1 - box[0])] = bg
    dist = np.sqrt(((arr - bg) ** 2).sum(axis=2))
    near = dist < 14
    labels, n = ndimage.label(near)
    remove = np.zeros_like(near)
    h, w = near.shape
    edge = set(labels[0]) | set(labels[-1]) | set(labels[:, 0]) | set(labels[:, -1])
    sizes = ndimage.sum(near, labels, range(n + 1))
    for lab in range(1, n + 1):
        if lab in edge or sizes[lab] > 90:  # edge background, or enclosed gaps like chair legs
            remove |= labels == lab
    # soft edge: grow the removed area 1px then feather
    alpha = (~remove).astype(float)
    alpha = ndimage.binary_opening(alpha > 0.5, iterations=1).astype(float)
    # drop leftover specks (stray text) that are not the main sprite
    comp, cn = ndimage.label(alpha > 0.5)
    if cn > 1:
        csz = ndimage.sum(alpha > 0.5, comp, range(1, cn + 1))
        biggest = csz.max()
        keep = np.zeros_like(alpha, dtype=bool)
        for i, s in enumerate(csz, start=1):
            if s >= biggest * 0.08:
                keep |= comp == i
        alpha = keep.astype(float)
    alpha = ndimage.gaussian_filter(alpha, 0.6)
    out = np.dstack([arr.clip(0, 255).astype(np.uint8), (alpha * 255).astype(np.uint8)])
    img = Image.fromarray(out, 'RGBA')
    bbox = img.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    return img.crop(bbox) if bbox else img


def main():
    os.makedirs(OUT, exist_ok=True)
    sheets = {k: Image.open(os.path.join(SRC, v)).convert('RGB') for k, v in SHEETS.items()}
    entries = []
    for item in SPRITES:
        key, sk, box = item[0], item[1], item[2]
        erase = item[3] if len(item) > 3 else ()
        img = cut(sheets[sk], box, erase)
        dw = DISPLAY_W[key]
        target = dw * 2
        if img.width > target:
            img = img.resize((target, round(img.height * target / img.width)), Image.LANCZOS)
        img.save(os.path.join(OUT, key + '.png'), optimize=True)
        entries.append({'key': key, 'file': key + '.png', 'w': img.width, 'h': img.height, 'dw': dw})
    # walk sheet: 4 cols x 4 rows, every frame the same size, bottom aligned
    sheet2 = sheets['s2']
    atlas = Image.new('RGBA', (WALK_W * 4, WALK_H * 4), (0, 0, 0, 0))
    for r, (y0, _name) in enumerate(WALK_ROWS):
        for c, x0 in enumerate(WALK_COLS):
            tile = cut(sheet2, (x0, y0, x0 + WALK_W, y0 + WALK_H))
            ox = (WALK_W - tile.width) // 2
            oy = WALK_H - tile.height
            atlas.paste(tile, (c * WALK_W + ox, r * WALK_H + oy), tile)
    fw, fh = round(WALK_W * WALK_SCALE), round(WALK_H * WALK_SCALE)
    atlas = atlas.resize((fw * 4, fh * 4), Image.LANCZOS)
    atlas.save(os.path.join(OUT, 'james_walk.png'), optimize=True)
    ts = ['// Generated by tools/slice_sprites.py. Do not edit by hand.',
          'export const SPRITES = ' + json.dumps(entries, indent=2) + ' as const;', '',
          f'export const WALK_SHEET = {{ key: "james_walk", file: "james_walk.png", frameWidth: {fw}, frameHeight: {fh}, rows: ["front", "back", "left", "right"] }} as const;', '']
    with open(os.path.join(ROOT, 'src', 'game', 'spriteList.ts'), 'w') as f:
        f.write('\n'.join(ts))
    print('wrote', len(entries), 'sprites + walk sheet')


if __name__ == '__main__':
    sys.exit(main())
