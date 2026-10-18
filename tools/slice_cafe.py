"""Cuts the café interior art from sheets 70 to 74 (goods, 4 direction props, customers and the interior sheet).

Boxes are in sheet pixels and cutbox() floods the cream background away from the edges. Four direction pieces are cut as
_fl, _fr, _bl and _br: a rotation of 0, 90, 180 or 270 degrees shows front left, front right, back right or back left.
Floor tiles are turned into isometric diamonds. Run:  python3 tools/slice_cafe.py
Writes public/assets/sprites/cx_*.png and src/game/spriteListCafe.ts.
"""
import importlib.util, json, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('s41', os.path.join(HERE, 'slice_sheets41_45.py'))
s41 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(s41)
ROOT, OUT = s41.ROOT, s41.OUT

SHEETS = {
    'goods': 'sheet_cafe_goods.jpg', 'props': 'sheet_cafe_props.jpg', 'cust2': 'sheet_cafe_customers2.jpg',
    'cust1': 'sheet_cafe_customers1.jpg', 'inter': 'sheet_cafe_interior.jpg',
}
jobs = []  # (key, image, display width)


def four(sheets, key, sh, boxes, dw):
    """boxes: [fl, fr, bl, br]"""
    for suffix, b in zip(('fl', 'fr', 'bl', 'br'), boxes):
        jobs.append((f'{key}_{suffix}', sheets[sh].cutbox('o', *b), dw))


def one(sheets, key, sh, box, dw, keep_all=False):
    jobs.append((key, sheets[sh].cutbox('o', *box, keep_all=keep_all), dw))


