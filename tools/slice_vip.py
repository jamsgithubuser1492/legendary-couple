"""Cuts the VIP guest and surge event sheet (art/source/vip_surge_events.jpg).
Run:  python3 tools/slice_vip.py   Writes vip_* guest sprites, cz_t_vip_* order rail icons, surge_*, prop_espresso_overheat_*
and env_* sprites, and src/game/spriteListVip.ts (export VIP_SPRITES).

The sheet is messy (labels are unreliable, outfits change between cells), so every figure is picked by hand from the boxes
that the dark outline detector finds (the numbers in BOX are those component ids on a 1085 x 992 sheet).
Hello Kitty has real front and back walk frames (4 each, two drawn at a smaller scale, so each loop is rescaled to one height).
Miffy only has single poses (a front and a back per outfit), Snoopy a side walk, sit, order, jump, taste and wave.
Right facing views are mirrored by the game, so only left facing ones are cut. dw (on screen size) is set per companion
so Hello Kitty stands 40 px tall, Miffy 42 (ears) and Snoopy 36 on the café's 54 px person scale."""
import importlib.util, json, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('s41', os.path.join(HERE, 'slice_sheets41_45.py'))
s41 = importlib.util.module_from_spec(spec); spec.loader.exec_module(s41)
ROOT, OUT = s41.ROOT, s41.OUT
SH = s41.Sheet('vip_surge_events.jpg')

# component boxes (x0, y0, x1, y1) on the sheet, found with the outline detector and picked by eye
BOX = {
    0: (119, 127, 189, 216), 1: (191, 127, 249, 216), 2: (252, 127, 309, 216), 3: (340, 127, 397, 214), 4: (401, 127, 458, 216),
    5: (466, 130, 516, 215), 6: (521, 130, 572, 217), 13: (134, 231, 184, 298), 14: (195, 231, 244, 298), 15: (256, 231, 305, 299),
    16: (324, 226, 393, 299), 17: (404, 231, 454, 298), 18: (468, 230, 515, 297), 19: (523, 231, 571, 299),
    34: (267, 363, 325, 439), 35: (334, 363, 383, 440), 36: (419, 361, 458, 440), 37: (472, 361, 510, 441), 38: (555, 361, 593, 439),
    39: (631, 360, 669, 439), 40: (684, 361, 723, 440), 41: (762, 371, 808, 440), 43: (904, 371, 949, 437), 44: (1011, 370, 1059, 439),
    47: (989, 410, 1011, 437), 50: (148, 488, 188, 552), 52: (267, 490, 306, 552), 54: (417, 491, 456, 550), 55: (465, 480, 510, 547),
    56: (554, 489, 597, 550), 59: (767, 481, 823, 550),
    74: (26, 645, 183, 751), 75: (192, 645, 349, 751), 76: (356, 644, 525, 751), 77: (557, 678, 729, 750), 78: (738, 677, 898, 750),
    79: (906, 678, 1069, 750), 86: (46, 842, 130, 933),
}
entries, jobs = [], []


def cut(i, keep_all=False):
    x0, y0, x1, y1 = BOX[i]
    return SH.cutbox('o', x0 - 3, y0 - 3, x1 + 3, y1 + 3, keep_all=keep_all)


def trim(im):
    bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    return im.crop(bb) if bb else im


