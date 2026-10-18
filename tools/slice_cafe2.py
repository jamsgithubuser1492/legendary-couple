"""Cuts the café management art from sheets 75 to 87 (staff, kitchen, counters, couches, pets, goods, gacha, events, latte art).

Boxes are in sheet pixels and cutbox() floods the cream background away from the edges. Four direction pieces are cut as
_fl, _fr, _bl and _br: a rotation of 0, 90, 180 or 270 degrees shows front left, front right, back right or back left.
Floor tiles are turned into isometric diamonds. Run:  python3 tools/slice_cafe2.py
Writes public/assets/sprites/cy_*.png and src/game/spriteListCafe2.ts.
"""
import importlib.util, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('s41', os.path.join(HERE, 'slice_sheets41_45.py'))
s41 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(s41)
ROOT, OUT = s41.ROOT, s41.OUT

SHEETS = {k: f'sheet_cafe_{k}.jpg' for k in ['baristas', 'cozy', 'anchors', 'goods2', 'mail_lantern', 'luckycat', 'chalkboard', 'router', 'board_b', 'study', 'latte_kit']}
jobs = []


def one(S, key, sh, box, dw, keep_all=False):
    jobs.append((key, S[sh].cutbox('o', *box, keep_all=keep_all), dw))


def four(S, key, sh, x0, x1, x2, x3, yt, yt2, yb, yb2, dw):
    """FL FR on the top row, BL BR on the bottom row."""
    for suf, (a, b, c, d) in zip(('fl', 'fr', 'bl', 'br'), [(x0, yt, x1, yt2), (x2, yt, x3, yt2), (x0, yb, x1, yb2), (x2, yb, x3, yb2)]):
        one(S, f'{key}_{suf}', sh, (a, b, c, d), dw)


def plain(S, sh, box, radius=8):
    im = S[sh].img.crop(box).convert('RGBA')
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=radius, fill=255)
    im.putalpha(mask)
    return im


def dashes(S, sh, box, thr=175):
    """Dotted stencil guides: the dark dashes become the alpha, in one brown."""
    im = S[sh].img.crop(box).convert('RGB')
    a = np.array(im).astype(int)
    m = a.mean(-1) < thr
    m = ndimage.binary_dilation(m, iterations=1)
    out = np.zeros(a.shape[:2] + (4,), np.uint8)
    out[..., 0], out[..., 1], out[..., 2] = 122, 90, 62
    out[..., 3] = m * 255
    return Image.fromarray(out)


def creamcut(S, sh, box):
    """Grey appliances: only the cream sheet colour (and its grid lines) counts as background."""
    im = S[sh].img.crop(box).convert('RGB')
    a = np.array(im).astype(int)
    bg = (np.abs(a - np.array([241, 236, 210])).max(-1) < 24) & ((a[..., 0] - a[..., 2]) > 14)
    lab, _ = ndimage.label(bg)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ~np.isin(lab, list(edge))
    fg = ndimage.binary_fill_holes(ndimage.binary_opening(fg, iterations=1))
    l2, n = ndimage.label(fg)
    if n > 1:
        sizes = ndimage.sum(fg, l2, range(1, n + 1))
        fg = np.isin(l2, [i + 1 for i, z in enumerate(sizes) if z > 0.1 * sizes.max()])
    out = im.convert('RGBA')
    out.putalpha(Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)))
    return out


def whiteflood(S, sh, box):
    """Pieces drawn on a baked in checkerboard: flood the pale, colourless background from the edges."""
    im = S[sh].img.crop(box).convert('RGB')
    a = np.array(im).astype(int)
    bg = (a.max(-1) - a.min(-1) < 26) & (a.mean(-1) > 165)
    lab, _ = ndimage.label(bg)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ~np.isin(lab, list(edge))
    fg = ndimage.binary_opening(fg, iterations=1)
    l2, n = ndimage.label(fg)
    if n > 1:
        sizes = ndimage.sum(fg, l2, range(1, n + 1))
        fg = l2 == (1 + int(np.argmax(sizes)))
    out = im.convert('RGBA')
    out.putalpha(Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)))
    return out


