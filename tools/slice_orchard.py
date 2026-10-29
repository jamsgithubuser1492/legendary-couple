"""Cuts the Orchard minigame art: fruit and hazards, baskets, trees, James Rachel and Mochi poses, backdrops and effects
(sheets 97 to 102, saved as art/source/sheet_orch_*.jpg). Run:  python3 tools/slice_orchard.py
Writes or_* sprites and src/game/spriteListOrchard.ts. Pieces keep their native size (capped at 640 px wide)."""
import importlib.util, json, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('s41', os.path.join(HERE, 'slice_sheets41_45.py'))
s41 = importlib.util.module_from_spec(spec); spec.loader.exec_module(s41)
ROOT, OUT = s41.ROOT, s41.OUT
SH = {k: s41.Sheet(f'sheet_orch_{k}.jpg') for k in ('scene', 'bg', 'basket', 'missing', 'today', 'fx')}
jobs = []  # (key, image, dw, jpg?)


def clear_paper(im, lum=222):
    """Removes the paper showing through holes (inside a basket handle) that the edge flood cannot reach."""
    a = np.array(im).astype(int)
    paper = (a[..., :3].min(-1) > lum - 14) & ((a[..., :3].max(-1) - a[..., :3].min(-1)) < 40) & (a[..., :3].mean(-1) > lum - 6)
    a[..., 3] = np.where(paper, 0, a[..., 3])
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def cut(sh, key, box, dw=None, keep_all=False, pad=0, paper=False, erase=()):
    x0, y0, x1, y1 = box
    im = SH[sh].cutbox('o', x0 - pad, y0 - pad, x1 + pad, y1 + pad, keep_all=keep_all)
    if paper:
        im = clear_paper(im)
    for ex0, ey0, ex1, ey1 in erase:  # sheet coordinates of strays that touch the piece
        a = np.array(im)
        a[max(0, ey0 - (y0 - pad)):max(0, ey1 - (y0 - pad)), max(0, ex0 - (x0 - pad)):max(0, ex1 - (x0 - pad)), 3] = 0
        im = Image.fromarray(a, 'RGBA')
    jobs.append((key, im, dw, False))


def plain(sh, key, box, dw=None, jpg=True):
    jobs.append((key, SH[sh].img.crop(box).convert('RGBA'), dw, jpg))


def keyed(sh, key, box, mode, dw=None):
    """Lifts effects off their coloured tile. bright: lighter than the tile. dark: darker or other. glow: on a dark tile."""
    a = np.array(SH[sh].img.crop(box).convert('RGB')).astype(int)
    ring = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(ring, axis=0)
    if mode == 'bright':
        al = np.clip(((a - bg).mean(-1) - 10) * 8, 0, 255)
    elif mode == 'diff':
        al = np.clip((np.abs(a - bg).max(-1) - 22) * 8, 0, 255)
    else:
        al = np.clip(((a - bg).max(-1) - 40) * 4, 0, 255)
    jobs.append((key, Image.fromarray(np.dstack([a, al]).astype(np.uint8), 'RGBA'), dw, False))


# ---- seasonal trees (no new art needed): the summer tree sprites recoloured per season ----------------------------------
SEASONS = ('spring', 'summer', 'autumn', 'winter')
TREE_W = 138  # canvas of the fruit tree, every seasonal tree piece shares it so they stack exactly


def _noise(shape, cells, seed):
    """Smooth value noise in 0..1 (random grid, smoothstep blend) so a whole canopy gets patchy, believable colour."""
    rng = np.random.default_rng(seed)
    g = rng.random((cells + 2, cells + 2)).astype(np.float32)
    ys = np.linspace(0, cells, shape[0], endpoint=False)
    xs = np.linspace(0, cells, shape[1], endpoint=False)
    y0, x0 = np.floor(ys).astype(int), np.floor(xs).astype(int)
    fy, fx = ys - y0, xs - x0
    fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
    top = g[np.ix_(y0, x0)] * (1 - fx)[None, :] + g[np.ix_(y0, x0 + 1)] * fx[None, :]
    bot = g[np.ix_(y0 + 1, x0)] * (1 - fx)[None, :] + g[np.ix_(y0 + 1, x0 + 1)] * fx[None, :]
    a = top * (1 - fy)[:, None] + bot * fy[:, None]
    return (a - a.min()) / max(1e-6, a.max() - a.min())


