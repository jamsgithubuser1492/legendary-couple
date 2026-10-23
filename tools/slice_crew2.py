"""Cuts the second batch of crew art (art/source/crew2_*.jpg): walk and tray carry loops, work loops, emotes,
oopsies, roster and skill interface pieces.  Run:  python3 tools/slice_crew2.py
Writes crewx_*, oops_* and cu_* sprites and src/game/spriteListCrew2.ts.
The sheets have mislabelled cells, so every figure is picked by hand (see the tables below).
Loops are normalised: every frame of a loop gets the same canvas, feet on the bottom edge and centred."""
import importlib.util, json, os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('s41', os.path.join(HERE, 'slice_sheets41_45.py'))
s41 = importlib.util.module_from_spec(spec); spec.loader.exec_module(s41)
ROOT, OUT = s41.ROOT, s41.OUT
NAMES = ['walk_tan_pip', 'walk_oren_juno', 'walk_hana_kenji', 'walk_maya_ollie', 'w1_tan_pip_work', 'w2_oren_juno_work', 'w3_hana_kenji_work',
         'w4_maya_ollie_work', 'c7_oopsies', 'r1_roster', 'r2_skills']
SH = {n: s41.Sheet(f'crew2_{n}.jpg') for n in NAMES}
EMO = Image.open(os.path.join(ROOT, 'art', 'source', 'crew2_c5_emotes.jpg')).convert('RGB')
entries = []
PERSON_H = 54


def cutbox(sheet, box, pad=3, keep_all=False):
    x0, y0, x1, y1 = box
    im = SH[sheet].cutbox('o', x0 - pad, y0 - pad, x1 + pad, y1 + pad, keep_all=keep_all)
    return trim(im)


def trim(im):
    bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    return im.crop(bb) if bb else im


def clear_paper(im, lum=222):
    """Removes paper showing through holes (inside a ring or handle) that the edge flood cannot reach."""
    a = np.array(im).astype(int)
    rgb = a[..., :3]
    paper = (rgb.min(-1) > lum - 14) & ((rgb.max(-1) - rgb.min(-1)) < 40) & (rgb.mean(-1) > lum - 6)
    a[..., 3] = np.where(paper, 0, a[..., 3])
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def save(key, im, dw=None, person=False):
    im = trim(im)
    if im.width > 640:
        im = im.resize((640, round(im.height * 640 / im.width)), Image.LANCZOS)
    im.save(os.path.join(OUT, key + '.png'), optimize=True)
    if dw is None:
        dw = round(im.width * PERSON_H / im.height) if person else max(8, round(im.width / 2))
    entries.append({'key': key, 'file': key + '.png', 'w': im.width, 'h': im.height, 'dw': dw})