def diamond(S, key, sh, box, inset=6, size=128):
    x0, y0, x1, y1 = box
    im = S[sh].img.crop((x0 + inset, y0 + inset, x1 - inset, y1 - inset)).convert('RGBA')
    sq = min(im.size)
    im = im.crop((0, 0, sq, sq)).resize((256, 256), Image.LANCZOS)
    rot = im.rotate(45, expand=True, resample=Image.BICUBIC, fillcolor=(0, 0, 0, 0))
    mask = Image.new('L', im.size, 255).rotate(45, expand=True, resample=Image.BICUBIC)
    rot.putalpha(mask)
    jobs.append((key, rot.resize((size, size), Image.LANCZOS).resize((size, size // 2), Image.LANCZOS), size // 2))


def main():
    S = {k: s41.Sheet(v) for k, v in SHEETS.items()}
    # staff, four turns (sheet 76)
    for name, xs in (('manager', (62, 140, 172, 255)), ('brewmaster', (330, 410, 435, 520)), ('apprentice', (592, 672, 702, 782)), ('petsitter', (855, 935, 965, 1045))):
        four(S, f'cy_staff_{name}', 'baristas', *xs, 138, 268, 270, 395, 34)
    four(S, 'cy_tray', 'baristas', 68, 155, 328, 420, 468, 575, 585, 700, 34)
    one(S, 'cy_work_brew', 'baristas', (56, 758, 145, 855), 40)
    one(S, 'cy_work_register', 'baristas', (326, 765, 416, 850), 40)
    one(S, 'cy_work_milk', 'baristas', (590, 765, 680, 855), 36)
    # kitchen and counters (sheet 77)
    for suf, b in zip(('fl', 'fr', 'bl', 'br'), [(50, 138, 154, 264), (166, 138, 270, 264), (50, 266, 154, 380), (166, 266, 270, 380)]):
        jobs.append((f'cy_oven_{suf}', creamcut(S, 'anchors', b), 56))
    jobs.append(('cy_fridge', creamcut(S, 'anchors', (596, 136, 806, 382)), 90))
    four(S, 'cy_pos', 'anchors', 52, 156, 166, 272, 462, 568, 574, 682, 62)
    four(S, 'cy_pickup', 'anchors', 588, 692, 695, 802, 480, 572, 578, 668, 58)
    four(S, 'cy_cart', 'anchors', 52, 146, 162, 252, 755, 850, 855, 942, 56)
    # couches, pets, tea (sheet 78)
    four(S, 'cy_loveseat', 'cozy', 52, 152, 168, 268, 148, 266, 272, 388, 62)
    four(S, 'cy_sofa', 'cozy', 322, 422, 432, 532, 148, 266, 272, 388, 62)
    four(S, 'cy_wicker', 'cozy', 588, 692, 698, 802, 148, 266, 272, 388, 62)
    four(S, 'cy_catchair', 'cozy', 866, 956, 972, 1062, 148, 266, 272, 388, 46)
    four(S, 'cy_catbed', 'cozy', 52, 156, 168, 272, 484, 556, 594, 662, 56)
    four(S, 'cy_tunnel', 'cozy', 338, 442, 448, 552, 488, 568, 592, 668, 56)
    four(S, 'cy_foodbowl', 'cozy', 604, 706, 708, 808, 495, 562, 598, 668, 50)
    four(S, 'cy_scratch', 'cozy', 876, 944, 980, 1058, 484, 582, 592, 692, 34)
    four(S, 'cy_tea', 'cozy', 312, 416, 418, 520, 778, 848, 852, 925, 52)
    # goods (sheet 79)
    for k, b, dw in [('curry', (55, 150, 152, 255), 34), ('focaccia', (318, 160, 422, 250), 38), ('hamcroissant', (592, 160, 692, 255), 36), ('baguette', (858, 158, 962, 255), 38),
                     ('bobajar', (68, 466, 165, 566), 34), ('condensed', (342, 478, 420, 566), 28), ('yuzu', (606, 478, 684, 572), 24), ('oatmilk', (862, 466, 952, 572), 30),
                     ('tallboba', (286, 768, 350, 860), 24), ('tote', (492, 774, 582, 860), 32), ('box_artisan', (755, 740, 845, 825), 38), ('box_plain', (990, 740, 1065, 825), 36),
                     ('crate_bottles', (880, 830, 972, 900), 40), ('crate_berries', (985, 830, 1072, 900), 40), ('box_green', (765, 825, 852, 902), 38)]:
        one(S, f'cy_g_{k}', 'goods2', b, dw)
    # island anchors (sheet 80)
    one(S, 'cy_mailbox', 'mail_lantern', (578, 140, 832, 382), 60)
    one(S, 'cy_mailbox_flag', 'mail_lantern', (835, 140, 1085, 382), 60)
    one(S, 'cy_lantern', 'mail_lantern', (38, 495, 158, 668), 30)
    for i, b in enumerate([(425, 500, 525, 672), (578, 500, 685, 672), (425, 722, 542, 900), (578, 722, 685, 900)], 1):
        one(S, f'cy_lantern_f{i}', 'mail_lantern', b, 30)
    # lucky cat and gacha (sheet 81)
    for k, b in [('idle', (14, 148, 272, 382)), ('coin', (285, 125, 538, 382)), ('wobble', (550, 148, 808, 382)), ('burst', (820, 148, 1078, 382))]:
        one(S, f'cy_cat_{k}', 'luckycat', b, 62, keep_all=True)
    one(S, 'cy_jukebox', 'luckycat', (32, 782, 158, 932), 54)
    one(S, 'cy_bobalamp', 'luckycat', (392, 778, 495, 936), 40)
    one(S, 'cy_bobalamp2', 'luckycat', (532, 800, 640, 928), 40)
    for i, b in enumerate([(682, 790, 778, 942), (780, 790, 872, 942), (874, 790, 966, 942), (970, 790, 1064, 942)], 1):
        one(S, f'cy_sun_f{i}', 'luckycat', b, 40, keep_all=True)
    for k, b in [('empty', (520, 492, 592, 560)), ('common', (590, 492, 660, 560)), ('rare', (520, 592, 592, 660)), ('legendary', (590, 592, 662, 662))]:
        one(S, f'cy_bubble_{k}', 'luckycat', b, 40)
    one(S, 'cy_coin', 'luckycat', (50, 505, 132, 575), 26)
    # chalkboard (sheet 82)
    one(S, 'cy_sign', 'chalkboard', (28, 108, 325, 392), 70, keep_all=True)
    for k, b in [('latte', (400, 482, 714, 648)), ('hoppy', (728, 482, 1042, 648)), ('brew', (400, 660, 714, 826)), ('frappe', (728, 660, 1042, 826))]:
        jobs.append((f'cy_chalk_{k}', plain(S, 'chalkboard', b, 10), 150))
    # router (sheet 84)
    one(S, 'cy_router', 'router', (14, 148, 272, 368), 54, keep_all=True)
    one(S, 'cy_router_glow', 'router', (832, 158, 1085, 368), 70, keep_all=True)
    one(S, 'cy_router_badge', 'router', (955, 782, 1068, 892), 30)
    # community board (sheets 85 and 87)
    one(S, 'cy_board', 'board_b', (26, 700, 178, 905), 44, keep_all=True)
    one(S, 'cy_board_fr', 'board_b', (188, 700, 358, 905), 44, keep_all=True)
    one(S, 'cy_board_bl', 'board_b', (368, 700, 538, 905), 44, keep_all=True)
    one(S, 'cy_board_new', 'board_b', (548, 690, 722, 905), 44, keep_all=True)
    jobs.append(('cy_flyer_pet', plain(S, 'board_b', (270, 156, 590, 392), 4), 110))
    jobs.append(('cy_flyer_jazz', plain(S, 'board_b', (108, 322, 302, 546), 4), 80))
    jobs.append(('cy_flyer_latte', plain(S, 'board_b', (533, 335, 716, 540), 4), 80))
    for k, (x, y) in {'rain': (770, 640), 'pet': (877, 640), 'study': (987, 640), 'coffee': (770, 745), 'jazz': (877, 745), 'success': (987, 745), 'books': (883, 853), 'moon': (990, 853)}.items():
        one(S, f'cy_badge_{k}', 'board_b', (x, y, x + 76, y + 62), 24)
    # study slam (sheet 86)
    one(S, 'cy_stu_type', 'study', (608, 138, 704, 268), 34)
    one(S, 'cy_stu_cram', 'study', (700, 298, 852, 428), 46)
    one(S, 'cy_stu_study', 'study', (608, 438, 705, 558), 38)
    one(S, 'cy_clu_book', 'study', (608, 648, 722, 758), 26)
    one(S, 'cy_clu_pens', 'study', (858, 648, 962, 742), 24)
    one(S, 'cy_clu_laptop', 'study', (966, 646, 1080, 756), 26)
    one(S, 'cy_clu_boba', 'study', (608, 792, 718, 890), 22)
    one(S, 'cy_clu_papers', 'study', (964, 794, 1080, 902), 28)
    diamond(S, 'cy_floor_cables', 'study', (18, 108, 190, 275))
    diamond(S, 'cy_floor_strip', 'study', (18, 318, 190, 482))
    diamond(S, 'cy_floor_strip2', 'study', (200, 318, 372, 482))
    # floors from the cozy sheet
    for k, c in [('rattan', (745, 742, 823, 818)), ('pebble', (830, 742, 908, 818)), ('tatami2', (913, 742, 990, 818)), ('rug', (995, 822, 1070, 898))]:
        diamond(S, f'cy_floor_{k}', 'cozy', c)
    # latte art kit (sheet 83)
    jobs.append(('cy_latte_cup', whiteflood(S, 'latte_kit', (480, 136, 738, 354)), 130))
    for i, b in enumerate([(52, 472, 146, 570), (168, 472, 262, 570), (286, 472, 390, 570), (398, 472, 496, 570)], 1):
        one(S, f'cy_pitcher_{i}', 'latte_kit', b, 36)
    for k, b in [('cat', (565, 498, 665, 585)), ('frog', (703, 498, 795, 585)), ('heart', (836, 498, 928, 585))]:
        jobs.append((f'cy_stencil_{k}', dashes(S, 'latte_kit', b), 100))
    one(S, 'cy_star_empty', 'latte_kit', (308, 790, 352, 832), 20)
    one(S, 'cy_star_gold', 'latte_kit', (308, 884, 352, 930), 20)
    one(S, 'cy_sparkle', 'latte_kit', (566, 782, 634, 842), 30, keep_all=True)

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
    with open(os.path.join(ROOT, 'src', 'game', 'spriteListCafe2.ts'), 'w') as f:
        f.write('// Generated by tools/slice_cafe2.py. Do not edit by hand.\n')
        f.write('export const CAFE2_SPRITES = ' + json.dumps(entries, indent=2) + ' as const;\n')
    print('wrote', len(entries))


if __name__ == '__main__':
    main()