def _smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def _hsv_to_rgb(h, s, v):
    """h in degrees, s and v in 0..1, all arrays."""
    h = (h % 360) / 60.0
    i = np.floor(h).astype(int) % 6
    f = h - np.floor(h)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    r = np.choose(i, [v, q, p, p, t, v]); g = np.choose(i, [t, v, v, q, p, p]); b = np.choose(i, [p, p, t, v, v, q])
    return np.stack([r, g, b], -1)


def season_tree(im, season):
    """Recolours only the leaves (green pixels) of a tree sprite; fruit, trunk and outline keep their own colours."""
    a = np.asarray(im.convert('RGBA'), dtype=np.float32)
    rgb, alpha = a[..., :3] / 255.0, a[..., 3]
    if season == 'summer':
        return im.convert('RGBA')
    hsv = np.asarray(Image.fromarray((rgb * 255).astype(np.uint8), 'RGB').convert('HSV'), dtype=np.float32)
    H, S, V = hsv[..., 0] * 360 / 255.0, hsv[..., 1] / 255.0, hsv[..., 2] / 255.0
    w = _smooth(S, 0.08, 0.20) * _smooth(H, 52, 78) * (1 - _smooth(H, 150, 175))  # how green a pixel is
    shape = H.shape
    n1, n2, n3 = _noise(shape, 5, 11), _noise(shape, 11, 23), _noise(shape, 3, 5)
    if season == 'autumn':
        h = 18 + 34 * n1 + 6 * (n2 - 0.5)
        red = _smooth(n3, 0.6, 0.76)
        h = h * (1 - red) + (6 + 8 * n2) * red  # a few soft red patches
        s = np.clip(S * 1.3 + 0.16, 0, 0.9)
        v = np.clip(V * (0.97 + 0.08 * n2), 0, 1)
        new = _hsv_to_rgb(h, s, v)
    elif season == 'winter':
        new = _hsv_to_rgb(185 + 12 * n1, np.clip(S * 0.42, 0, 0.24), np.clip(V * 0.9 + 0.02, 0, 1))  # cold slate green under the snow
    else:  # spring: fresh leaves with soft pink blossom clusters that keep the leaf shading
        leaf = _hsv_to_rgb(H + 8, np.clip(S, 0, 1), np.clip(V + 0.06, 0, 1))
        blossom = _hsv_to_rgb(338 + 14 * n2, np.clip(S * 0.35 + 0.1, 0.12, 0.3), np.clip(V * 0.8 + 0.3, 0, 1))
        b = (_smooth(0.55 * _noise(shape, 9, 23) + 0.45 * _noise(shape, 17, 31), 0.56, 0.66) * 0.88)[..., None]
        new = leaf * (1 - b) + blossom * b
    out = rgb * (1 - w[..., None]) + np.clip(new, 0, 1) * w[..., None]
    if season == 'winter':  # a snow cap on the top of the canopy, shaded by the leaves under it
        h_, w_ = shape
        cap = 12 + 10 * np.interp(np.arange(w_), np.linspace(0, w_ - 1, 9), np.random.default_rng(3).random(9))
        edge = _noise(shape, 24, 41)
        for x in range(w_):
            col = np.where(alpha[:, x] > 100)[0]
            if not len(col):
                continue
            y0 = col[0]
            for y in range(y0, min(h_, int(y0 + cap[x]) + 1)):
                if alpha[y, x] < 100 or V[y, x] < 0.42:
                    continue  # leave the dark outline alone
                t = 1 - (y - y0) / max(1.0, cap[x])
                k = np.clip(t * 1.7 * (0.8 + 0.4 * edge[y, x]) + 0.12, 0, 1) * 0.95
                snow = np.array([0.95, 0.97, 1.0]) * (0.86 + 0.14 * V[y, x])
                out[y, x] = out[y, x] * (1 - k) + snow * k
    res = np.dstack([np.clip(out, 0, 1) * 255, alpha]).astype(np.uint8)
    return Image.fromarray(res, 'RGBA')


