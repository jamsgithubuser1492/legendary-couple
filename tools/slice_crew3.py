"""Cuts the third batch of crew art: per LEVEL outfit walk, tray carry and work loops, the tray wobble and the spill props
(sheets saved as art/source/crew3_*.jpg).  Run:  python3 tools/slice_crew3.py
Writes crewl_* and oops_prop_* sprites and src/game/spriteListCrew3.ts.

ADDING A NEW SHEET: save it as art/source/crew3_<name>.jpg, add <name> to SHEETS, then add rows to LOOPS (and PROPS).
Every loop row is   (crew id, level 1..3, kind, [frame picks])   where a pick is
    ('<sheet>', 'c3A')                      a grid slot: column c0..c7 then row A..D (see GRID below), or
    ('<sheet>', (x0, y0, x1, y1))           an explicit box in sheet pixels.
Kinds: walk_f, walk_b, carry_f, carry_b (front left and back left, the game mirrors them), work_<fl|fr|bl|br>, wobble.
Frames of one loop share a canvas (feet on the bottom edge, centred), so the animation never jitters.

SHEET MAP (the sheets are messy: every block is a pair of figures, the left one faces the camera and the right one faces
away, and the captions do not always match the figures, so figures are picked by what is drawn):
  juno       Juno L1 (rows A), L2 (rows B to D, cols 0 to 3), L3 tray (row C and D cols 4 to 7), pet toy loops (bottom row)
  pip        Pip L1 (row A), L2 striped shirt variant (row B)  [rows C and D show Tan, not Pip: not used]
  pip_ollie  same Pip cuts as `pip`, plus Ollie L2 walk (rows C and D) and Ollie L2 tray (bottom row, large figures)
  tan_pip_a  Tan L2 walk and tray (rows A and B), Tan L3 walk (rows C and D), register loops, Tan L3 tray wobble
  tan_pip_b  cleaner Tan L2 and L3 walk, Pip L1 and L2 walk, Pip empty tray walk, Pip L3 wobble, the spill props
SKIPPED (shows the wrong character or no clean frames, redraw these): Juno L2 col 2 row B (a bearded face), Pip rows C and D
on `pip` (they show Tan), Pip L3 walks (no sheet has them), Pip carry back mint figures (bandana plus mint smock matches no still).
"""
import importlib.util, json, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('s41', os.path.join(HERE, 'slice_sheets41_45.py'))
s41 = importlib.util.module_from_spec(spec); spec.loader.exec_module(s41)
ROOT, OUT = s41.ROOT, s41.OUT
SHEETS = ['juno', 'pip', 'pip_ollie', 'tan_pip_a', 'tan_pip_b']
SH = {n: s41.Sheet(f'crew3_{n}.jpg') for n in SHEETS}
PERSON_H = 54
# the template shared by every sheet: eight figure columns and four figure rows
GRID_X = [(66, 142), (182, 258), (332, 410), (446, 524), (608, 688), (712, 790), (876, 958), (978, 1062)]
GRID_Y = {'A': (134, 258), 'B': (288, 410), 'C': (470, 592), 'D': (588, 700)}
SCALE = PERSON_H / 116.0  # sheet pixels to game pixels, from a standing figure that is about 116 sheet pixels tall
entries = []


def slot(name):
    c, r = int(name[1]), name[2]
    return (GRID_X[c][0], GRID_Y[r][0], GRID_X[c][1], GRID_Y[r][1])


def trim(im):
    bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    return im.crop(bb) if bb else im


def frame(sheet, pick, keep_all=False):
    x0, y0, x1, y1 = slot(pick) if isinstance(pick, str) else pick
    return trim(SH[sheet].cutbox('o', x0, y0, x1, y1, keep_all=keep_all))


def put(key, im, dw):
    im.save(os.path.join(OUT, key + '.png'), optimize=True)
    entries.append({'key': key, 'file': key + '.png', 'w': im.width, 'h': im.height, 'dw': dw})


