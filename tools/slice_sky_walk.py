"""Cuts the Weather and Sky Life sheet (95) and the expanded guest walk cycles and seated poses sheet (96).
Run:  python3 tools/slice_sky_walk.py   Writes sk_* sky sprites, cy_* walk frames, cs_* seated guests,
and src/game/spriteListSky.ts. Small pieces are kept at their native size, not blown up."""
import importlib.util, json, os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('s41', os.path.join(HERE, 'slice_sheets41_45.py'))
s41 = importlib.util.module_from_spec(spec); spec.loader.exec_module(s41)
ROOT, OUT = s41.ROOT, s41.OUT
SKY = s41.Sheet('sheet_weather_sky.jpg')
WALK = s41.Sheet('sheet_walk_expanded.jpg')
jobs = []  # (key, image, dw or None)


def cut(sh, key, box, dw=None, keep_all=False, pad=0):
    x0, y0, x1, y1 = box
    jobs.append((key, sh.cutbox('o', x0 - pad, y0 - pad, x1 + pad, y1 + pad, keep_all=keep_all), dw))


def keyed(sh, key, box, mode, dw=None):
    """Lifts glows, flakes and ripples off a coloured tile: the alpha follows how far each pixel departs from the tile."""
    a = np.array(sh.img.crop(box).convert('RGB')).astype(int)
    ring = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(ring, axis=0)
    if mode == 'bright':  # lighter than the tile: ripples, flakes
        d = (a - bg).mean(-1)
        al = np.clip((d - 14) * 9, 0, 255)
    else:  # glows on a dark tile: anything much brighter than the dark navy
        d = (a - bg).max(-1)
        al = np.clip((d - 40) * 4, 0, 255)
    out = np.dstack([a, al]).astype(np.uint8)
    jobs.append((key, Image.fromarray(out, 'RGBA'), dw))


