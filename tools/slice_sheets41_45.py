"""Cuts sprites from the Together, Crane figure, mechanic object and home item sheets (41 to 44).

Each object is found by its dark outline: the outline is closed, its holes are filled, and that silhouette becomes the
alpha, so tinted panels and grid lines never leak in. Objects are picked by their index on the numbered probe sheet,
or by a point that sits inside them. Run:  python3 tools/slice_sheets41_45.py
Writes public/assets/sprites/*.png and src/game/spriteListExtra.ts.
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art', 'source')
OUT = os.path.join(ROOT, 'public', 'assets', 'sprites')
K = 0.5425  # the numbered probe images were shown scaled, this maps their pixels back to the sheet


def comps(img, thr=180, close=3, minarea=350):
    a = np.array(img.convert('RGB')).astype(int)
    mask = a.mean(-1) < thr
    mask = ndimage.binary_closing(mask, iterations=close)
    mask = ndimage.binary_fill_holes(mask)
    mask = ndimage.binary_dilation(mask, iterations=1)
    lab, n = ndimage.label(mask)
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        area = int((lab[sl] == i + 1).sum())
        if area < minarea:
            continue
        out.append((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop, i + 1))
    out.sort(key=lambda c: (c[1] // 60, c[0]))  # same order as the numbered probe
    return lab, out


class Sheet:
    def __init__(self, name, off_b=0):
        self.img = Image.open(os.path.join(SRC, name)).convert('RGB')
        self.lab, self.cs = comps(self.img)
        self.off_b = off_b

    def pt(self, half, dx, dy):
        x = dx * K
        y = dy * K + (self.off_b if half == 'b' else 0)
        best = None
        for c in self.cs:
            w, h = c[2] - c[0], c[3] - c[1]
            if c[0] <= x <= c[2] and c[1] <= y <= c[3] and 14 <= w <= 330 and 14 <= h <= 330:
                a = w * h
                if best is None or a < best[0]:
                    best = (a, c)
        if best is None:
            near = min(self.cs, key=lambda c: (((c[0] + c[2]) / 2 - x) ** 2 + ((c[1] + c[3]) / 2 - y) ** 2))
            return near
        return best[1]

    def cut(self, c):
        x0, y0, x1, y1, lid = c
        m = (self.lab[y0:y1, x0:x1] == lid)
        a = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
        rgb = self.img.crop((x0, y0, x1, y1))
        im = rgb.convert('RGBA')
        im.putalpha(a)
        return im

    def cutbox(self, half, dx0, dy0, dx1, dy1, keep_all=False):
        """For objects that touch a caption or have pale outlines: crop a box and flood the background away from its edges."""
        if half == 'o':
            x0, y0, x1, y1 = dx0, dy0, dx1, dy1
        else:
            x0, x1 = dx0 * K, dx1 * K
            y0 = dy0 * K + (self.off_b if half == 'b' else 0)
            y1 = dy1 * K + (self.off_b if half == 'b' else 0)
        crop = self.img.crop((round(x0), round(y0), round(x1), round(y1)))
        a = np.array(crop).astype(int)
        ring = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
        bgc = np.median(ring, axis=0)
        near = np.abs(a - bgc).max(-1) < 30
        lum = a.mean(-1)
        spread = a.max(-1) - a.min(-1)
        cream = (lum > 205) & (spread < 34)
        shadow = (lum > 165) & (lum < 225) & (a[..., 0] - a[..., 1] > 6) & (a[..., 0] - a[..., 1] < 38) & (a[..., 1] - a[..., 2] > -8) & (a[..., 1] - a[..., 2] < 14) & (spread < 45)
        bg = near | cream | shadow
        lab, _ = ndimage.label(bg)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        fg = ~np.isin(lab, list(edge))
        fg = ndimage.binary_opening(fg, iterations=1)
        fg = ndimage.binary_fill_holes(fg)
        l2, n = ndimage.label(fg)
        if n > 1:
            sizes = ndimage.sum(fg, l2, range(1, n + 1))
            if keep_all:
                keep = [i + 1 for i, z in enumerate(sizes) if z >= 0.04 * sizes.max()]
                fg = np.isin(l2, keep)
            else:
                fg = l2 == (1 + int(np.argmax(sizes)))
        al = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
        im = crop.convert('RGBA')
        im.putalpha(al)
        return im

    def box(self, half, dx0, dy0, dx1, dy1, radius=10):
        x0, x1 = dx0 * K, dx1 * K
        y0 = dy0 * K + (self.off_b if half == 'b' else 0)
        y1 = dy1 * K + (self.off_b if half == 'b' else 0)
        im = self.img.crop((round(x0), round(y0), round(x1), round(y1))).convert('RGBA')
        mask = Image.new('L', im.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=radius, fill=255)
        im.putalpha(mask)
        return im


def build():
    s41 = Sheet('sheet41_together_mechanics.jpg', 490)
    s42 = Sheet('sheet42_crane_figures.jpg', 500)
    s43 = Sheet('sheet43_mechanic_objects.jpg', 490)
    s44 = Sheet('sheet44_home_cafe_items.jpg', 490)

    def idx(s, n):
        return s.cs[n]

    jobs = []  # (key, image, display width in game px or None to keep the natural size / 2)

    def add(key, im, dw=None):
        jobs.append((key, im, dw))

    # ---------- sheet 42: crane figures and capsules (indices on the probe sheet) ----------
    figs = {'toy_beach_kitty': 14, 'toy_beach_miffy': 15, 'toy_beach_snoopy': 16, 'toy_barista_kitty': 17, 'toy_barista_miffy': 18, 'toy_barista_snoopy': 19,
            'toy_sleepy_kitty': 61, 'toy_sleepy_miffy': 62, 'toy_sleepy_snoopy': 63, 'toy_golden_kitty': 52, 'toy_golden_miffy': 53, 'toy_golden_snoopy': 54}
    for k, n in figs.items():
        add(k, s42.cut(idx(s42, n)), 44)
    for k, n in {'cap_beach_closed': 20, 'cap_barista_closed': 21, 'cap_beach_open': 22, 'cap_pajama_closed': 64, 'cap_pajama_open': 66, 'cap_golden_closed': 67, 'cap_golden_open': 72}.items():
        add(k, s42.cut(idx(s42, n)), 40)
    add('toy_secret', s42.cut(idx(s42, 90)), 44)

    # ---------- sheet 43: mechanic objects ----------
    for i, b in enumerate([(80, 190, 396, 400), (428, 190, 752, 400), (788, 190, 1112, 400), (1145, 190, 1500, 400), (1525, 190, 1895, 410)], 1):
        add(f'mech_bookshelf_{i}', s43.cutbox('a', *b), 120)  # boxed so the arrows between the stages stay out
    for k, n, dw in [('item_scroll', 26, 30), ('item_letter', 27, 32), ('item_bookmark', 28, 18), ('item_ladder', 29, 60),
                     ('mech_vault_1', 52, 40), ('mech_vault_2', 53, 40), ('mech_vault_3', 54, 44),
                     ('bp_glass_cafe', 45, 120), ('bp_rooftop', 47, 80), ('rooftop_done', 48, 120),
                     ('bp_island', 49, 80), ('scaffold_island', 50, 64), ('island_ext_done', 51, 100),
                     ('fx_lantern_1', 65, 32), ('fx_lantern_2', 67, 32), ('fx_lantern_3', 68, 36), ('fx_lantern_4', 69, 32),
                     ('fx_tea_balloon', 71, 32), ('fx_tea_parachute', 72, 36), ('fx_tea_ribbon', 73, 44), ('fx_tea_land', 75, 56),
                     ('prop_bottle_drift', 97, 40), ('prop_bottle_shore', 98, 44), ('prop_bottle_open', 99, 40),
                     ('fx_splash', 76, 48), ('bottle_note', 77, 32), ('rolled_note', 78, 36),
                     ('balloons_bundle', 118, 36), ('balloon_single', 119, 22),
                     ('ui_quad_health', 102, 30), ('ui_quad_career', 104, 30), ('ui_quad_learning', 105, 34), ('ui_quad_finance', 108, 34),
                     ('ui_quad_romance', 121, 34), ('ui_quad_social', 123, 34), ('ui_quad_environment', 127, 34), ('ui_quad_recreation', 129, 34)]:
        add(k, s43.cut(idx(s43, n)), dw)
    add('glass_cafe_done', s43.cutbox('a', 838, 733, 1030, 893), 120)
    for k, (dx, dy) in {'bunting_rainbow': (805, 490), 'bunting_gold': (805, 595), 'bunting_teal': (805, 692)}.items():
        add(k, s43.cut(s43.pt('b', dx, dy)), 200)

    # ---------- sheet 41: together mechanics ----------
    add('prop_campfire', s41.cut(s41.pt('a', 1187, 290)), 64)
    for i, (dx, dy) in enumerate([(1175, 818), (1305, 818), (1445, 818), (1590, 818), (1728, 818), (1865, 818)], 1):
        add(f'fx_star_{i}', s41.cut(s41.pt('a', dx, dy)), 24)
    for i, (dx, dy) in enumerate([(1372, 268), (1487, 262), (1608, 243), (1735, 243), (1870, 230)], 1):
        add(f'ui_streak_{i}', s41.cut(s41.pt('b', dx, dy)), 20 + i * 6)
    add('ui_lovemap_card', s41.cut(s41.pt('b', 157, 182)), 64)
    add('ui_heart_meter', s41.cut(s41.pt('b', 297, 185)), 18)
    add('prop_jar_closed', s41.cut(s41.pt('b', 492, 108)), 32)
    add('prop_jar_open', s41.cut(s41.pt('b', 633, 108)), 32)
    add('prop_jar_full', s41.cut(s41.pt('b', 492, 268)), 32)
    add('fx_jar_pop', s41.cut(s41.pt('b', 633, 268)), 36)
    add('ui_checkin_card', s41.cut(s41.pt('b', 1190, 215)), 64)
    for k, x in {'light': 163, 'med': 397, 'deep': 630}.items():
        add(f'ui_whisper_{k}', s41.cut(s41.pt('b', x, 610)), 70)
    add('ui_scratch_base', s41.cut(s41.pt('b', 915, 610)), 70)
    add('ui_scratch_erased', s41.cut(s41.pt('b', 1143, 610)), 70)
    cols = [(1285, 1385), (1391, 1491), (1498, 1598)]
    rows = [(470, 556), (563, 651), (658, 746)]
    n = 1
    for r in rows:
        for c in cols:
            add(f'ui_reveal_{n}', s41.box('b', c[0] + 3, r[0] + 3, c[1] - 3, r[1] - 3, 8), 36)
            n += 1
    for name, y in {'wave': 292, 'tea': 505, 'flower': 718}.items():
        for i, (x0, x1) in enumerate([(65, 222), (235, 395), (408, 567), (580, 740)], 1):
            add(f'ui_bid_{name}_{i}', s41.box('a', x0, y - 80, x1, y + 80), 36)

    # ---------- sheet 44: shop items (display points on the numbered probe halves) ----------
    P = []

    def item(key, half, dx, dy, dw):
        P.append((key, half, dx, dy, dw))

    for key, half, dx, dy, dw in [
        ('prop_kitchen_oven', 'a', 110, 320, 46), ('prop_kitchen_fridge', 'a', 235, 290, 44), ('prop_kitchen_island', 'a', 400, 330, 92),
        ('prop_kitchen_potrack', 'a', 590, 260, 60), ('prop_kitchen_sink', 'a', 400, 505, 100), ('prop_dining_table', 'a', 150, 510, 100),
        ('prop_kitchen_dishes', 'a', 595, 510, 38),
        ('prop_living_cushions', 'a', 1020, 310, 70), ('prop_living_tv', 'a', 1245, 320, 92), ('prop_living_record', 'a', 780, 520, 50),
        ('prop_living_piano', 'a', 945, 520, 84), ('prop_living_desk', 'a', 1100, 520, 62), ('prop_living_easel', 'a', 1215, 520, 36),
        ('prop_living_yoga', 'a', 1310, 550, 38),
        ('prop_bed_wardrobe', 'a', 1465, 310, 50), ('prop_bed_dresser', 'a', 1605, 330, 54), ('prop_bed_vanity', 'a', 1750, 310, 54),
        ('prop_bed_nightlight_a', 'a', 1865, 262, 22), ('prop_bed_nightlight_b', 'a', 1930, 340, 22),
        ('prop_bath_tub', 'a', 1495, 510, 92), ('prop_bath_sink', 'a', 1665, 510, 56), ('prop_bath_plant_a', 'a', 1785, 510, 46),
        ('prop_bath_plant_b', 'a', 1862, 465, 26), ('prop_bath_plant_c', 'a', 1935, 505, 40),
        ('prop_outdoor_hottub', 'a', 140, 800, 100), ('prop_outdoor_hammock', 'a', 345, 800, 88), ('prop_outdoor_firepit', 'a', 535, 790, 54),
        ('prop_outdoor_bbq', 'a', 685, 790, 38), ('prop_outdoor_garden_a', 'a', 850, 775, 88),
        ('prop_outdoor_garden_b', 'b', 140, 60, 88), ('prop_outdoor_garden_c', 'b', 350, 60, 88), ('prop_outdoor_palm', 'b', 685, 60, 44),
        ('prop_outdoor_greenhouse', 'b', 885, 70, 140), ('prop_outdoor_coop', 'b', 130, 230, 90), ('prop_outdoor_swing', 'b', 395, 245, 140),
        ('prop_outdoor_gazebo', 'b', 630, 235, 150), ('prop_outdoor_pergola', 'b', 875, 245, 150),
        ('prop_wall_print_a', 'a', 1095, 775, 40), ('prop_wall_print_b', 'a', 1190, 775, 40), ('prop_wall_mirror_round', 'a', 1510, 760, 34),
        ('prop_wall_mirror_oval', 'a', 1600, 760, 30), ('prop_wall_shelf', 'a', 1690, 760, 34), ('prop_wall_neon_cafe', 'a', 1800, 850, 50),
        ('prop_wall_neon_cup', 'a', 1905, 850, 50), ('prop_wall_neon_coffee', 'b', 1810, 30, 50), ('prop_wall_neon_sign', 'b', 1915, 30, 50),
        ('prop_wall_bunting', 'a', 1855, 745, 70),
        ('prop_autumn_pumpkin', 'b', 1235, 165, 44), ('prop_autumn_rake', 'b', 1365, 170, 36), ('prop_autumn_blanket', 'b', 1480, 165, 44),
        ('prop_autumn_basket', 'b', 1595, 165, 40), ('prop_autumn_scarecrow', 'b', 1705, 165, 44), ('prop_autumn_wreath', 'b', 1810, 165, 36),
        ('prop_autumn_candle', 'b', 1920, 175, 24),
        ('prop_spring_wateringcan', 'b', 205, 525, 40), ('prop_spring_blossom', 'b', 320, 525, 40), ('prop_spring_seeds', 'b', 437, 525, 38),
        ('prop_spring_gnome', 'b', 550, 525, 30), ('prop_spring_kite', 'b', 665, 525, 40), ('prop_spring_birdfeeder', 'b', 780, 525, 30),
        ('prop_spring_wreath', 'b', 893, 525, 36),
        ('prop_summer_palm', 'b', 87, 680, 40), ('prop_summer_ball', 'b', 207, 680, 34), ('prop_summer_cart', 'b', 322, 680, 54),
        ('prop_summer_surfboards', 'b', 437, 680, 44), ('prop_summer_shells', 'b', 553, 680, 36), ('prop_summer_fan', 'b', 665, 680, 36),
        ('prop_summer_basket', 'b', 780, 680, 40), ('prop_summer_hammock', 'b', 893, 680, 50),
        ('prop_winter_ornament', 'b', 207, 830, 30), ('prop_winter_sled', 'b', 322, 830, 44), ('prop_winter_scarf', 'b', 437, 830, 34),
        ('prop_winter_gingerbread', 'b', 553, 830, 30), ('prop_winter_mistletoe', 'b', 665, 830, 32), ('prop_winter_boots', 'b', 780, 830, 36),
        ('prop_winter_cocoa', 'b', 893, 830, 30), ('prop_winter_bauble', 'b', 1165, 305, 30),
        ('prop_pet_bed_a', 'b', 1080, 515, 56), ('prop_pet_bed_b', 'b', 1235, 515, 56), ('prop_pet_bed_c', 'b', 1385, 515, 56),
        ('prop_pet_bowls', 'b', 1730, 510, 50), ('prop_pet_toy', 'b', 1895, 515, 40),
        ('prop_cafe_espresso', 'b', 1550, 510, 60), ('prop_cafe_espresso_small', 'b', 1065, 670, 44), ('prop_cafe_pastry_case', 'b', 1180, 670, 60),
        ('prop_cafe_patio', 'b', 1280, 670, 44), ('prop_cafe_menu_a', 'b', 1360, 670, 28), ('prop_cafe_menu_b', 'b', 1437, 670, 28),
        ('prop_cafe_hangplant_a', 'b', 1520, 690, 40), ('prop_cafe_hangplant_b', 'b', 1605, 690, 30),
        ('prop_cafe_lamp_a', 'b', 1670, 660, 30), ('prop_cafe_lamp_b', 'b', 1750, 660, 30),
        ('prop_cafe_counter_dark', 'b', 1080, 810, 96), ('prop_cafe_counter_light', 'b', 1220, 810, 96), ('prop_cafe_counter_pink', 'b', 1360, 810, 96),
        ('prop_cafe_stool_a', 'b', 1490, 820, 26), ('prop_cafe_stool_b', 'b', 1570, 820, 26),
        ('prop_cafe_records', 'b', 1720, 800, 76), ('prop_cafe_chalkboard', 'b', 1890, 750, 64),
    ]:
        item(key, half, dx, dy, dw)
    BOX = {  # items whose caption touches them, or whose outline is too pale to find by outline alone
        'prop_kitchen_fridge': ('a', 188, 203, 283, 382), 'prop_kitchen_island': ('a', 298, 272, 502, 372), 'prop_living_piano': ('a', 872, 445, 1020, 585),
        'prop_bed_vanity': ('a', 1688, 208, 1818, 388), 'prop_outdoor_greenhouse': ('o', 422, 442, 537, 556), 'prop_autumn_candle': ('b', 1890, 115, 1960, 208),
        'prop_wall_print_a': ('a', 1058, 733, 1140, 838), 'prop_wall_print_b': ('a', 1150, 720, 1236, 818),
        'prop_wall_neon_cafe': ('a', 1748, 785, 1852, 893), 'prop_wall_neon_cup': ('a', 1862, 785, 1968, 893),
        'prop_wall_neon_coffee': ('b', 1748, 2, 1850, 64), 'prop_wall_neon_sign': ('b', 1865, 5, 1968, 65),
        'prop_cafe_espresso': ('b', 1475, 452, 1633, 556), 'prop_cafe_espresso_small': ('b', 1020, 620, 1112, 722), 'prop_cafe_pastry_case': ('b', 1124, 624, 1236, 716),
        'prop_cafe_patio': ('b', 1238, 638, 1326, 706), 'prop_cafe_menu_a': ('b', 1326, 620, 1394, 706), 'prop_cafe_menu_b': ('b', 1402, 620, 1472, 706),
        'prop_cafe_counter_dark': ('b', 1015, 774, 1148, 850), 'prop_cafe_counter_light': ('b', 1154, 774, 1288, 850), 'prop_cafe_counter_pink': ('b', 1294, 774, 1430, 850),
    }
    for key, half, dx, dy, dw in P:
        if key in BOX:
            b = BOX[key]
            add(key, s44.cutbox(*b), dw)
        else:
            add(key, s44.cut(s44.pt(half, dx, dy)), dw)
    return jobs


def trim(im):
    bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    return im.crop(bb) if bb else im


def main():
    os.makedirs(OUT, exist_ok=True)
    entries = []
    for key, im, dw in build():
        im = trim(im)
        want = (dw if dw else round(im.width / 2)) * 2
        if im.width > want:
            im = im.resize((want, max(1, round(im.height * want / im.width))), Image.LANCZOS)
        im.save(os.path.join(OUT, key + '.png'), optimize=True)
        entries.append({'key': key, 'file': key + '.png', 'w': im.width, 'h': im.height, 'dw': dw if dw else round(im.width / 2)})
    with open(os.path.join(ROOT, 'src', 'game', 'spriteListExtra.ts'), 'w') as f:
        f.write('// Generated by tools/slice_sheets41_45.py. Do not edit by hand.\n')
        f.write('export const EXTRA_SPRITES = ' + json.dumps(entries, indent=2) + ' as const;\n')
    print('wrote', len(entries), 'sprites')


if __name__ == '__main__':
    main()