def save_loop(prefix, frames, own_scale=False):
    """Frames share one canvas, feet on the bottom edge and centred. People are scaled to PERSON_H by the canvas height;
    scenes with their own counter (work loops) keep the sheet scale so the person stays the same size as elsewhere."""
    W = max(f.width for f in frames); H = max(f.height for f in frames)
    dw = round(W * SCALE) if own_scale else round(W * PERSON_H / H)
    for i, f in enumerate(frames, 1):
        c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        c.paste(f, ((W - f.width) // 2, H - f.height))
        put(f'{prefix}_{i}', c, dw)
    return len(frames)


# ---------------------------------------------------------------- loops: (crew, level, kind, [(sheet, pick), ...])
J, P, PO, TA, TB = 'juno', 'pip', 'pip_ollie', 'tan_pip_a', 'tan_pip_b'
LOOPS = [
    # Juno, apprentice: grey green apron, white tee
    ('juno', 1, 'walk_f', [(J, 'c0A'), (J, 'c2A')]), ('juno', 1, 'walk_b', [(J, 'c1A'), (J, 'c3A')]),
    ('juno', 1, 'carry_f', [(J, 'c4A'), (J, 'c6A')]), ('juno', 1, 'carry_b', [(J, 'c5A'), (J, 'c7A')]),
    # Juno, skilled: flower pin, crossed straps. Walks come from rows C and D (long wavy hair), the tray from row B
    ('juno', 2, 'walk_f', [(J, 'c0C'), (J, 'c2C'), (J, 'c2D'), (J, 'c2C')]), ('juno', 2, 'walk_b', [(J, 'c1C'), (J, 'c3C'), (J, 'c1D'), (J, 'c3D')]),
    ('juno', 2, 'carry_f', [(J, 'c4B'), (J, 'c6B')]), ('juno', 2, 'carry_b', [(J, 'c5B'), (J, 'c7B')]),
    # Juno, expert: headband and scarf. Only the tray front and the backs are drawn
    ('juno', 3, 'carry_f', [(J, 'c4C'), (J, 'c6C')]), ('juno', 3, 'carry_b', [(J, 'c5C'), (J, 'c7C')]),
    ('juno', 3, 'walk_b', [(J, 'c4D'), (J, 'c5D'), (J, 'c6D'), (J, 'c7D')]),
    # Pip, apprentice: bandana, brown apron
    ('pip', 1, 'walk_f', [(P, 'c0A'), (TB, 'c4A'), (P, 'c2A'), (TB, 'c5A')]), ('pip', 1, 'walk_b', [(P, 'c1A'), (P, 'c3A')]),
    ('pip', 1, 'carry_f', [(P, 'c4A'), (P, 'c6A')]), ('pip', 1, 'carry_b', [(P, 'c5A'), (P, 'c7A')]),
    # Pip, skilled: apron with a green trim, crossed straps
    ('pip', 2, 'walk_f', [(TB, 'c6A'), (TB, 'c6B')]), ('pip', 2, 'walk_b', [(TB, 'c7A'), (TB, 'c7B')]),
    ('pip', 2, 'carry_f', [(P, 'c4B'), (P, 'c6B')]), ('pip', 2, 'carry_b', [(P, 'c5B'), (P, 'c7B')]),
    # Pip, expert: only the tray wobble exists (see below)
    # Tan, skilled: vest, glasses
    ('tan', 2, 'walk_f', [(TA, 'c0A'), (TA, 'c1A'), (TA, 'c2A'), (TA, 'c1A')]), ('tan', 2, 'walk_b', [(TA, 'c4A'), (TA, 'c5A'), (TA, 'c4B'), (TA, 'c5B')]),
    ('tan', 2, 'carry_f', [(TA, 'c0B'), (TA, 'c1B')]), ('tan', 2, 'carry_b', [(TA, 'c4B'), (TA, 'c5B')]),
    # Tan, expert: yellow jacket
    ('tan', 3, 'walk_f', [(TA, 'c0C'), (TA, 'c1C'), (TA, 'c2C'), (TA, 'c1C')]), ('tan', 3, 'walk_b', [(TA, 'c0D'), (TA, 'c1D'), (TA, 'c3C'), (TA, 'c3D')]),
    # Ollie, skilled: green beanie, glasses, brown vest. The tray frames are large figures from the bottom row
    ('ollie', 2, 'walk_f', [(PO, 'c0C'), (PO, 'c2C'), (PO, 'c4C'), (PO, 'c2D')]), ('ollie', 2, 'walk_b', [(PO, 'c1C'), (PO, 'c3C'), (PO, 'c6C'), (PO, 'c7C')]),
    ('ollie', 2, 'carry_f', [(PO, (66, 772, 150, 932)), (PO, (329, 772, 412, 932))]), ('ollie', 2, 'carry_b', [(PO, (169, 772, 237, 932)), (PO, (433, 772, 501, 932))]),
]
# register loops (the counter is part of the sprite), four views of two frames each
WORK_TAN = [('fl', 'c4C', 'c5C'), ('fr', 'c6C', 'c7C'), ('bl', 'c4D', 'c5D'), ('br', 'c6D', 'c7D')]
for view, a, b in WORK_TAN:
    LOOPS.append(('tan', 2, f'work_{view}', [(TA, a), (TA, b)]))
# Juno plays with the pets: the toy view (fl) and the cuddle view (fr) alternate; expert also has a back view
LOOPS += [
    ('juno', 1, 'work_fl', [(J, (60, 772, 152, 858))]), ('juno', 1, 'work_fr', [(J, (168, 776, 250, 860))]),
    ('juno', 2, 'work_fl', [(J, (336, 777, 412, 858))]), ('juno', 2, 'work_fr', [(J, (426, 776, 494, 860))]),
    ('juno', 3, 'work_fl', [(J, (548, 772, 660, 858))]), ('juno', 3, 'work_fr', [(J, (670, 776, 748, 860))]),
    ('juno', 3, 'work_br', [(J, (548, 862, 660, 936))]),
]
# the apprentice tray wobble: left, right, recovering, small smile
WOBBLE = [
    ('tan', 3, [(TA, (60, 796, 130, 918)), (TA, (158, 797, 224, 917)), (TA, (251, 797, 320, 915)), (TA, (360, 797, 432, 916))]),
    ('pip', 3, [(TB, (74, 795, 137, 915)), (TB, (160, 797, 225, 916)), (TB, (257, 797, 322, 916)), (TB, (359, 795, 421, 916))]),
]
# props that play as a short sequence: (key, sheet, boxes). Pale props use the silhouette cut, which fills the outline.
PROPS = [
    ('oops_prop_puddle_oat', TB, [(466, 808, 519, 832), (535, 807, 589, 833), (602, 806, 658, 833), (672, 806, 727, 833), (736, 806, 794, 834)]),
    ('oops_prop_puddle_matcha', TB, [(466, 887, 519, 911), (535, 886, 589, 912), (602, 885, 658, 912), (672, 885, 727, 912), (736, 884, 796, 913)]),
    ('oops_prop_crumbs', TB, [(838, 806, 880, 830), (893, 801, 940, 832), (968, 803, 999, 836), (1016, 802, 1061, 839)]),
    ('oops_prop_tipped_cup', TB, [(902, 881, 931, 911), (954, 880, 998, 915), (1016, 880, 1053, 916)]),
]


def prop_frame(sheet, box):
    sh = SH[sheet]
    x0, y0, x1, y1 = box
    best = None
    for c in sh.cs:  # a detected silhouette that matches the box: use it, it keeps pale fills
        cx, cy = (c[0] + c[2]) / 2, (c[1] + c[3]) / 2
        if x0 - 4 <= cx <= x1 + 4 and y0 - 4 <= cy <= y1 + 4 and (c[2] - c[0]) < 90:
            a = (c[2] - c[0]) * (c[3] - c[1])
            if best is None or a > best[0]:
                best = (a, c)
    if best:
        return trim(sh.cut(best[1]))
    return trim(sh.cutbox('o', x0 - 2, y0 - 2, x1 + 2, y1 + 2, keep_all=True))


def main():
    counts = {}
    for who, lvl, kind, picks in LOOPS:
        frames = [frame(s, p) for s, p in picks]
        own = kind.startswith('work')
        prefix = f'crewl_{who}_{lvl}_{kind}'
        counts[(who, lvl, kind)] = save_loop(prefix, frames, own_scale=own)
    for who, lvl, picks in WOBBLE:
        counts[(who, lvl, 'wobble')] = save_loop(f'crewl_{who}_{lvl}_wobble', [frame(s, p) for s, p in picks])
    for key, sheet, boxes in PROPS:
        frames = [prop_frame(sheet, b) for b in boxes]
        W = max(f.width for f in frames); H = max(f.height for f in frames)
        for i, f in enumerate(frames, 1):
            c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            c.paste(f, ((W - W) // 2 + (W - f.width) // 2, H - f.height))
            put(f'{key}_{i}', c, max(8, round(W * SCALE)))
        counts[(key, 0, 'prop')] = len(frames)
    with open(os.path.join(ROOT, 'src', 'game', 'spriteListCrew3.ts'), 'w') as f:
        f.write('// Generated by tools/slice_crew3.py. Do not edit by hand.\n')
        f.write('export const CREW3_SPRITES = ' + json.dumps(entries, indent=2) + ' as const;\n')
    for k, v in sorted(counts.items(), key=lambda kv: (str(kv[0][0]), kv[0][1], kv[0][2])):
        print(*k, v)
    print('wrote', len(entries))


if __name__ == '__main__':
    main()