def save_loop(prefix, frames, person_h=PERSON_H):
    """Frames share one canvas, feet on the bottom edge and centred, and one display scale for the whole loop."""
    frames = [trim(f) for f in frames]
    W = max(f.width for f in frames); H = max(f.height for f in frames)
    dw = round(W * person_h / H)
    for i, f in enumerate(frames, 1):
        c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        c.paste(f, ((W - f.width) // 2, H - f.height))
        c.save(os.path.join(OUT, f'{prefix}_{i}.png'), optimize=True)
        entries.append({'key': f'{prefix}_{i}', 'file': f'{prefix}_{i}.png', 'w': W, 'h': H, 'dw': dw})


def comps(sheet, y0, y1, minw=25, minh=40, maxw=140, maxh=140):
    sh = SH[sheet]
    bx = [c[:4] for c in sh.cs if minw <= c[2] - c[0] <= maxw and minh <= c[3] - c[1] <= maxh and y0 < c[1] < y1]
    bx.sort(key=lambda b: (round(b[1] / 50), b[0]))
    return bx


# ---------------------------------------------------------------- walks
PAIRS = {'walk_tan_pip': ('tan', 'pip'), 'walk_oren_juno': ('oren', 'juno'), 'walk_hana_kenji': ('hana', 'kenji'), 'walk_maya_ollie': ('maya', 'ollie')}
# second character's carry block: bottom row of the 4 direction sequence block, sheet pixels (same on every sheet)
CARRY_F = [(77, 853, 135, 932), (180, 853, 238, 932), (326, 853, 387, 932), (432, 853, 494, 932)]
CARRY_B = [(850, 853, 930, 932), (955, 853, 1025, 932)]
# first character's carry figures live in the tray block (y 470 to 695): (row 1 or 2, group 1 to 3, which of the pair)
TRAY = {'tan': {'b': [(2, 1, 0), (2, 1, 1)]},
        'oren': {'f': [(1, 1, 0), (1, 1, 1)], 'b': [(2, 3, 0), (2, 3, 1)]},
        'hana': {'f': [(1, 1, 0), (1, 1, 1)], 'b': [(2, 2, 1)]},
        'maya': {'f': [(1, 1, 0), (1, 1, 1)], 'b': [(2, 1, 0), (2, 1, 1)]}}
SECOND = {'pip': 'tan', 'juno': 'oren', 'kenji': 'hana', 'ollie': 'maya'}


def tray_box(sheet, row, group, which):
    bx = comps(sheet, 460, 700, 60, 90, 100, 130)
    sel = [b for b in bx if (b[1] < 580) == (row == 1) and (b[0] < 300) == (group == 1) and (300 <= b[0] < 560) == (group == 2) and (560 <= b[0] < 820) == (group == 3)]
    sel.sort()
    return sel[which] if which < len(sel) else None


def walks():
    for sheet, (first, second) in PAIRS.items():
        bx = comps(sheet, 120, 420)
        rows = {}
        for b in bx:
            rows.setdefault(0 if b[1] < 270 else 1, []).append(b)
        for r, who in enumerate((first, second)):
            row = sorted(rows[r])
            assert len(row) == 8, (sheet, who, len(row))
            save_loop(f'crewx_{who}_walk_f', [cutbox(sheet, b) for b in row[:4]])
            save_loop(f'crewx_{who}_walk_b', [cutbox(sheet, b) for b in row[4:]])
        for who in (first,):
            for d, picks in TRAY[who].items():
                frames = []
                for row, group, which in picks:
                    b = tray_box(sheet, row, group, which)
                    if b:
                        frames.append(cutbox(sheet, b))
                if frames:
                    save_loop(f'crewx_{who}_carry_{d}', frames)
        save_loop(f'crewx_{second}_carry_f', [cutbox(sheet, b, pad=2, keep_all=False) for b in CARRY_F])
        save_loop(f'crewx_{second}_carry_b', [cutbox(sheet, b, pad=2) for b in CARRY_B])


# ---------------------------------------------------------------- work loops
WORK_SHEETS = ['w1_tan_pip_work', 'w2_oren_juno_work', 'w3_hana_kenji_work', 'w4_maya_ollie_work']
# who -> (sheet, {view: [box indices into the sheet's detected boxes, read left to right and top down]})
WORK = {
    'tan': ('w1_tan_pip_work', {'fl': [0, 1], 'fr': [2, 3], 'bl': [4, 6], 'br': [7, 5]}),
    'pip': ('w1_tan_pip_work', {'fl': [16, 17], 'fr': [18, 19]}),
    'oren': ('w2_oren_juno_work', {'fl': [0, 4], 'fr': [1, 5], 'bl': [2], 'br': [3]}),
    'juno': ('w2_oren_juno_work', {'fl': [8, 10], 'fr': [16, 18], 'br': [20, 22]}),
    'hana': ('w3_hana_kenji_work', {'fl': [0], 'fr': [1], 'bl': [2], 'br': [3]}),
    'kenji': ('w3_hana_kenji_work', {'fl': [6, 8, 10, 12], 'bl': [14, 16], 'br': [18, 20]}),
    'maya': ('w4_maya_ollie_work', {'fl': [0, 6], 'fr': [1, 7], 'bl': [8], 'br': [5, 9]}),
    'ollie': ('w4_maya_ollie_work', {'fl': [12, 13, 14, 15], 'bl': [16, 18], 'br': [20, 22]}),
}


def work_boxes(sheet):
    sh = SH[sheet]
    bx = [c[:4] for c in sh.cs if 40 <= c[2] - c[0] <= 200 and 50 <= c[3] - c[1] <= 150 and c[1] > 130 and c[3] < 720]
    bx.sort(key=lambda b: (round(b[1] / 55), b[0]))
    return bx


def work():
    cache = {n: work_boxes(n) for n in WORK_SHEETS}
    for who, (sheet, views) in WORK.items():
        for view, idx in views.items():
            frames = []
            for i in idx:
                b = cache[sheet][i]
                im = cutbox(sheet, b, pad=2, keep_all=True)
                frames.append(im)
            save_loop(f'crewx_{who}_work_{view}', frames, person_h=78)


# ---------------------------------------------------------------- emotes
EMO_SHEET = s41.Sheet('crew2_c5_emotes.jpg')
ROWS = [(54, 193), (231, 370), (408, 547), (597, 736)]
GX = [8, 709]  # the first tile of each group of five; tiles are 141 apart
# (row, group) -> (who, the four tile names after the glow is left out)
EMOTES = {
    (0, 0): ('tan', ['idle', 'happy', 'proud', 'surprised']),
    (0, 1): ('pipalt', ['idle', 'happy', 'surprised', 'eating']),   # a mint haired figure labelled crew_pip: not in our crew, kept as an extra
    (1, 0): ('pip', ['idle', 'happy', 'surprised', 'eating']),      # the brown haired figure in the mint smock matches Pip's expert look
    (1, 1): ('juno', ['idle', 'happy', 'shy', 'cheering']),
    (2, 0): ('oren', ['idle', 'happy', 'shy', 'sitting']),
    (2, 1): ('kenji', ['idle', 'happy', 'surprised', 'cheering']),
    (3, 0): ('maya', ['idle', 'happy', 'shy', 'eating']),
    (3, 1): ('ollie', ['idle', 'happy', 'proud', 'surprised']),
}
GLOW_OWNER = {(0, 0): 'tan', (0, 1): 'tan2', (1, 0): 'pip', (1, 1): 'juno', (2, 0): 'hana', (2, 1): 'kenji', (3, 0): 'maya', (3, 1): 'ollie'}


def emote_box(r, g, i):
    x0 = GX[g] + 141 * i
    return (x0 + 2, ROWS[r][0] + 2, x0 + (122 if i == 4 else 132), ROWS[r][1] - 2)


def glow_cut(box):
    """A figure with its halo on a navy tile: the alpha follows how far each pixel is from the navy."""
    a = np.array(EMO.crop(box)).astype(int)
    ring = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(ring, axis=0)
    d = np.abs(a - bg).max(-1)
    al = np.clip((d - 14) * 5, 0, 255)
    k = 8  # fade out the tile border so no frame edge is kept
    al[:k] = 0; al[-k:] = 0; al[:, :k] = 0; al[:, -k:] = 0
    return Image.fromarray(np.dstack([a, al]).astype(np.uint8), 'RGBA')


def emotes():
    for (r, g), (who, names) in EMOTES.items():
        for i, name in enumerate(names):
            x0, y0, x1, y1 = emote_box(r, g, i)
            im = EMO_SHEET.cutbox('o', x0, y0, x1, y1)
            save(f'crewx_{who}_emote_{name}', trim(im), person=True)
        save(f'crewx_{GLOW_OWNER[(r, g)]}_emote_glow', glow_cut(emote_box(r, g, 4)), person=True)


# ---------------------------------------------------------------- oopsies, roster and skills
def boxes_of(sheet, mn, y0=130, y1=950, maxw=700):
    sh = SH[sheet]
    bx = [c[:4] for c in sh.cs if c[2] - c[0] >= mn and c[3] - c[1] >= mn and y0 < c[1] < y1 and c[3] < 970 and (c[2] - c[0]) < maxw]
    bx.sort(key=lambda b: (round(b[1] / 40), b[0]))
    return bx


def pick(sheet, bx, key, idx, pad=3, keep_all=False, dw=None, person=False, union=None):
    if union:
        b = (min(bx[i][0] for i in union), min(bx[i][1] for i in union), max(bx[i][2] for i in union), max(bx[i][3] for i in union))
    else:
        b = bx[idx]
    save(key, cutbox(sheet, b, pad=pad, keep_all=keep_all), dw=dw, person=person)


# the oopsie cells: the sheet files the dropped cup and sweep rows under Pip, but they show Hana, so they are named for Hana
OOPS = {
    'oops_pip_wobble': [0, 1, 2, 3], 'oops_pip_surprise': [15, 17, 19, 21],
    'oops_hana_dropped_cup': [4, 5, 6, 7], 'oops_hana_sweep': [23, 25, 27, 29], 'oops_hana_sweep_b': [55, 56, 69, 70],
    'oops_hana_wobble': [49, 50, 52, 54], 'oops_hana_surprise': [66, 67],
}
ROSTER = {  # key -> box index (or a tuple of indices to join)
    'slot_weekday': 0, 'slot_weekend': 1, 'slot_quiet': 16, 'slot_event': (17, 18),
    'token_tan': 2, 'token_pip': 3, 'token_oren': 11, 'token_juno': 13, 'token_hana': 28, 'token_kenji': 29, 'token_maya': 34, 'token_ollie': 35,
    'token_sample': 54, 'token_empty': 55,
    'pip_leaf_full': 4, 'pip_leaf_empty': 8, 'pip_heart_full': 19, 'pip_heart_half': 22, 'pip_heart_empty': 24,
    'duetlink': 31, 'tag': 36, 'sparkle': (37, 38), 'header_ribbon': 51, 'favorite_star': 47,
    'slot_small_croissant': 48, 'slot_small_cup': 56, 'slot_small_moon': (57, 58),
    'cal_active': 52, 'cal_blank': 61, 'cal_ended': 62, 'board_flat': 27,
}
SKILLS = {
    'skill_speed_badge': 0, 'skill_speed_plain': 1, 'skill_craft_badge': 2, 'skill_craft_plain': 3, 'skill_charm_badge': 4, 'skill_charm_plain': 5,
    'skill_care_badge': 6, 'skill_care_plain': 7, 'level_apprentice': 19, 'level_skilled': 21, 'level_skilled_bronze': 20, 'level_expert': 18,
    'cozy_meter_fill': 33, 'cozy_meter_marker': 34, 'growth_exp_frame': 46, 'growth_exp_fill': 47, 'growth_praise_bar': 48, 'growth_note_praise': 49, 'growth_note_coaching': 50,
}


def ui():
    bx = boxes_of('c7_oopsies', 18)
    for prefix, idx in OOPS.items():
        frames = [cutbox('c7_oopsies', bx[i], pad=3, keep_all=True) for i in idx]
        save_loop(prefix, frames)
    for key, i in {'oops_prop_puddle_oat_s': 102, 'oops_prop_puddle_oat_m': 103, 'oops_prop_puddle_oat_l': 104, 'oops_prop_tipped_cup': 98, 'oops_overlay_catch_hands': 100}.items():
        pick('c7_oopsies', bx, key, i)
    save('oops_prop_crumbs', cutbox('c7_oopsies', (775, 828, 862, 895), pad=2, keep_all=True))
    bx = boxes_of('r1_roster', 22)
    for k, i in ROSTER.items():
        union = i if isinstance(i, tuple) else None
        pick('r1_roster', bx, f'cu_roster_{k}', None if union else i, union=union, keep_all=bool(union) or k in ('tag', 'duetlink'))
    save('cu_roster_board_iso', cutbox('r1_roster', (40, 100, 275, 395), pad=3))
    g = np.array(SH['r1_roster'].img.crop((bx[30][0] + 8, bx[30][1] + 8, bx[30][2] - 8, bx[30][3] - 8))).astype(int)
    bgc = np.median(np.concatenate([g[0], g[-1], g[:, 0], g[:, -1]]), axis=0)
    al = np.clip((np.abs(g - bgc).max(-1) - 20) * 6, 0, 255)
    save('cu_roster_duetglow', Image.fromarray(np.dstack([g, al]).astype(np.uint8), 'RGBA'))
    bx = boxes_of('r2_skills', 22)
    for k, i in SKILLS.items():
        pick('r2_skills', bx, f'cu_{k}', i, keep_all=k.startswith('level'))
    save('cu_cozy_meter_frame', cutbox('r2_skills', (29, 584, 568, 705), pad=2))


def finish():
    with open(os.path.join(ROOT, 'src', 'game', 'spriteListCrew2.ts'), 'w') as f:
        f.write('// Generated by tools/slice_crew2.py. Do not edit by hand.\n')
        f.write('export const CREW2_SPRITES = ' + json.dumps(entries, indent=2) + ' as const;\n')
    print('wrote', len(entries))


def main():
    walks()
    work()
    emotes()
    ui()
    finish()


if __name__ == '__main__':
    main()
