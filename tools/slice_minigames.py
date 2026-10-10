"""Cuts the minigame art from sheets 48 (crane), 49 (fishing) and 50 (Matcha Masters).

Boxes are in the coordinates of the numbered probe images, and cutbox() floods the cream background away from the edges.
Run:  python3 tools/slice_minigames.py
Writes public/assets/sprites/mg_*.png and src/game/spriteListMg.ts.
"""
import importlib.util, json, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('s41', os.path.join(HERE, 'slice_sheets41_45.py'))
s41 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(s41)
ROOT, OUT = s41.ROOT, s41.OUT


def plain(sheet, half, x0, y0, x1, y1):
    """A plain rectangular crop (backdrops that fill their frame)."""
    K = s41.K
    yo = sheet.off_b if half == 'b' else 0
    return sheet.img.crop((round(x0 * K), round(y0 * K + yo), round(x1 * K), round(y1 * K + yo))).convert('RGBA')


def main():
    s48 = s41.Sheet('sheet48_crane_prize.jpg', 490)
    s49 = s41.Sheet('sheet49_stellar_fishing.jpg', 490)
    s50 = s41.Sheet('sheet50_matcha_masters.jpg', 490)
    jobs = []

    def cb(sheet, key, half, box, dw):
        jobs.append((key, sheet.cutbox(half, *box), dw))

    # ---- Matcha Masters (sheet 50) ----
    jobs.append(('mg_bg_cafe_day', plain(s50, 'a', 37, 110, 480, 340), 480))
    jobs.append(('mg_bg_cafe_sunset', plain(s50, 'a', 522, 110, 966, 340), 480))
    for k, b in {'matcha': (62, 750, 152, 862), 'milk': (205, 745, 283, 862), 'oatmilk': (338, 745, 420, 862), 'ice': (472, 748, 566, 862), 'strawberry': (622, 748, 715, 862),
                 'syrup': (770, 732, 845, 862), 'boba': (897, 750, 985, 862), 'cream': (1038, 745, 1132, 862), 'cocoa': (1407, 748, 1498, 862),
                 'blossom': (1522, 748, 1677, 862), 'cinnamon': (1702, 742, 1792, 862), 'vanilla': (1844, 745, 1944, 862)}.items():
        cb(s50, f'mg_ing_{k}', 'a', b, 40)
    cols = [(48, 176), (212, 338), (374, 500), (534, 664)]
    n = 1
    for x0, x1 in cols:
        for y0, y1 in [(92, 200), (203, 322)]:
            cb(s50, f'mg_cup_{n}', 'b', (x0, y0, x1, y1), 56)
            n += 1
    cb(s50, 'mg_tray', 'b', (718, 112, 968, 322), 100)
    for k, b in {'heart': (1040, 103, 1112, 163), 'star': (1157, 97, 1230, 163), 'cat': (1275, 98, 1350, 163), 'leaf': (1400, 97, 1465, 170), 'flower': (1040, 228, 1112, 298)}.items():
        cb(s50, f'mg_stencil_{k}', 'b', b, 30)
    for i, b in enumerate([(55, 463, 137, 595), (308, 468, 382, 595), (546, 470, 624, 595), (55, 630, 133, 760), (305, 635, 382, 760), (548, 640, 625, 762)], 1):
        cb(s50, f'mg_cust_{i}', 'b', b, 36)
    cb(s50, 'mg_stars', 'b', (1445, 447, 1648, 540), 90)
    cb(s50, 'mg_tipjar', 'b', (1498, 603, 1592, 722), 44)
    cb(s50, 'mg_rush_badge', 'b', (682, 642, 762, 722), 36)
    cb(s50, 'mg_book_cover', 'b', (858, 447, 978, 598), 56)
    cb(s50, 'mg_counter', 'a', (40, 447, 452, 632), 190)
    cb(s50, 'mg_order_window', 'a', (505, 430, 685, 622), 84)
    cb(s50, 'mg_prep', 'a', (743, 420, 992, 638), 110)
    cb(s50, 'mg_whisk', 'a', (1313, 450, 1404, 628), 40)
    cb(s50, 'mg_bowl', 'a', (1452, 443, 1552, 527), 46)

    # ---- Stellar Fishing (sheet 49) ----
    for k, (x0, x1) in {'day': (262, 735), 'golden': (840, 1316), 'night': (1428, 1902)}.items():
        jobs.append((f'mg_sky_{k}', plain(s49, 'a', x0, 230, x1, 382), 480))
    fish = {'guppy': (1338, 750, 1465, 812), 'tang': (1338, 872, 1470, 957), 'bunny': (1336, 1012, 1466, 1089), 'bass': (1322, 1144, 1482, 1227)}
    glow = {'guppy': (1780, 748, 1906, 812), 'tang': (1778, 872, 1910, 950), 'bass': (1762, 1143, 1925, 1220)}
    for k, b in fish.items():
        cb(s49, f'mg_fish_{k}', 'a', b, 34)
    for k, b in glow.items():
        cb(s49, f'mg_fish_{k}_glow', 'a', b, 36)
    cb(s49, 'mg_crate', 'b', (728, 130, 890, 283), 40)
    cb(s49, 'mg_crate_open', 'b', (980, 122, 1198, 284), 54)
    cb(s49, 'mg_bobber', 'a', (754, 752, 805, 880), 14)
    cb(s49, 'mg_hook', 'a', (1070, 755, 1125, 873), 14)
    cb(s49, 'mg_ring', 'a', (432, 766, 620, 876), 70)
    cb(s49, 'mg_jelly_peach', 'b', (103, 152, 194, 268), 28)
    cb(s49, 'mg_jelly_mint', 'b', (286, 143, 370, 275), 26)
    cb(s49, 'mg_octopus', 'b', (438, 127, 551, 277), 34)
    cb(s49, 'mg_starfish', 'b', (676, 488, 752, 570), 26)
    cb(s49, 'mg_bottle', 'b', (1338, 477, 1468, 684), 36)
    cb(s49, 'mg_journal', 'b', (1695, 455, 1898, 698), 70)
    cb(s49, 'mg_tank', 'b', (64, 463, 402, 690), 110)

    # ---- Crane (sheet 48) ----
    cb(s48, 'mg_arcade_front', 'a', (68, 220, 546, 592), 120)
    cb(s48, 'mg_cabinet', 'a', (583, 222, 893, 590), 90)
    for k, b in {'open': (1192, 258, 1287, 383), 'closing': (1325, 258, 1418, 383), 'closed': (1467, 258, 1543, 383), 'lift': (1595, 236, 1672, 383)}.items():
        cb(s48, f'mg_claw_{k}', 'a', b, 34)
    cb(s48, 'mg_rail', 'a', (1404, 490, 1674, 550), 120)
    cb(s48, 'mg_cable', 'a', (1340, 468, 1376, 570), 12)
    for k, b in {'pink': (210, 818, 330, 935), 'green': (373, 818, 494, 935), 'blue': (537, 818, 660, 935)}.items():
        cb(s48, f'mg_box_{k}', 'a', b, 40)
    for k, b in {'pink': (205, 62, 335, 236), 'green': (367, 62, 500, 236), 'blue': (531, 62, 667, 236)}.items():
        cb(s48, f'mg_heavy_{k}', 'b', b, 46)
    for k, b in {'heart': (1720, 77, 1810, 168), 'star': (1828, 77, 1920, 168), 'silver': (1720, 178, 1810, 270), 'gold': (1828, 178, 1920, 270)}.items():
        cb(s48, f'mg_token_{k}', 'b', b, 26)

    entries = []
    for key, im, dw in jobs:
        bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        if bb:
            im = im.crop(bb)
        want = dw * 2
        if im.width > want:
            im = im.resize((want, max(1, round(im.height * want / im.width))), Image.LANCZOS)
        if key.startswith(('mg_bg_', 'mg_sky_', 'mg_sea_')):
            im.convert('RGB').save(os.path.join(OUT, key + '.jpg'), quality=86)
            entries.append({'key': key, 'file': key + '.jpg', 'w': im.width, 'h': im.height, 'dw': dw})
        else:
            im.save(os.path.join(OUT, key + '.png'), optimize=True)
            entries.append({'key': key, 'file': key + '.png', 'w': im.width, 'h': im.height, 'dw': dw})
    with open(os.path.join(ROOT, 'src', 'game', 'spriteListMg.ts'), 'w') as f:
        f.write('// Generated by tools/slice_minigames.py. Do not edit by hand.\n')
        f.write('export const MG_SPRITES = ' + json.dumps(entries, indent=2) + ' as const;\n')
    print('wrote', len(entries))


if __name__ == '__main__':
    main()
