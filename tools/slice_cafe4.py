"""Cuts the couple poses (sheet 88), customer walk frames (sheets 72, 73) and townsfolk walking views (sheet 90).
Run:  python3 tools/slice_cafe4.py   Writes cp_*, cw_* and ct_* sprites and src/game/spriteListCafe4.ts."""
import importlib.util, json, os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('s41', os.path.join(HERE, 'slice_sheets41_45.py'))
s41 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(s41)
ROOT, OUT = s41.ROOT, s41.OUT
SHEETS = {'poses': 'sheet_couple_poses.jpg', 'c1': 'sheet_cafe_customers1.jpg', 'c2': 'sheet_cafe_customers2.jpg', 'town': 'sheet_townsfolk2.jpg'}
jobs = []  # (key, image, dw or None, target height or None)
D = 1.3  # the numbered preview was shown at 1.3x, so boxes below are in preview pixels


def cut(S, key, sh, box, pad=8, dw=None, hh=None, keep_all=True):
    x0, y0, x1, y1 = box
    jobs.append((key, S[sh].cutbox('o', x0 - pad, y0 - pad, x1 + pad, y1 + pad, keep_all=keep_all), dw, hh))


def preview(S, key, sh, b, dw, keep_all=True):
    cut(S, key, sh, tuple(round(v / D) for v in b), pad=7, dw=dw, keep_all=keep_all)


def main():
    S = {k: s41.Sheet(v) for k, v in SHEETS.items()}
    # ---- emotes and poses
    for k, b in {'wave': (1080, 120, 1195, 235), 'hug': (1200, 125, 1315, 240), 'highfive': (1325, 120, 1435, 235), 'cheer': (1440, 115, 1545, 235),
                 'kiss': (1080, 275, 1195, 390), 'laugh': (1205, 275, 1315, 390), 'tears': (1325, 280, 1435, 390), 'sleep': (1440, 275, 1545, 395),
                 'yawn': (1080, 430, 1190, 545), 'thumbs': (1205, 435, 1320, 550)}.items():
        preview(S, f'cp_e_{k}', 'poses', b, 40)
    for k, b in {'hands': (1590, 130, 1780, 300), 'side': (1800, 130, 1960, 300), 'dance': (1595, 360, 1780, 540), 'photo': (1800, 370, 1970, 540),
                 'idle': (510, 130, 665, 295), 'drink': (850, 110, 1025, 295), 'couch': (500, 345, 620, 490), 'bench': (720, 350, 830, 490), 'picnic': (935, 350, 1040, 490)}.items():
        preview(S, f'cp_{k}', 'poses', b, 50)
    # activity cards, one per area of life and per game
    for k, b in {'focus': (40, 835, 230, 985), 'learn': (595, 760, 730, 860), 'write': (590, 895, 730, 990), 'finance': (795, 780, 890, 915), 'romance': (940, 750, 1120, 860),
                 'bottle': (945, 895, 1125, 1000), 'social': (1180, 750, 1325, 860), 'clink': (1175, 905, 1340, 1005), 'matcha': (1400, 755, 1550, 860), 'barista': (1405, 905, 1550, 1005),
                 'crane': (1625, 760, 1790, 855), 'orchard': (1830, 760, 1960, 855), 'basket': (1830, 905, 1960, 1005)}.items():
        preview(S, f'cp_a_{k}', 'poses', b, 56)
    for k, b in {'hands': (40, 1095, 200, 1250), 'side': (215, 1095, 355, 1250), 'dance': (370, 1095, 520, 1250), 'photo': (525, 1095, 675, 1250), 'picnic': (690, 1095, 860, 1250),
                 'adventure': (872, 1095, 1045, 1250), 'beach': (1075, 1095, 1245, 1250), 'sunset': (1253, 1095, 1440, 1255), 'road': (1455, 1095, 1665, 1255)}.items():
        x0, y0, x1, y1 = (round(v / D) for v in b)
        im = S['poses'].img.crop((x0 + 2, y0 + 2, x1 - 2, y1 - 2)).convert('RGBA')  # painted scenes: a plain, rounded frame so no edge is lost
        m = Image.new('L', im.size, 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=10, fill=255)
        im.putalpha(m)
        jobs.append((f'cp_d_{k}', im, 90, None))

    # ---- customer walk frames, first row: frames 1 to 3 walk, a 4th is the view from behind
    R1 = (405, 545)
    walk = {
        'student': ('c1', [(37, 92), (110, 165), (183, 238), (257, 313)]), 'creative': ('c1', [(390, 443), (470, 523)]),
        'enthusiast': ('c1', [(573, 630), (660, 717), (743, 800)]),
        'gardener': ('c2', [(37, 92), (110, 165), (183, 238), (257, 313)]), 'scholar': ('c2', [(397, 450), (477, 527)]),
        'nomad': ('c2', [(573, 630), (660, 717), (743, 800)]), 'artist': ('c2', [(830, 887), (910, 967), (993, 1053)]),
    }
    for name, (sh, xs) in walk.items():
        for i, (a, b) in enumerate(xs, 1):
            cut(S, f'cw_{name}_{i}', sh, (a, R1[0], b, R1[1]), pad=6, hh=58, keep_all=False)

    # ---- townsfolk: six small views per card (front, two side, and three from behind)
    cards = {'girl': (15, 165), 'boy': (238, 165), 'oldman': (456, 165), 'jogger': (668, 165), 'dogwalker': (885, 165), 'vendor': (1100, 165),
             'musician': (15, 350), 'painter': (238, 350), 'postal': (456, 350), 'barista': (668, 350), 'surfer': (885, 350), 'tourist': (1100, 350)}
    rel = [(90, 122), (133, 165), (175, 207)]
    for name, (cx, cy) in cards.items():
        if name in ('oldman', 'postal', 'vendor', 'dogwalker'):
            continue  # their small views are not laid out the same way, so they keep their standing pose
        for r, ry in enumerate((43, 103)):
            for c, (a, b) in enumerate(rel):
                cut(S, f'ct_{name}_{r}{c}', 'town', (cx + a, cy + ry, cx + b, cy + ry + 55), pad=4, hh=52, keep_all=False)

    entries = []
    for key, im, dw, hh in jobs:
        bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        if bb:
            im = im.crop(bb)
        if hh:
            im = im.resize((max(1, round(im.width * hh * 2 / im.height)), hh * 2), Image.LANCZOS)
            dw = round(im.width / 2)
        else:
            want = dw * 2
            if im.width != want:
                im = im.resize((want, max(1, round(im.height * want / im.width))), Image.LANCZOS)
        im.save(os.path.join(OUT, key + '.png'), optimize=True)
        entries.append({'key': key, 'file': key + '.png', 'w': im.width, 'h': im.height, 'dw': dw})
    with open(os.path.join(ROOT, 'src', 'game', 'spriteListCafe4.ts'), 'w') as f:
        f.write('// Generated by tools/slice_cafe4.py. Do not edit by hand.\n')
        f.write('export const CAFE4_SPRITES = ' + json.dumps(entries, indent=2) + ' as const;\n')
    print('wrote', len(entries))


if __name__ == '__main__':
    main()
