"""Cuts the couple, memory, surprise and townsfolk art from sheets 88 to 90.
Every cut is made with extra room so nothing is clipped (the flood fill keeps only the main piece).
Run:  python3 tools/slice_cafe3.py   Writes public/assets/sprites/cz_*.png and src/game/spriteListCafe3.ts."""
import importlib.util, json, os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('s41', os.path.join(HERE, 'slice_sheets41_45.py'))
s41 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(s41)
ROOT, OUT = s41.ROOT, s41.OUT
SHEETS = {'cafe': 'sheet_couple_cafe.jpg', 'town': 'sheet_townsfolk2.jpg'}
jobs = []


def one(S, key, sh, box, dw, keep_all=False, pad=None):
    P = pad if pad is not None else (6 if keep_all else 12)
    x0, y0, x1, y1 = box
    jobs.append((key, S[sh].cutbox('o', x0 - P, y0 - P, x1 + P, y1 + P, keep_all=keep_all), dw))


def plain(S, key, sh, box, dw, radius=10):
    im = S[sh].img.crop(box).convert('RGBA')
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=radius, fill=255)
    im.putalpha(mask)
    jobs.append((key, im, dw))


def main():
    S = {k: s41.Sheet(v) for k, v in SHEETS.items()}
    # working together
    plain(S, 'cz_brew', 'cafe', (33, 100, 227, 268), 110)
    plain(S, 'cz_serve', 'cafe', (243, 100, 423, 268), 110)
    one(S, 'cz_highfive', 'cafe', (440, 80, 625, 268), 100, keep_all=True)
    one(S, 'cz_toast', 'cafe', (632, 92, 820, 268), 100, keep_all=True)
    for i, b in enumerate([(35, 362, 160, 482), (175, 368, 268, 482), (292, 358, 396, 482), (410, 362, 502, 486), (520, 368, 612, 486), (625, 368, 718, 486), (730, 374, 816, 488)], 1):
        one(S, f'cz_team_{i}', 'cafe', b, 52, keep_all=True)
    # memories
    plain(S, 'cz_memorywall', 'cafe', (862, 148, 1162, 394), 66, radius=14)
    one(S, 'cz_plaque', 'cafe', (1182, 130, 1350, 238), 80, keep_all=True)
    one(S, 'cz_guestbook', 'cafe', (1178, 246, 1342, 368), 70, keep_all=True)
    one(S, 'cz_capsule', 'cafe', (1352, 186, 1502, 368), 70, keep_all=True)
    for i, b in enumerate([(868, 440, 926, 520), (934, 440, 996, 520), (1002, 440, 1066, 520), (1072, 440, 1148, 520), (1156, 440, 1232, 520), (1238, 440, 1304, 520)], 1):
        one(S, f'cz_frame_{i}', 'cafe', b, 30)
    one(S, 'cz_camera', 'cafe', (1332, 450, 1418, 510), 30)
    # surprise deliveries
    one(S, 'cz_gift', 'cafe', (38, 670, 162, 802), 28, keep_all=True)
    one(S, 'cz_vase', 'cafe', (172, 652, 292, 802), 26, keep_all=True)
    one(S, 'cz_note', 'cafe', (302, 688, 408, 792), 50, keep_all=True)
    for i, b in enumerate([(42, 878, 122, 958), (130, 878, 212, 958), (222, 878, 308, 958), (322, 878, 402, 958)], 1):
        one(S, f'cz_gift_{i}', 'cafe', b, 38)
    for i, b in enumerate([(443, 636, 548, 788), (553, 645, 658, 788), (660, 640, 768, 788), (768, 636, 868, 788)], 1):
        one(S, f'cz_moment_{i}', 'cafe', b, 60, keep_all=True)
    for i, x in enumerate([(448, 508), (535, 596), (596, 652), (662, 718), (732, 792), (802, 858)], 1):
        one(S, f'cz_emote_{i}', 'cafe', (x[0], 862, x[1], 952), 30)
    plain(S, 'cz_result', 'cafe', (898, 618, 1178, 782), 140, radius=14)
    plain(S, 'cz_invite', 'cafe', (903, 862, 1162, 986), 130, radius=14)
    plain(S, 'cz_waiting', 'cafe', (1208, 858, 1502, 986), 140, radius=14)
    # townsfolk standing, and celebrations
    row1, row2 = (165, 308), (350, 500)
    for name, x, row in [('girl', (22, 96), row1), ('boy', (244, 314), row1), ('oldman', (452, 530), row1), ('jogger', (664, 740), row1), ('dogwalker', (882, 978), row1), ('vendor', (1098, 1272), row1),
                         ('musician', (22, 102), row2), ('painter', (244, 318), row2), ('postal', (458, 530), row2), ('barista', (668, 742), row2), ('surfer', (888, 956), row2), ('tourist', (1102, 1180), row2)]:
        one(S, f'cz_t_{name}', 'town', (x[0], row[0], x[1], row[1]), 30, keep_all=(name in ('dogwalker', 'vendor')))
    one(S, 'cz_party_1', 'town', (38, 628, 548, 782), 220, keep_all=True)
    one(S, 'cz_party_2', 'town', (38, 800, 548, 930), 220, keep_all=True)
    one(S, 'cz_friends', 'town', (622, 652, 810, 842), 70, keep_all=True)
    one(S, 'cz_grandparents', 'town', (842, 652, 996, 832), 66, keep_all=True)
    one(S, 'cz_babies', 'town', (1082, 686, 1262, 928), 80, keep_all=True)
    # stars and confetti
    one(S, 'cz_stars', 'cafe', (1272, 604, 1468, 644), 100, keep_all=True)
    one(S, 'cz_stars_color', 'cafe', (1272, 644, 1468, 680), 100, keep_all=True)
    one(S, 'cz_confetti', 'cafe', (1208, 738, 1502, 796), 130, keep_all=True)

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
    with open(os.path.join(ROOT, 'src', 'game', 'spriteListCafe3.ts'), 'w') as f:
        f.write('// Generated by tools/slice_cafe3.py. Do not edit by hand.\n')
        f.write('export const CAFE3_SPRITES = ' + json.dumps(entries, indent=2) + ' as const;\n')
    print('wrote', len(entries))


if __name__ == '__main__':
    main()