def split(sh, prefix, box, minh=24, order='ydown'):
    """Cuts every separate piece inside a box (for loose pieces on the paper), numbered in reading order."""
    x0, y0, x1, y1 = box
    crop = sh.img.crop(box)
    a = np.array(crop).astype(int)
    mask = (a.mean(-1) < 200) | ((a.max(-1) - a.min(-1)) > 40)
    mask = ndimage.binary_closing(mask, iterations=2)
    mask = ndimage.binary_fill_holes(mask)
    lab, n = ndimage.label(mask)
    boxes = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        if (lab[sl] == i + 1).sum() < 160 or sl[0].stop - sl[0].start < minh or sl[1].stop - sl[1].start < minh:
            continue
        boxes.append((sl[1].start + x0, sl[0].start + y0, sl[1].stop + x0, sl[0].stop + y0))
    boxes.sort(key=lambda b: (b[0] // 30, b[1]))
    for n_, b in enumerate(boxes, 1):
        cut(sh, f'{prefix}_{n_}', b, pad=3)
    return len(boxes)


def main():
    # ---- sky life
    for i, x in enumerate([(33, 158, 79, 202), (88, 158, 134, 202), (144, 158, 189, 202), (199, 158, 245, 202)], 1): cut(SKY, f'sk_gull_{i}', x)
    for i, x in enumerate([(33, 233, 79, 277), (88, 233, 134, 277), (144, 233, 189, 277)], 1): cut(SKY, f'sk_perch_{i}', x)
    n = split(SKY, 'sk_finch', (214, 153, 295, 315)); print('finches', n)
    for i, x in enumerate([(316, 158, 362, 202), (372, 158, 418, 202), (428, 158, 474, 202), (486, 158, 532, 202)], 1): cut(SKY, f'sk_bfly_{i}', x)
    for i, x in enumerate([(316, 233, 362, 277), (372, 233, 418, 277), (428, 233, 474, 277)], 1): cut(SKY, f'sk_bperch_{i}', x)
    n = split(SKY, 'sk_bwide', (310, 308, 540, 350)); print('wide butterflies', n)
    # fireflies on dark tiles
    n = 0
    for i, x in enumerate([(32, 385, 90, 453), (92, 385, 150, 453), (152, 385, 212, 453), (214, 385, 262, 453), (262, 385, 303, 453)], 1): keyed(SKY, f'sk_ffly_{i}', x, 'glow')
    # rain and snow bits
    for i, x in enumerate([(575, 336, 622, 384), (634, 336, 681, 384), (692, 336, 739, 384)], 1): keyed(SKY, f'sk_ripple_{i}', x, 'bright')
    for r, (y0, y1) in enumerate([(337, 368), (369, 402), (403, 434)]):
        for c, (x0, x1) in enumerate([(952, 986), (987, 1022), (1023, 1058)]): keyed(SKY, f'sk_flake_{r * 3 + c + 1}', (x0, y0, x1, y1), 'bright')
    keyed(SKY, 'sk_snowtile_1', (833, 336, 881, 384), 'bright')
    keyed(SKY, 'sk_snowtile_2', (890, 336, 938, 384), 'bright')
    # event decor
    cut(SKY, 'sk_lights_globe', (23, 526, 228, 580), keep_all=True)
    cut(SKY, 'sk_lights_star', (23, 601, 228, 627), keep_all=True)
    cut(SKY, 'sk_lights_bunting', (23, 642, 228, 686), keep_all=True)
    cut(SKY, 'sk_banner_study', (762, 528, 1062, 610))
    cut(SKY, 'sk_sun', (930, 636, 978, 680))
    # ---- walk cycles
    rows = {'granny': [(27, 182, 74, 280), (88, 182, 135, 279), (148, 182, 195, 279), (210, 182, 258, 281)],
            'grannyb': [(30, 294, 71, 391), (94, 293, 133, 392), (153, 294, 193, 391), (214, 294, 259, 392)],
            'mail': [(295, 182, 336, 281), (354, 182, 398, 281), (416, 182, 460, 281), (478, 182, 524, 281)],
            'mailb': [(295, 295, 336, 392), (355, 295, 398, 392), (417, 295, 461, 392), (480, 295, 523, 392)],
            'cam': [(26, 480, 71, 585), (88, 480, 133, 585), (150, 480, 198, 581), (212, 480, 258, 583)],
            'coffee': [(296, 475, 348, 583), (358, 475, 407, 584), (421, 475, 468, 585), (480, 475, 527, 585)]}
    for k, boxes in rows.items():
        for i, b in enumerate(boxes, 1): cut(WALK, f'cy_{k}_{i}', b, pad=4)
    for i, b in enumerate([(696, 501, 764, 554), (780, 500, 856, 554)], 1): cut(WALK, f'cy_capy_{i}', b, pad=4)
    for i, b in enumerate([(559, 500, 603, 551), (623, 500, 666, 550)], 1): cut(WALK, f'cy_drone_{i}', b, pad=4)
    for i, b in enumerate([(889, 491, 939, 567), (947, 491, 998, 568), (1004, 492, 1066, 567)], 1): cut(WALK, f'cy_crane_{i}', b, pad=4)
    # ---- seated guests, two rows of poses
    for r, (y0, y1) in enumerate([(733, 821), (825, 912)], 1):
        for k, boxes in {'granny': [(29, 77), (91, 139)], 'mail': [(173, 221), (234, 277), (290, 339)], 'cam': [(378, 436), (440, 494)],
                         'coffee': [(529, 590), (594, 657)], 'crane': [(692, 744), (746, 812)], 'boy': [(819, 869)]}.items():
            for i, (x0, x1) in enumerate(boxes, 1): cut(WALK, f'cs_{k}_{r}{"abc"[i - 1]}', (x0, y0, x1, y1), pad=3)

    entries = []
    for key, im, dw in jobs:
        bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        if bb:
            im = im.crop(bb)
        if im.width > 520:
            im = im.resize((520, round(im.height * 520 / im.width)), Image.LANCZOS)
        im.save(os.path.join(OUT, key + '.png'), optimize=True)
        entries.append({'key': key, 'file': key + '.png', 'w': im.width, 'h': im.height, 'dw': dw or max(8, round(im.width / 2))})
    with open(os.path.join(ROOT, 'src', 'game', 'spriteListSky.ts'), 'w') as f:
        f.write('// Generated by tools/slice_sky_walk.py. Do not edit by hand.\n')
        f.write('export const SKY_SPRITES = ' + json.dumps(entries, indent=2) + ' as const;\n')
    print('wrote', len(entries))


if __name__ == '__main__':
    main()