def loop(ids):
    """Frames of one loop on one canvas: same height (the median), centred, feet on the bottom edge."""
    fr = [trim(cut(i)) for i in ids]
    h = sorted(f.height for f in fr)[len(fr) // 2]
    fr = [f.resize((max(1, round(f.width * h / f.height)), h), Image.LANCZOS) for f in fr]
    w = max(f.width for f in fr)
    out = []
    for f in fr:
        c = Image.new('RGBA', (w, h))
        c.paste(f, ((w - f.width) // 2, 0))
        out.append(c)
    return out


def keyed(box, tol=22):
    """Lifts glows and sparks off their pink card: alpha follows how far each pixel is from the card colour."""
    a = np.array(SH.img.crop(box).convert('RGB')).astype(int)
    ring = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(ring, axis=0)
    al = np.clip((np.abs(a - bg).max(-1) - tol) * 7, 0, 255)
    return Image.fromarray(np.dstack([a, al]).astype(np.uint8), 'RGBA')


def add(key, im, scale):
    """scale: on screen pixels per sheet pixel, so dw = width * scale."""
    jobs.append((key, im, max(8, round(im.width * scale))))


def main():
    # ---- Hello Kitty: stand height 40 px
    k_front = loop([3, 16, 4, 17])  # red plaid and blue overalls, front
    k_back = loop([5, 18, 6, 19])
    k_green = loop([1, 14, 2, 15])  # green cardigan, front only (no back view on the sheet)
    ks = 40 / k_front[0].height
    for n, im in enumerate(k_front, 1): add(f'vip_kitty_walk_f_{n}', im, ks)
    for n, im in enumerate(k_back, 1): add(f'vip_kitty_walk_b_{n}', im, ks)
    for n, im in enumerate(k_green, 1): add(f'vip_kitty_green_walk_f_{n}', im, 40 / k_green[0].height)
    for n, i in enumerate([34, 35], 1): add(f'vip_kitty_sit_{n}', trim(cut(i)), ks)  # pointing at the menu, then sipping
    # ---- Miffy: stand height 42 px (the ears count)
    mf = trim(cut(37)); ms = 42 / mf.height
    add('vip_miffy_yellow_f', mf, ms); add('vip_miffy_yellow_b', trim(cut(39)), ms)
    add('vip_miffy_brown_f', trim(cut(36)), ms); add('vip_miffy_brown_b', trim(cut(40)), ms)
    add('vip_miffy_pink_stand', trim(cut(38)), ms)  # a dress, front only: kept for later
    # ---- Snoopy: stand height 36 px
    sw = loop([41, 50, 52, 54]); ss = 36 / sw[0].height
    for n, im in enumerate(sw, 1): add(f'vip_snoopy_walk_{n}', im, ss)
    for key, i in {'sit': 43, 'order': 44, 'jump': 55, 'taste': 56, 'wave': 59}.items(): add(f'vip_snoopy_{key}_1', trim(cut(i)), ss)
    add('vip_woodstock_1', trim(cut(47)), ss)
    # ---- order rail icons: the rail shows cz_t_<kind>
    for key, im, sc in [('kitty', k_front[0], ks), ('miffy', mf, ms), ('snoopy', sw[0], ss)]:
        add(f'cz_t_vip_{key}', im, sc)
    # ---- surge and event pieces, for the Rush Hour Manager build (not wired yet)
    for n, i in enumerate([74, 75, 76], 1): add(f'surge_bus_{n}', trim(cut(i, True)), 0.5)
    for n, i in enumerate([77, 78, 79], 1): add(f'surge_queue_{n}', trim(cut(i, True)), 0.5)
    add('prop_espresso_overheat_machine', trim(cut(86)), 0.5)
    for n, (x0, x1) in enumerate([(166, 242), (258, 336), (348, 424), (440, 516)], 1):
        add(f'prop_espresso_overheat_{n}', trim(keyed((x0, 846, x1, 915))), 0.5)
    for n, (x0, x1) in enumerate([(559, 612), (622, 674), (683, 737), (747, 799)], 1):  # tileable weather overlays, kept as plain squares
        add(f'env_rain_overlay_{n}', SH.img.crop((x0, 864, x1, 915)).convert('RGBA'), 1.0)
    for n, (x0, x1) in enumerate([(829, 882), (892, 946), (954, 1008), (1017, 1071)], 1):
        add(f'env_sun_overlay_{n}', SH.img.crop((x0, 864, x1, 915)).convert('RGBA'), 1.0)

    for key, im, dw in jobs:
        im.save(os.path.join(OUT, key + '.png'), optimize=True)
        entries.append({'key': key, 'file': key + '.png', 'w': im.width, 'h': im.height, 'dw': dw})
    with open(os.path.join(ROOT, 'src', 'game', 'spriteListVip.ts'), 'w') as f:
        f.write('// Generated by tools/slice_vip.py. Do not edit by hand.\n')
        f.write('export const VIP_SPRITES = ' + json.dumps(entries, indent=2) + ' as const;\n')
    print('wrote', len(entries))


if __name__ == '__main__':
    main()