def shake_canopy(im):
    """The canopy of a shake frame, scaled to the fruit tree's canopy width and top aligned on the shared canvas, with a feathered
    lower edge so it blends into the fruit tree's own trunk and lower leaves (the shake frames have a stubbier trunk)."""
    a = np.asarray(im.convert('RGBA'))[..., 3] > 40
    rows = a.sum(1)
    f = 137.0 / rows.max()
    im = im.convert('RGBA').resize((round(im.width * f), round(im.height * f)), Image.LANCZOS)
    a = np.asarray(im)[..., 3] > 40
    ys, xs = np.where(a)
    cx, top = (xs.min() + xs.max()) / 2.0, ys.min()
    canvas = Image.new('RGBA', (TREE_W, 142), (0, 0, 0, 0))
    canvas.paste(im, (round(68 - cx), round(1 - top)), im)
    arr = np.asarray(canvas).copy()
    arr[121:, :, 3] = 0  # below the canopy there is only trunk and buds
    hsv = np.asarray(Image.fromarray(arr[..., :3], 'RGB').convert('HSV'), dtype=np.float32)
    Hh, Ss, Vv = hsv[..., 0] * 360 / 255.0, hsv[..., 1] / 255.0, hsv[..., 2] / 255.0
    trunk = (Hh > 8) & (Hh < 48) & (Ss > 0.3) & (Vv > 0.28) & (Vv < 0.9)
    from scipy import ndimage
    trunk = ndimage.binary_dilation(trunk, iterations=2)
    arr[..., 3] = np.where(trunk, 0, arr[..., 3])  # the base tree's own trunk shows through the gap
    lab, n = ndimage.label(arr[..., 3] > 20)
    for i in range(1, n + 1):
        ys_ = np.where(lab == i)[0]
        if len(ys_) < 40 or ys_.mean() > 108:
            arr[..., 3][lab == i] = 0  # stray crumbs and trunk buds left by the cut
    return Image.fromarray(arr, 'RGBA')


def add_season_trees(entries):
    src = lambda k: Image.open(os.path.join(OUT, f'{k}.png')).convert('RGBA')
    fruit, fade = src('or_tree_fruit'), src('or_tree_fade')
    shakes = [shake_canopy(src(f'or_shake_{i}')) for i in range(1, 6)]
    for sea in SEASONS:
        parts = {'fruit': fruit, 'fade': fade, **{f'shk{i + 1}': im for i, im in enumerate(shakes)}}
        for name, im in parts.items():
            out = season_tree(im, sea)
            key = f'or_t_{sea}_{name}'
            out.save(os.path.join(OUT, key + '.png'), optimize=True)
            entries.append({'key': key, 'file': key + '.png', 'w': out.width, 'h': out.height, 'dw': 69})


