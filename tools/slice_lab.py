"""Cuts the Menu R&D Lab art (sheets L3 to L6, saved as art/source/lab_*.jpg): controls, glassware layers, garnishes,
latte art and tracing guides, recipe cards and stamps, menu board and extras.
Run:  python3 tools/slice_lab.py   Writes public/assets/sprites/labx_* and src/game/spriteListLab.ts.
All boxes are in sheet pixels (the sheets are 1085 x 992). Modes: 'cut' (flood the background from the box edges, keep
the main piece), 'all' (keep every piece), 'diff' (alpha from the distance to the box's background, for lines, glows and
pale pieces the flood would eat), 'card' (rectangular cards: detect the card, round the corners).
Frames of one animation are cut with a fixed box and not trimmed, so they share a canvas and anchor."""
import importlib.util, json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('s41', os.path.join(HERE, 'slice_sheets41_45.py'))
s41 = importlib.util.module_from_spec(spec); spec.loader.exec_module(s41)
ROOT, OUT = s41.ROOT, s41.OUT
SH = {k: s41.Sheet(f'lab_{k}.jpg') for k in ('l3_controls', 'l4_containers', 'l4_latte_art', 'l5_recipe_cards', 'l6_menu_boards')}
S3, S4, S4B, S5, S6 = (SH[k] for k in ('l3_controls', 'l4_containers', 'l4_latte_art', 'l5_recipe_cards', 'l6_menu_boards'))
jobs = []  # (key, image, dw, trim)


def bgcolor(a):
    ring = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    return np.median(ring, axis=0)


def clear_paper(im, lum=222):
    a = np.array(im).astype(int)
    paper = (a[..., :3].min(-1) > lum - 14) & ((a[..., :3].max(-1) - a[..., :3].min(-1)) < 40) & (a[..., :3].mean(-1) > lum - 6)
    a[..., 3] = np.where(paper, 0, a[..., 3])
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def erase(im, boxes, origin):
    """Clears small stray squares (annotation handles) given in sheet coordinates."""
    a = np.array(im)
    for x0, y0, x1, y1 in boxes:
        a[max(0, y0 - origin[1]):max(0, y1 - origin[1]), max(0, x0 - origin[0]):max(0, x1 - origin[0]), 3] = 0
    return Image.fromarray(a, 'RGBA')


def drop_dots(im, maxsize=9, lum=95):
    """Removes the black anchor dots the sheets draw around garnishes: small, dark, and not touching the piece."""
    a = np.array(im)
    solid = a[..., 3] > 40
    lab, n = ndimage.label(solid)
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if h <= maxsize and w <= maxsize and a[sl][..., :3][lab[sl] == i].mean() < lum:
            a[..., 3][lab == i] = 0
    return Image.fromarray(a, 'RGBA')


def add(key, sh, box, mode='cut', dw=None, pad=3, trim=True, strays=(), paper=False, gain=7, floor=14, white=False):
    x0, y0, x1, y1 = box
    if mode in ('cut', 'all'):
        im = sh.cutbox('o', x0 - pad, y0 - pad, x1 + pad, y1 + pad, keep_all=(mode == 'all'))
        if paper:
            im = clear_paper(im)
        org = (x0 - pad, y0 - pad)
    elif mode == 'diff':
        a = np.array(sh.img.crop((x0, y0, x1, y1)).convert('RGB')).astype(int)
        d = np.abs(a - bgcolor(a)).max(-1)
        al = np.clip((d - floor) * gain, 0, 255)
        if white:
            a = np.full_like(a, 255)
            a[..., 2] = 238
        im = Image.fromarray(np.dstack([a, al]).astype(np.uint8), 'RGBA')
        org = (x0, y0)
    elif mode == 'card':
        im = sh.img.crop((x0, y0, x1, y1)).convert('RGBA')
        org = (x0, y0)
    if strays:
        im = erase(im, strays, org)
    if key.startswith('garnish_') and key != 'garnish_stars':
        im = drop_dots(im)
    jobs.append((key, im, dw, trim))


STRAY = {'autumn': [(28, 766, 43, 781)], 'vip': [(640, 854, 656, 868)]}


