"""Cuts the Matcha Masters interface art: panel frames, order tickets, buttons, work surface pieces, hearts, tip jar,
plate, cup and ribbons (sheets 106 to 109, saved as art/source/sheet_mm_*.jpg). Run:  python3 tools/slice_matcha_ui.py
Writes mm_* sprites (native size) and src/game/spriteListMatcha.ts. Frames, tickets, buttons, slots and tracks are meant
to be drawn with Phaser nine slice so they stretch cleanly."""
import importlib.util, json, os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('s41', os.path.join(HERE, 'slice_sheets41_45.py'))
s41 = importlib.util.module_from_spec(spec); spec.loader.exec_module(s41)
ROOT, OUT = s41.ROOT, s41.OUT
SH = {k: s41.Sheet(f'sheet_mm_{k}.jpg') for k in ('work', 'buttons', 'panels')}
ICONS = Image.open(os.path.join(ROOT, 'art', 'source', 'sheet_mm_icons.jpg')).convert('RGB')
jobs = []


def cut(sh, key, box, pad=3, keep_all=False):
    x0, y0, x1, y1 = box
    jobs.append((key, SH[sh].cutbox('o', x0 - pad, y0 - pad, x1 + pad, y1 + pad, keep_all=keep_all)))


def checker(key, box, glass=False):
    """The icon sheet has a checkerboard baked in: flood both greys away from the box edge."""
    a = np.array(ICONS.crop(box)).astype(int)
    spread = a.max(-1) - a.min(-1)
    lum = a.mean(-1)
    bg = (spread < 14) & (lum > 118)
    lab, _ = ndimage.label(bg)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    out = np.isin(lab, list(edge))
    if glass:  # a glass jar shows the checkerboard through it, so take the grey squares out everywhere
        out |= (spread < 10) & (lum > 118) & (lum < 200)
    alpha = np.where(out, 0, 255).astype(np.uint8)
    alpha = ndimage.binary_erosion(ndimage.binary_opening(alpha > 0, iterations=1), iterations=1).astype(np.uint8) * 255
    jobs.append((key, Image.fromarray(np.dstack([a.astype(np.uint8), alpha]), 'RGBA')))


def full_track():
    """The meter track runs under the green band on the sheet, so its right end is the left end mirrored."""
    im = SH['work'].cutbox('o', 52, 732, 600, 838).convert('RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    im = im.crop(bb)
    cap = 46
    left = im.crop((0, 0, cap, im.height))
    mid = im.crop((cap, 0, cap + 1, im.height)).resize((300, im.height))
    out = Image.new('RGBA', (cap * 2 + 300, im.height))
    out.paste(left, (0, 0)); out.paste(mid, (cap, 0)); out.paste(left.transpose(Image.FLIP_LEFT_RIGHT), (cap + 300, 0))
    jobs.append(('mm_track', out))


def main():
    # frames and tickets (sheet 108)
    cut('panels', 'mm_panel_on', (55, 143, 361, 398), pad=4)
    cut('panels', 'mm_panel_off', (395, 143, 701, 398), pad=4)
    cut('panels', 'mm_ticket_empty', (53, 497, 273, 612))
    cut('panels', 'mm_ticket_on', (298, 482, 516, 612))
    cut('panels', 'mm_ticket_combo', (545, 482, 771, 612))
    cut('panels', 'mm_rail', (55, 757, 766, 792), pad=3)
    # buttons (sheet 107)
    for i, (n, x0, x1) in enumerate([('normal', 105, 238), ('pressed', 105, 238), ('off', 105, 238)]):
        y = [(105, 160), (185, 241), (265, 321)][i]
        cut('buttons', f'mm_ing_{n}', (x0, y[0], x1, y[1]))
    cols = [(595, 742), (753, 900), (910, 1058)]
    for name, (y0, y1) in {'clear': (118, 163), 'pass': (265, 310), 'plate': (411, 456), 'steam': (558, 603)}.items():
        for st, (x0, x1) in zip(('normal', 'pressed', 'off'), cols):
            cut('buttons', f'mm_btn_{name}_{st}', (x0, y0, x1, y1))
    cut('buttons', 'mm_chip_pause', (322, 766, 389, 836))
    cut('buttons', 'mm_chip_close', (714, 766, 781, 836))
    # work surface (sheet 106)
    cut('work', 'mm_slot_empty', (55, 143, 378, 341), pad=4)
    cut('work', 'mm_slot_full', (407, 143, 723, 341), pad=4)
    cut('work', 'mm_tile', (52, 470, 226, 653), pad=4)
    cut('work', 'mm_tile_next', (258, 468, 431, 656), pad=6)
    cut('work', 'mm_tile_done', (463, 470, 638, 653), pad=4)
    cut('work', 'mm_chip', (710, 508, 810, 606), pad=3)
    cut('work', 'mm_whisk', (876, 503, 927, 607), pad=3)
    cut('work', 'mm_heart_marker', (962, 528, 1018, 578), pad=3)
    cut('work', 'mm_band', (592, 735, 836, 836), pad=0)
    cut('work', 'mm_flash', (876, 668, 1046, 832), pad=4, keep_all=True)
    full_track()
    # hearts, jar, coin, plate, cup, ribbons (sheet 109, checkerboard background)
    for k, b in {'heart_full': (30, 70, 200, 220), 'heart_half': (300, 70, 470, 220), 'heart_empty': (560, 70, 735, 220),
                 'jar_empty': (252, 318, 346, 440), 'jar_half': (252, 318, 346, 440), 'jar_full': (436, 296, 530, 440), 'coin': (622, 322, 722, 412),
                 'plate': (45, 795, 266, 900), 'cup': (440, 780, 612, 910),
                 'ribbon_green': (22, 968, 362, 1122), 'ribbon_peach': (404, 1000, 745, 1122), 'ribbon_pink': (410, 1160, 742, 1350)}.items():
        if k == 'jar_empty':
            continue
        checker(f'mm_{k}', b, glass=k.startswith('jar'))
    checker('mm_jar_empty', (15, 265, 205, 455))  # the empty jar stands on its shelf, kept together

    entries = []
    for key, im in jobs:
        bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        if bb and key != 'mm_track':
            im = im.crop(bb)
        im.save(os.path.join(OUT, key + '.png'), optimize=True)
        entries.append({'key': key, 'file': key + '.png', 'w': im.width, 'h': im.height, 'dw': max(8, round(im.width / 2))})
    with open(os.path.join(ROOT, 'src', 'game', 'spriteListMatcha.ts'), 'w') as f:
        f.write('// Generated by tools/slice_matcha_ui.py. Do not edit by hand.\n')
        f.write('export const MATCHA_UI_SPRITES = ' + json.dumps(entries, indent=2) + ' as const;\n')
    print('wrote', len(entries))


if __name__ == '__main__':
    main()
