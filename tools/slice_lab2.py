"""Cuts the R&D Lab L1 back room and L2 jar sheets (art/source/lab_l1_backroom.jpg, lab_l2_jars.jpg).
Run:  python3 tools/slice_lab2.py   Writes labx_* sprites and src/game/spriteListLab2.ts.
Everything is picked by hand. The peach cards behind each piece are not art, so they are flooded away; the clear
glass of the jars is made semi transparent where it only showed the card colour. Text printed on the swatch and band
rows is garbled, so bands keep only their text free upper part and swatches are flat colours sampled from the sheet."""
import importlib.util, json, os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('s41', os.path.join(HERE, 'slice_sheets41_45.py'))
s41 = importlib.util.module_from_spec(spec); spec.loader.exec_module(s41)
ROOT, OUT = s41.ROOT, s41.OUT
L1 = s41.Sheet('lab_l1_backroom.jpg')
L2 = s41.Sheet('lab_l2_jars.jpg')
jobs = []  # (key, image, dw, jpg)


def cut(sh, key, box, dw, keep_all=False, jpg=False):
    jobs.append((key, sh.cutbox('o', *box, keep_all=keep_all), dw, jpg))


def card_colour(sh, box):
    a = np.array(sh.img.crop(box)).astype(int)
    ring = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    return np.median(ring, axis=0)


def jar(key, box):
    """A jar with its card removed: glass that only shows the card colour becomes see through, highlights stay opaque."""
    im = L2.cutbox('o', *box)
    card = card_colour(L2, box)
    rgb = np.array(L2.img.crop(box)).astype(int)
    a = np.array(im)
    diff = np.abs(rgb - card).max(-1)
    soft = (diff < 26) & (a[..., 3] > 0)
    a[..., 3] = np.where(soft, np.minimum(a[..., 3], 70), a[..., 3])
    jobs.append((key, Image.fromarray(a, 'RGBA'), round((box[2] - box[0]) * 40 / (box[3] - box[1])), False))