def heal(sh, box, right_only=False, vertical=False):
    """Paints over an annotation mark on a card by blending, row by row, the pixels just left and right of it."""
    x0, y0, x1, y1 = box
    a = np.array(sh.img).astype(float)
    if vertical:  # blend the rows above and below, which keeps vertical border lines running through
        T = a[y0 - 3:y0 - 1, x0:x1].mean(0)
        B = a[y1 + 1:y1 + 3, x0:x1].mean(0)
        t = np.linspace(0, 1, y1 - y0)[:, None, None]
        a[y0:y1, x0:x1] = T[None] * (1 - t) + B[None] * t
        sh.img = Image.fromarray(a.astype(np.uint8))
        return
    L = a[y0:y1, x0 - 3:x0 - 1].mean(1)
    R = a[y0:y1, x1 + 1:x1 + 3].mean(1)
    if right_only:
        L = R
    t = np.linspace(0, 1, x1 - x0)[None, :, None]
    a[y0:y1, x0:x1] = L[:, None, :] * (1 - t) + R[:, None, :] * t
    sh.img = Image.fromarray(a.astype(np.uint8))


def card_alpha(key, sh, box, thr=22, radius=9, dw=180, strays=()):
    """A rectangular card: its outline is found by how far each pixel is from the paper, then the corners are rounded."""
    x0, y0, x1, y1 = box
    a = np.array(sh.img.crop((x0, y0, x1, y1)).convert('RGB')).astype(int)
    d = np.abs(a - bgcolor(a)).max(-1) > thr
    d = ndimage.binary_closing(d, iterations=2)
    d = ndimage.binary_fill_holes(d)
    lab, n = ndimage.label(d)
    sizes = ndimage.sum(d, lab, range(1, n + 1))
    big = lab == (1 + int(np.argmax(sizes)))
    # the card itself is where most rows and columns are solid: annotation lines and corner squares stick out beyond it
    cols = np.where(big.sum(0) > 0.6 * big.shape[0])[0]
    rows = np.where(big.sum(1) > 0.6 * big.shape[1])[0]
    bx0, bx1, by0, by1 = cols.min(), cols.max() + 1, rows.min(), rows.max() + 1
    crop = Image.fromarray(a[by0:by1, bx0:bx1].astype(np.uint8)).convert('RGBA')
    m = Image.new('L', crop.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, crop.width - 1, crop.height - 1), radius, fill=255)
    crop.putalpha(m)
    if strays:
        crop = erase(crop, strays, (x0 + bx0, y0 + by0))
    jobs.append((key, crop, dw, True))


def clean_bands(im):
    """Keeps only the big slanted bands: the thin graph paper lines and the corner handles around them are removed."""
    a = np.array(im)
    keep = ndimage.binary_opening(a[..., 3] > 60, structure=np.ones((7, 7)))
    keep = ndimage.binary_dilation(keep, iterations=3)
    soft = ndimage.gaussian_filter(keep.astype(float), 2.0)
    a[..., 3] = np.clip(soft * 170, 0, 255).astype(np.uint8)  # an even, soft white sheen
    return Image.fromarray(a, 'RGBA')