def main():
    # ---- fruit, hazards (sheet 101 what the game draws today)
    for k, b in {'apple_1': (39, 484, 90, 542), 'apple_2': (124, 487, 175, 542), 'apple_3': (207, 483, 260, 543),
                 'gold_1': (307, 484, 357, 542), 'gold_2': (392, 487, 442, 542), 'gold_3': (475, 485, 529, 543),
                 'twig_1': (714, 484, 771, 546), 'twig_2': (792, 483, 856, 546), 'twig_3': (875, 486, 937, 544)}.items():
        cut('today', f'or_{k}', b, 36 if k[0] in 'ag' else 40, pad=3)
    cut('today', 'or_berry_1', (598, 499, 653, 545), 30, keep_all=True, pad=3)
    cut('today', 'or_berry_2', (598, 599, 653, 645), 30, keep_all=True, pad=3)
    keyed('today', 'or_shadow_0', (985, 502, 1042, 530), 'diff', 40)
    # stones and a pinecone, other things that are clearly not fruit (sheet 100)
    for k, b in {'stones': (33, 168, 102, 234), 'rock': (118, 168, 188, 234), 'cone': (205, 168, 274, 234)}.items(): cut('missing', f'or_{k}', b, 40, pad=0)
    # ---- baskets (sheet 99)
    cut('basket', 'or_basket_back', (54, 222, 232, 332), 150, pad=4, paper=True)
    cut('basket', 'or_basket_front', (314, 217, 466, 327), 150, pad=4, paper=True)
    for i, b in enumerate([(45, 448, 216, 632), (252, 448, 423, 632), (459, 448, 630, 632), (665, 447, 837, 632), (872, 447, 1044, 632)]): cut('basket', f'or_basket_{i}', b, 150, pad=4, paper=True)
    cut('basket', 'or_basket_wob_1', (43, 769, 175, 901), 140, keep_all=True, pad=4, paper=True)
    cut('basket', 'or_basket_wob_2', (203, 770, 329, 903), 140, keep_all=True, pad=4, paper=True)
    keyed('basket', 'or_basket_glow', (856, 184, 1048, 376), 'glow', 150)
    # ---- trees (sheets 101, 100, 102)
    cut('today', 'or_tree', (637, 126, 863, 392), 220, pad=4, erase=[(832, 160, 866, 198)])
    for i, b in enumerate([(27, 540, 148, 678), (155, 540, 285, 678), (292, 540, 421, 678), (429, 540, 572, 678), (579, 540, 709, 678)], 1): cut('missing', f'or_shake_{i}', (b[0] + 3, b[1] + 3, b[2] - 3, b[3] - 3), 130, keep_all=True)
    cut('fx', 'or_tree_fruit', (594, 522, 733, 671), 140, keep_all=True)
    cut('fx', 'or_tree_fade', (920, 522, 1058, 671), 140, keep_all=True)
    # ---- people at work (sheets 98 and 100)
    for k, b in {'james_shake_1': (41, 542, 118, 649), 'james_shake_2': (126, 553, 184, 647), 'james_shake_3': (203, 552, 255, 647), 'james_catch_side': (287, 553, 347, 647),
                 'rachel_shake_1': (404, 555, 465, 647), 'rachel_shake_2': (480, 556, 531, 647), 'rachel_catch_1': (555, 557, 606, 646), 'rachel_catch_side': (646, 557, 697, 646),
                 'mochi_shake_1': (764, 542, 852, 649), 'mochi_shake_2': (867, 556, 925, 647), 'mochi_catch': (969, 570, 1036, 646)}.items():
        cut('bg', f'or_{k}', b, 54, keep_all=(k.startswith('mochi_shake_1') or k.startswith('james_shake_1')), pad=3)
    for k, b in {'james_run_n': (45, 796, 112, 890), 'james_run_s': (132, 800, 195, 888), 'james_run_e': (222, 796, 290, 890), 'james_run_w': (318, 801, 384, 888),
                 'rachel_run_n': (441, 804, 511, 888), 'rachel_run_s': (549, 804, 619, 888), 'rachel_run_e': (657, 804, 725, 888), 'mochi_run': (794, 818, 858, 888)}.items(): cut('bg', f'or_{k}', b, 54, pad=3)
    shake_x = [(45, 100), (107, 163), (170, 227), (233, 290)]
    catch_x = [(307, 363), (370, 427), (430, 487), (497, 553)]
    vict_x = [(570, 627), (633, 692)]
    for who, (y0, y1) in {'james': (753, 820), 'rachel': (830, 897)}.items():
        for i, (x0, x1) in enumerate(shake_x, 1): cut('missing', f'or_{who}_pose_shake_{i}', (x0, y0, x1, y1), 54, keep_all=True, pad=-2)
        for i, (x0, x1) in enumerate(catch_x, 1): cut('missing', f'or_{who}_pose_catch_{i}', (x0, y0, x1, y1), 54, keep_all=True, pad=-2)
        for i, (x0, x1) in enumerate(vict_x, 1): cut('missing', f'or_{who}_pose_win_{i}', (x0, y0, x1, y1), 54, keep_all=True, pad=-2)
    # ---- backdrops
    plain('scene', 'or_bg_far', (0, 0, 1085, 312), 960)
    for season, (x0, x1) in {'summer': (28, 265), 'spring': (355, 551), 'autumn': (577, 813), 'winter': (838, 1060)}.items():
        cut('bg', f'or_mid_{season}', (x0, 287, x1, 351), 240, keep_all=True, pad=2)
        plain('bg', f'or_ground_{season}', (x0 + 3, 361, x1 - 3, 393), 240, jpg=True)
    plain('fx', 'or_bg_dusk', (593, 205, 1058, 350), 960)
    plain('fx', 'or_tint_strip', (595, 366, 1056, 436), 960)
    # ---- effects (sheets 102 and 100)
    for i, b in enumerate([(25, 210, 78, 263), (95, 210, 137, 263), (151, 210, 203, 263), (215, 210, 267, 263), (33, 277, 75, 330), (95, 277, 137, 330), (160, 277, 195, 330), (220, 277, 261, 330)], 1): cut('fx', f'or_leaf_{i}', b, 24, pad=3)
    for i, b in enumerate([(318, 206, 376, 264), (392, 206, 450, 264), (466, 206, 526, 264), (318, 278, 376, 336), (392, 278, 450, 336)], 1): keyed('fx', f'or_spark_{i}', b, 'diff', 30)
    for i, b in enumerate([(26, 810, 120, 902), (134, 810, 226, 902), (240, 810, 332, 902)], 1): keyed('fx', f'or_star_{i}', b, 'diff', 80)
    cut('fx', 'or_combo_heart', (372, 818, 466, 892), 90, keep_all=True, pad=2)
    cut('fx', 'or_combo_banner', (482, 818, 694, 892), 150, keep_all=True, pad=2)
    for i, b in enumerate([(33, 366, 102, 436), (118, 366, 188, 436), (204, 366, 274, 436)], 1): keyed('missing', f'or_pop_{i}', b, 'diff', 40)
    for i, b in enumerate([(396, 366, 486, 436), (505, 366, 592, 436), (610, 366, 699, 436)], 1): keyed('missing', f'or_hit_{i}', b, 'diff', 50)
    for i, b in enumerate([(763, 365, 852, 438), (864, 365, 954, 438), (965, 365, 1055, 438), (763, 465, 852, 531), (864, 465, 954, 531), (965, 465, 1055, 531)], 1): keyed('missing', f'or_tap_{i}', b, 'diff', 50)
    for i, b in enumerate([(756, 600, 816, 662), (833, 600, 896, 662), (911, 600, 975, 662), (989, 600, 1054, 662)], 1): keyed('missing', f'or_shadow_{i}', b, 'diff', 40)
    for i, b in enumerate([(364, 154, 440, 238), (452, 154, 528, 238), (541, 154, 617, 238), (630, 154, 705, 238), (719, 154, 795, 238), (806, 154, 882, 238), (896, 154, 971, 238), (983, 154, 1059, 238)], 1): keyed('missing', f'or_shower_{i}', b, 'diff', 80)
    for i, b in enumerate([(875, 745, 932, 802), (940, 745, 998, 802), (1004, 745, 1060, 802)], 1): cut('missing', f'or_mult_{i}', b, 40, keep_all=True)

    entries = []
    for key, im, dw, jpg in jobs:
        if not jpg:
            bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
            if bb:
                im = im.crop(bb)
        if im.width > 640:
            im = im.resize((640, round(im.height * 640 / im.width)), Image.LANCZOS)
        ext = 'jpg' if jpg else 'png'
        if jpg:
            im.convert('RGB').save(os.path.join(OUT, f'{key}.jpg'), quality=88)
        else:
            im.save(os.path.join(OUT, f'{key}.png'), optimize=True)
        entries.append({'key': key, 'file': f'{key}.{ext}', 'w': im.width, 'h': im.height, 'dw': dw or max(8, round(im.width / 2))})
    add_season_trees(entries)
    with open(os.path.join(ROOT, 'src', 'game', 'spriteListOrchard.ts'), 'w') as f:
        f.write('// Generated by tools/slice_orchard.py. Do not edit by hand.\n')
        f.write('export const ORCHARD_SPRITES = ' + json.dumps(entries, indent=2) + ' as const;\n')
    print('wrote', len(entries))


if __name__ == '__main__':
    main()