def state_block(key, box, dw):
    c = np.array(L2.img.crop(box)).astype(int)
    out = np.zeros(c.shape[:2] + (4,), np.uint8)
    h, w = c.shape[:2]
    fill = np.median(c[h // 4:h * 3 // 4, w // 5:w * 3 // 5].reshape(-1, 3), axis=0)
    paper = np.median(np.concatenate([c[0], c[-1], c[:, 0], c[:, -1]]), axis=0)
    isfill = np.abs(c - fill).max(-1) < 36
    isfill = ndimage.binary_closing(isfill, iterations=3)
    lab, n = ndimage.label(isfill)
    if n:
        big = np.argmax(ndimage.sum(isfill, lab, range(1, n + 1))) + 1
        isfill = lab == big
    isfill = ndimage.binary_fill_holes(isfill)
    out[..., :3] = fill
    out[..., 3] = np.where(isfill, 255, 0)
    # keep anything clearly different from both paper and fill that touches the block (the New badge)
    extra = (np.abs(c - fill).max(-1) > 60) & (np.abs(c - paper).max(-1) > 60)
    extra = ndimage.binary_dilation(ndimage.binary_opening(extra, iterations=1), iterations=1) & ~isfill
    lab2, n2 = ndimage.label(extra)
    for i in range(1, n2 + 1):
        m = lab2 == i
        if m.sum() > 40:
            out[m, :3] = c[m]
            out[m, 3] = 255
    jobs.append((key, Image.fromarray(out, 'RGBA'), dw, False))


def selected(key, box, dw):
    c = np.array(L2.img.crop(box)).astype(int)
    green = (c[..., 1] - np.maximum(c[..., 0], c[..., 2]))
    al = np.clip((green - 10) * 7, 0, 255)
    out = np.dstack([c, al]).astype(np.uint8)
    jobs.append((key, Image.fromarray(out, 'RGBA'), dw, False))


def keyed(sh, key, box, dw, k=8, floor=10):
    """Lifts soft wisps or motes off their peach tile: alpha follows the difference from the tile colour."""
    c = np.array(sh.img.crop(box)).astype(int)
    bg = np.median(np.concatenate([c[0], c[-1], c[:, 0], c[:, -1]]), axis=0)
    d = np.abs(c - bg).max(-1)
    al = np.clip((d - floor) * k, 0, 255)
    jobs.append((key, Image.fromarray(np.dstack([c, al]).astype(np.uint8), 'RGBA'), dw, False))


def plain(sh, key, box, dw):
    jobs.append((key, sh.img.crop(box).convert('RGBA'), dw, False))


def main():
    # ---- L1 room: the dark framed picture, kept whole (its dark surround is part of the painting)
    room = L1.img.crop((16, 191, 576, 552)).convert('RGB')
    room = room.resize((1280, round(room.height * 1280 / room.width)), Image.LANCZOS)
    jobs.append(('labx_room', room, 960, True))
    for k, b in {'n': (632, 216, 820, 368), 's': (880, 216, 1064, 368), 'e': (634, 410, 822, 534), 'top': (880, 410, 1052, 528)}.items():
        cut(L1, f'labx_counter_{k}', b, 110)
    cut(L1, 'labx_counter_base_a', (68, 790, 246, 920), 110)
    cut(L1, 'labx_counter_base_b', (328, 790, 506, 920), 110)
    cut(L1, 'labx_door_closed', (618, 650, 698, 774), 40)
    cut(L1, 'labx_door_open', (712, 650, 790, 776), 40)
    for i, b in enumerate([(592, 826, 700, 912), (711, 826, 826, 912), (832, 826, 942, 912), (952, 826, 1060, 912)], 1):
        cut(L1, f'labx_cat_{i}', b, 36)
    keyed(L1, 'labx_fx_steam', (66, 652, 196, 716), 65, k=9, floor=18)
    keyed(L1, 'labx_fx_dust', (326, 652, 470, 740), 72, k=10, floor=24)
    plain(L1, 'labx_fx_steam_tile', (66, 652, 196, 716), 65)
    plain(L1, 'labx_fx_dust_tile', (326, 652, 470, 740), 72)
    # ---- L2 jars
    cols_a = [(43, 119), (161, 237), (280, 357), (399, 475)]
    rows_a = {'bases': (224, 339, ['matcha', 'espresso', 'earlgrey', 'turmeric']), 'flav1': (421, 536, ['strawberry', 'honey', 'yuzu', 'apple'])}
    for row, (y0, y1, ids) in rows_a.items():
        for (x0, x1), i in zip(cols_a, ids):
            jar(f'labx_jar_{i}', (x0 - 5, y0, x1 + 5, y1))
    for (x0, x1), i in zip(cols_a[:3], ['blossom', 'pumpkinspice', 'peppermint']):
        jar(f'labx_jar_{i}', (x0 - 5, 578, x1 + 5, 692))
    tops = [(43, 119, 'boba'), (157, 232, 'creamfoam'), (270, 343, 'blossomsprinkles'), (379, 453, 'rosepetals'), (483, 557, 'goldflakes'), (592, 663, 'cinnamon')]
    for x0, x1, i in tops:
        jar(f'labx_jar_{i}', (x0 - 5, 786, x1 + 5, 901))
    # state blocks: flat tinted squares drawn over grid paper, so rebuild them clean from the sheet colours
    state_block('labx_state_locked', (558, 244, 641, 324), 40)
    state_block('labx_state_new', (558, 364, 651, 447), 46)
    selected('labx_state_selected', (555, 480, 643, 567), 44)
    # bands and swatches
    rows = {'matcha': (218, 262), 'espresso': (267, 309), 'earlgrey': (315, 357), 'turmeric': (365, 409), 'strawberry': (415, 460), 'honey': (468, 512),
            'yuzu': (521, 565), 'apple': (573, 620), 'blossom': (627, 673), 'pumpkinspice': (681, 723), 'peppermint': (733, 775),
            'rosepetals': (783, 827), 'goldflakes': (833, 877), 'cinnamon': (885, 927)}
    for i, (y0, y1) in rows.items():
        h = y1 - y0
        plain(L2, f'labx_band_{i}', (874, y0 + 3, 1060, y0 + 3 + round(h * 0.45)), 93)
        sw = np.array(L2.img.crop((706, y0 + 3, 850, y1 - 3))).astype(int)
        lum = sw.mean(-1)
        spread = sw.max(-1) - sw.min(-1)
        ok = (lum < 235) | (spread > 40)  # drop the white printed labels
        col = np.median(sw[ok & (np.abs(sw - np.median(sw.reshape(-1, 3), axis=0)).max(-1) < 70)], axis=0)
        s = np.zeros((64, 64, 4), np.uint8)
        yy, xx = np.mgrid[0:64, 0:64]
        inside = ((xx - 31.5) ** 2 + (yy - 31.5) ** 2) < 30 ** 2
        grad = 1.0 + (0.18 * (31.5 - yy) / 31.5)
        s[..., :3] = np.clip(col * grad[..., None], 0, 255)
        s[..., 3] = np.where(inside, 255, 0)
        jobs.append((f'labx_swatch_{i}', Image.fromarray(s, 'RGBA'), 20, False))

    entries = []
    for key, im, dw, jpg in jobs:
        if not jpg:
            bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
            if bb:
                im = im.crop(bb)
        if im.width > 640 and not jpg:
            im = im.resize((640, round(im.height * 640 / im.width)), Image.LANCZOS)
        if jpg:
            im.convert('RGB').save(os.path.join(OUT, key + '.jpg'), quality=88)
            fn = key + '.jpg'
        else:
            im.save(os.path.join(OUT, key + '.png'), optimize=True)
            fn = key + '.png'
        entries.append({'key': key, 'file': fn, 'w': im.width, 'h': im.height, 'dw': dw})
    # the cat frames share one canvas, bottom centre anchored, so the loop does not jitter
    cats = [e for e in entries if e['key'].startswith('labx_cat_')]
    W = max(e['w'] for e in cats); H = max(e['h'] for e in cats)
    for e in cats:
        im = Image.open(os.path.join(OUT, e['file'])).convert('RGBA')
        c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        c.alpha_composite(im, ((W - im.width) // 2, H - im.height))
        c.save(os.path.join(OUT, e['file']), optimize=True)
        e['w'], e['h'] = W, H
    with open(os.path.join(ROOT, 'src', 'game', 'spriteListLab2.ts'), 'w') as f:
        f.write('// Generated by tools/slice_lab2.py. Do not edit by hand.\n')
        f.write('export const LAB2_SPRITES = ' + json.dumps(entries, indent=2) + ' as const;\n')
    print('wrote', len(entries))


if __name__ == '__main__':
    main()