def scrub_signature(im, origin):
    """The footer plate of the menu board has a stray signature baked in: paint the plate's own wood over the lettering."""
    a = np.array(im).astype(int)
    x0, y0, x1, y1 = 213 - origin[0], 432 - origin[1], 362 - origin[0], 452 - origin[1]
    reg = a[y0:y1, x0:x1, :3]
    lum = reg.mean(-1)
    text = lum > 88
    text = ndimage.binary_dilation(text, iterations=3)
    base = np.array([105, 72, 55])
    rng = np.random.default_rng(3)
    noise = rng.integers(-4, 5, size=reg.shape)
    reg[text] = (base + noise)[text]
    a[y0:y1, x0:x1, :3] = reg
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def main():
    heal(S5, (36, 767, 66, 779), vertical=True)  # the autumn card's clipping mask handle
    heal(S5, (541, 826, 566, 872))  # the VIP card's hook line and handle
    # ---------------- L3 controls ----------------
    add('lab_thermo_full', S3, (68, 220, 162, 536), pad=3, dw=None)
    add('lab_thermo_tube', S3, (243, 250, 430, 362), pad=2)
    for k, b in {'n': (243, 417, 289, 463), 's': (310, 425, 355, 469), 'e': (251, 490, 288, 530), 'w': (310, 490, 355, 530)}.items():
        add(f'lab_thermo_knob_{k}', S3, b, pad=2)
    add('lab_thermo_mount', S3, (374, 402, 548, 536), mode='all', pad=2)
    add('lab_dial_full', S3, (606, 224, 812, 420), pad=3)
    cols = [(842, 942), (958, 1058)]
    rows = [(226, 305), (337, 415), (450, 530)]
    frames = {0: (0, 0), 40: (0, 1), 100: (1, 0), 150: (1, 1)}
    for deg, (r, c) in frames.items():
        add(f'lab_dial_needle_{deg}', S3, (cols[c][0], rows[r][0], cols[c][1], rows[r][1]), pad=0, trim=False)
    for deg, (x0, x1) in {180: (608, 710), 210: (723, 825), 240: (842, 942), 270: (958, 1058)}.items():
        add(f'lab_dial_needle_{deg}', S3, (x0, 450, x1, 530), pad=0, trim=False)
    add('lab_spot_off', S3, (56, 650, 238, 745), pad=2)
    add('lab_spot_on', S3, (298, 646, 506, 750), mode='diff', floor=16, gain=5)
    for i, x in enumerate([48, 168, 288, 410], 1):
        add(f'lab_chime_{i}', S3, (x + 4, 814, x + 112, 922), mode='diff', floor=10, gain=5, trim=False)
    add('lab_tag_frame', S3, (592, 655, 768, 922), pad=3)
    nx = [810, 858, 906, 954, 1002]
    for i, x in enumerate(nx):
        add(f'lab_tag_num_{(i + 1) % 10}', S3, (x - 3, 690, x + 43, 730), pad=0)
    for i, x in enumerate(nx):
        add(f'lab_tag_num_{(i + 6) % 10}', S3, (x - 3, 742, x + 43, 782), pad=0)

    # ---------------- L4 containers ----------------
    add('glass_mason_full', S4, (58, 234, 170, 418), pad=3)
    add('glass_mason_shadow', S4, (58, 464, 170, 553), pad=2)
    add('glass_mason_hull', S4, (324, 258, 362, 326), pad=2)
    add('glass_mason_fill', S4, (324, 352, 362, 400), pad=2)
    add('glass_mug_full', S4, (436, 254, 560, 371), pad=3)
    add('glass_mug_mask', S4, (436, 368, 560, 436), pad=2)
    add('glass_mug_hull', S4, (436, 436, 560, 552), pad=2)
    add('glass_mug_decal', S4, (704, 428, 738, 454), mode='diff', floor=8, gain=8)
    add('glass_mug_spec', S4, (700, 483, 738, 508), mode='diff', floor=8, gain=8)
    add('glass_togo_full', S4, (784, 264, 896, 424), pad=3)
    add('glass_togo_sleeve', S4, (62, 738, 180, 918), pad=3)
    add('glass_togo_lid', S4, (60, 640, 182, 722), pad=3)
    add('glass_togo_window', S4, (1024, 335, 1064, 400), pad=2)
    add('glass_togo_stamp', S4, (1026, 481, 1064, 510), pad=2)
    add('garnish_strawberry', S4, (616, 644, 700, 716), pad=2)
    add('garnish_mint', S4, (772, 646, 864, 716), pad=2)
    add('garnish_cinnamon', S4, (950, 646, 1042, 730), pad=2)
    add('garnish_sugarrim', S4, (600, 814, 706, 866), mode='diff', floor=14, gain=6)
    add('garnish_yuzu', S4, (776, 808, 880, 882), pad=2)
    add('garnish_stars', S4, (944, 812, 1036, 876), pad=2, mode='all')

    # ---------------- L4 latte art ----------------
    for k, (x0, x1) in {'bear': (38, 214), 'star': (251, 425), 'bunny': (465, 640), 'swirl': (678, 852), 'flower': (891, 1067)}.items():
        add(f'art_latte_{k}', S4B, (x0, 238, x1, 382), pad=2)
    for k, (x0, x1) in {'bear': (41, 213), 'star': (254, 424), 'bunny': (466, 637), 'swirl': (679, 849), 'flower': (894, 1066)}.items():
        add(f'guide_latte_{k}', S4B, (x0, 410, x1, 546), mode='diff', floor=22, gain=5, strays=[(x0, 408, x0 + 32, 434)])

    # ---------------- L5 recipe cards ----------------
    for k, b in {'classic': (40, 226, 234, 497), 'spring': (247, 226, 442, 497), 'summer': (456, 226, 654, 497),
                 'autumn': (40, 582, 234, 867), 'winter': (247, 582, 442, 867), 'vip': (456, 582, 654, 867)}.items():
        card_alpha(f'card_{k}', S5, b, strays=STRAY.get(k, ()))
    add('card_overlay_shimmer', S5, (700, 262, 856, 408), mode='diff', floor=26, gain=5, white=True)
    jobs[-1] = (jobs[-1][0], clean_bands(jobs[-1][1]), jobs[-1][2], jobs[-1][3])
    add('card_overlay_celebrate', S5, (890, 254, 1056, 414), mode='diff', floor=20, gain=6)
    add('card_plaque', S5, (714, 512, 1026, 588), pad=3)
    for i, b in enumerate([(704, 662, 800, 758), (842, 662, 924, 760), (968, 662, 1056, 754)], 1):
        add(f'chip_tier_{i}', S5, b, pad=2)
    add('seal_wax_red', S5, (764, 826, 860, 920), pad=2)
    add('seal_wax_teal', S5, (964, 826, 1056, 916), pad=2)

    # ---------------- L6 menu board ----------------
    add('menu_frame_base', S6, (36, 220, 534, 466), pad=3)
    jobs[-1] = (jobs[-1][0], scrub_signature(jobs[-1][1], (36 - 3, 220 - 3)), jobs[-1][2], jobs[-1][3])
    for k, (x0, x1) in {'bases': (40, 136), 'flavors': (140, 236), 'vip': (340, 434)}.items():
        add(f'menu_cat_{k}', S6, (x0, 568, x1, 606), pad=2)
    for i, (x0, x1) in enumerate([(44, 77), (80, 112), (116, 146), (151, 182), (406, 426), (430, 462), (466, 498), (502, 533)], 1):
        add(f'menu_icon_{i}', S6, (x0, 618, x1, 650), pad=2)
    add('menu_screen_warm', S6, (590, 220, 742, 420), pad=3)
    add('menu_screen_seasonal', S6, (760, 220, 912, 420), pad=3)
    for i, b in enumerate([(598, 506, 700, 570), (703, 508, 796, 566), (803, 508, 890, 570), (899, 508, 983, 570), (988, 504, 1082, 573)], 1):
        add(f'sprig_wide_{i}', S6, b, pad=2)
    for k, b in {'blossom': (238, 835, 302, 895), 'leaf': (311, 832, 379, 895), 'maple': (383, 835, 447, 895), 'pine': (455, 832, 522, 895)}.items():
        add(f'sprig_{k}', S6, b, pad=2)
    add('menu_easel', S6, (38, 708, 220, 902), pad=3)
    for k, b in {'flower': (238, 708, 302, 782), 'star': (310, 708, 375, 782), 'cup': (383, 708, 447, 782), 'bunny': (456, 708, 532, 782)}.items():
        add(f'chalk_art_{k}', S6, b, pad=2)
    # the digital screen glow lies on white graph paper: cyan means low red
    a = np.array(S6.img.crop((929, 225, 1069, 397)).convert('RGB')).astype(int)
    al = np.clip((a[..., 1] - a[..., 0] - 28) * 5, 0, 255)  # cyan means green well above red: the grey graph paper lines are not
    al = ndimage.gaussian_filter(ndimage.grey_closing(al, size=(5, 5)), 2)
    glow = np.zeros(a.shape[:2] + (4,), np.uint8)
    glow[..., 0], glow[..., 1], glow[..., 2], glow[..., 3] = 120, 232, 226, np.clip(al, 0, 255)
    jobs.append(('menu_screen_glow', Image.fromarray(glow, 'RGBA'), None, True))

    entries = []
    for key, im, dw, trim in jobs:
        if trim:
            bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
            if bb:
                im = im.crop(bb)
        if im.width > 640:
            im = im.resize((640, round(im.height * 640 / im.width)), Image.LANCZOS)
        name = 'labx_' + (key[4:] if key.startswith('lab_') else key)
        im.save(os.path.join(OUT, name + '.png'), optimize=True)
        entries.append({'key': name, 'file': name + '.png', 'w': im.width, 'h': im.height, 'dw': dw or default_dw(key, im)})
    with open(os.path.join(ROOT, 'src', 'game', 'spriteListLab.ts'), 'w') as f:
        f.write('// Generated by tools/slice_lab.py. Do not edit by hand.\n')
        f.write('export const LAB_SPRITES = ' + json.dumps(entries, indent=2) + ' as const;\n')
    print('wrote', len(entries))


def default_dw(key, im):
    """On screen widths: garnishes about 24 px, glass about 64 px tall, foam discs 90, menu frame 480, recipe cards 180."""
    if key.startswith('garnish_'): return 24 if im.width <= 2 * 80 else round(im.width * 24 / max(im.width, im.height))
    if key.startswith('glass_'): return max(8, round(im.width * 64 / im.height)) if im.height >= 60 else round(im.width / 2)
    if key.startswith('art_latte_'): return 90
    if key.startswith('guide_latte_'): return 90
    if key == 'menu_frame_base': return 480
    if key.startswith('card_') and not key.startswith('card_overlay') and key != 'card_plaque': return 180
    return max(8, round(im.width / 2))


if __name__ == '__main__':
    main()