def diamond(sheets, key, sh, box, inset=6, size=128):
    """A flat loopable tile becomes an isometric floor diamond, 2 to 1."""
    x0, y0, x1, y1 = box
    im = sheets[sh].img.crop((x0 + inset, y0 + inset, x1 - inset, y1 - inset)).convert('RGBA')
    s = min(im.size)
    im = im.crop((0, 0, s, s)).resize((256, 256), Image.LANCZOS)
    rot = im.rotate(45, expand=True, resample=Image.BICUBIC, fillcolor=(0, 0, 0, 0))
    mask = Image.new('L', im.size, 255).rotate(45, expand=True, resample=Image.BICUBIC)
    rot.putalpha(mask)
    w = size
    rot = rot.resize((w, w), Image.LANCZOS).resize((w, w // 2), Image.LANCZOS)
    jobs.append((key, rot, w // 2))


def main():
    S = {k: s41.Sheet(v) for k, v in SHEETS.items()}

    # ---- seating and tables, four directions (sheet 71) ----
    four(S, 'cx_chair_maple', 'props', [(63, 131, 153, 262), (172, 131, 262, 262), (63, 264, 153, 382), (172, 264, 262, 382)], 49)
    four(S, 'cx_chair_bistro', 'props', [(323, 131, 413, 262), (433, 131, 523, 262), (325, 264, 413, 382), (432, 264, 521, 382)], 49)
    four(S, 'cx_table_marble', 'props', [(576, 143, 684, 260), (694, 143, 802, 260), (576, 265, 684, 379), (694, 265, 802, 379)], 58)
    four(S, 'cx_table_round', 'props', [(854, 143, 948, 261), (967, 143, 1061, 261), (854, 265, 948, 382), (967, 265, 1061, 382)], 52)
    # ---- plants (sheet 71) ----
    four(S, 'cx_fig', 'props', [(76, 460, 147, 574), (191, 460, 262, 577), (78, 580, 147, 695), (191, 580, 262, 696)], 40)
    four(S, 'cx_pothos', 'props', [(347, 460, 431, 589), (460, 460, 544, 589), (355, 589, 425, 691), (465, 589, 535, 691)], 46)
    # ---- counters and stations (sheet 71) ----
    four(S, 'cx_pastry_wood', 'props', [(52, 752, 150, 850), (160, 752, 258, 850), (55, 842, 152, 935), (160, 842, 256, 935)], 80)
    four(S, 'cx_whisk_station', 'props', [(310, 768, 414, 848), (415, 768, 518, 848), (310, 848, 414, 926), (415, 848, 518, 926)], 80)
    four(S, 'cx_boba_rack', 'props', [(562, 773, 637, 850), (644, 773, 716, 850), (562, 850, 637, 930), (644, 845, 714, 930)], 44)
    # ---- cat clocks (sheet 71 row 1) ----
    for i, x0 in enumerate([670, 752, 835, 917, 996], 1):
        one(S, f'cx_clock_{i}', 'props', (x0, 459, x0 + 58, 521), 28)
    # ---- the interior sheet (74): cases, espresso, bench, wall decor ----
    one(S, 'cx_case_empty', 'inter', (26, 407, 163, 540), 76)
    one(S, 'cx_case_stocked', 'inter', (200, 410, 333, 540), 76)
    one(S, 'cx_espresso', 'inter', (390, 400, 505, 536), 60)
    one(S, 'cx_espresso_steam', 'inter', (390, 540, 522, 682), 60)
    one(S, 'cx_bench_empty', 'inter', (566, 405, 725, 532), 88)
    one(S, 'cx_bench_couple', 'inter', (566, 540, 730, 684), 88)
    for i, (x0, x1) in enumerate([(820, 870), (884, 926), (945, 1000), (998, 1056)], 1):
        one(S, f'cx_hang_{i}', 'inter', (x0, 498, x1, 592), 30)
    for i, (x0, x1, y0, y1) in enumerate([(818, 876, 606, 692), (882, 928, 606, 692), (934, 982, 606, 688), (990, 1030, 606, 692)], 1):
        one(S, f'cx_frame_{i}', 'inter', (x0, y0, x1, y1), 28, keep_all=(i == 3))
    # overlays
    one(S, 'cx_fx_coin', 'inter', (756, 783, 832, 870), 34, keep_all=True)
    one(S, 'cx_fx_recipe', 'inter', (858, 838, 928, 884), 36)
    one(S, 'cx_bub_heart', 'inter', (944, 794, 992, 838), 26)
    one(S, 'cx_bub_plant', 'inter', (944, 840, 992, 884), 26)
    # floor tiles from the interior sheet (flat tiles to diamonds)
    cols = [(19, 100), (105, 187), (193, 273), (279, 360), (372, 453), (460, 541), (547, 628), (635, 717)]
    for name, c in [('light', 0), ('light2', 1), ('herring', 2), ('planks', 3), ('diamond', 4), ('chevron', 5), ('terrazzo', 6)]:
        diamond(S, f'cx_floor_{name}', 'inter', (cols[c][0], 829, cols[c][1], 905))
    # tatami and woven floors from sheet 71
    diamond(S, 'cx_floor_tatami', 'props', (815 + 12, 820, 903 + 8, 900 - 2), inset=12)
    diamond(S, 'cx_floor_woven', 'props', (745, 823, 823, 897))
    diamond(S, 'cx_floor_dark', 'props', (827, 743, 903, 817))
    # room shells, kept whole as theme previews
    one(S, 'cx_room_matcha', 'inter', (20, 75, 365, 330), 150, keep_all=True)
    one(S, 'cx_room_bistro', 'inter', (375, 75, 715, 330), 150, keep_all=True)
    one(S, 'cx_room_cloud', 'inter', (730, 75, 1070, 330), 150, keep_all=True)

    # ---- goods (sheet 70) ----
    G = lambda *a, **k: one(S, *a, **k)
    G('cx_g_cake', 'goods', (58, 148, 154, 247), 36)
    G('cx_g_croissant', 'goods', (316, 158, 428, 247), 38)
    G('cx_g_macarons', 'goods', (596, 146, 676, 254), 34)
    G('cx_g_bread', 'goods', (852, 150, 962, 257), 38)
    G('cx_g_matcha_jar', 'goods', (70, 462, 168, 577), 34)
    G('cx_g_beans', 'goods', (340, 460, 435, 577), 34)
    G('cx_g_syrup_lime', 'goods', (618, 478, 677, 577), 20)
    G('cx_g_syrup_orange', 'goods', (726, 478, 782, 577), 20)
    G('cx_g_syrup_berry', 'goods', (618, 592, 677, 688), 20)
    G('cx_g_syrup_plum', 'goods', (726, 592, 782, 688), 20)
    G('cx_g_milk', 'goods', (873, 462, 962, 577), 30)
    G('cx_g_pins', 'goods', (50, 764, 136, 846), 32)
    G('cx_g_pins2', 'goods', (150, 764, 226, 846), 32)
    G('cx_g_boba', 'goods', (286, 768, 354, 860), 24)
    G('cx_g_boba2', 'goods', (375, 768, 421, 860), 24)
    G('cx_g_hoodie', 'goods', (496, 768, 580, 854), 34)
    G('cx_g_hoodie2', 'goods', (496, 858, 580, 922), 34)
    G('cx_g_postcards', 'goods', (606, 778, 704, 857), 38)
    G('cx_g_box_matcha', 'goods', (756, 733, 840, 824), 38)
    G('cx_g_box_brand', 'goods', (884, 733, 960, 824), 38)
    G('cx_g_box_plain', 'goods', (990, 733, 1064, 824), 38)
    G('cx_g_box_green', 'goods', (764, 821, 842, 900), 38)
    G('cx_g_pallet', 'goods', (884, 821, 970, 896), 42)
    G('cx_g_crate', 'goods', (990, 821, 1070, 896), 40)

    # ---- customers (sheets 72 and 73), standing and sitting ----
    for tag, sh in (('cust1', 'cust1'), ('cust2', 'cust2')):
        names = ['student', 'creative', 'enthusiast', 'regular'] if tag == 'cust1' else ['gardener', 'scholar', 'nomad', 'artist']
        stand = [(45, 125, 150, 348), (318, 135, 412, 348), (580, 127, 682, 348), (838, 143, 942, 348)]
        sit = [(150, 140, 288, 345), (425, 150, 548, 345), (684, 156, 804, 345), (945, 152, 1068, 345)]
        for n, a, b in zip(names, stand, sit):
            one(S, f'cx_p_{n}', sh, a, 29)
            one(S, f'cx_p_{n}_sit', sh, b, 34)
    # bubbles
    for key, sh, box in [
        ('cx_b_heart', 'cust1', (826, 772, 876, 826)), ('cx_b_menu', 'cust1', (888, 772, 936, 826)), ('cx_b_coin', 'cust1', (950, 772, 1000, 826)),
        ('cx_b_patience', 'cust1', (1010, 772, 1064, 826)), ('cx_f_happy', 'cust1', (858, 860, 902, 905)), ('cx_f_neutral', 'cust1', (921, 860, 969, 905)),
        ('cx_f_sad', 'cust1', (985, 860, 1033, 905)), ('cx_b_wifi', 'cust2', (888, 772, 936, 826)), ('cx_b_star', 'cust2', (950, 772, 1000, 826)),
        ('cx_f_confused', 'cust2', (858, 860, 902, 905)), ('cx_f_excited', 'cust2', (921, 860, 969, 905)),
    ]:
        one(S, key, sh, box, 22)

    entries = []
    for key, im, dw in jobs:
        bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        if bb:
            im = im.crop(bb)
        want = dw * 2
        if im.width != want:
            im = im.resize((want, max(1, round(im.height * want / im.width))), Image.LANCZOS)
        im.save(os.path.join(OUT, key + '.png'), optimize=True)
        entries.append({'key': key, 'file': key + '.png', 'w': im.width, 'h': im.height, 'dw': dw})
    with open(os.path.join(ROOT, 'src', 'game', 'spriteListCafe.ts'), 'w') as f:
        f.write('// Generated by tools/slice_cafe.py. Do not edit by hand.\n')
        f.write('export const CAFE_SPRITES = ' + json.dumps(entries, indent=2) + ' as const;\n')
    print('wrote', len(entries))


if __name__ == '__main__':
    main()
