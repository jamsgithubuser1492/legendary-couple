"""Recuts the older café pieces (sheets 6 and 8) that were cut with fixed boxes and lost an edge.
Each is cut again with extra room and the flood fill keeps the whole piece (neighbours and area rugs are dropped).
The art keeps its scale: the display width grows in proportion to the extra art recovered.
Run:  python3 tools/recut_cafe_base.py"""
import importlib.util, json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('s41', os.path.join(HERE, 'slice_sheets41_45.py'))
s41 = importlib.util.module_from_spec(spec); spec.loader.exec_module(s41)
ROOT, OUT = s41.ROOT, s41.OUT
LIST = os.path.join(ROOT, 'src', 'game', 'spriteListBase.ts')
src = open(os.path.join(HERE, 'slice_sprites.py')).read()
BOX = {m.group(1): (m.group(2), tuple(map(int, m.group(3).split(',')))) for m in re.finditer(r"\('(\w+)', '(s\d+)', \(([\d, ]+)\)", src)}
SHEET = {'s6': 'sheet6_cafe_day.jpg', 's8': 'sheet8_cafe_sunset.jpg'}
KEYS = ['wooden_chair_a', 'wooden_chair_b', 'cushion_set', 'round_table_set', 'square_table_set', 'bookshelf_cafe', 'counter_pastry', 'pastry_case', 'bread_shelf', 'menu_stand_a', 'menu_stand_b',
        'food_matcha', 'food_tray', 'food_cake_a', 'food_cake_b', 'food_slice', 'food_croissant', 'food_display', 'food_macarons', 'food_loaf', 'food_bread', 'plant_a', 'plant_b', 'plant_snake', 'lamp', 'menu_sign']
# a few need a hand placed box because a neighbour or a label sits close by
KEEP_ALL = {'cushion_set'}  # a sofa pair with a table: all parts stay
OVERRIDE = {'counter_pastry': ('s8', (798, 486, 1030, 662))}
TXT = open(LIST).read()
A = TXT.index('export const SPRITES = [') + len('export const SPRITES = ')
B = TXT.index('\n] as const;', A) + 2
entries = json.loads(TXT[A:B])
by = {e['key']: e for e in entries}
sheets = {}
for k in KEYS:
    sh, box = OVERRIDE.get(k) or BOX[k]
    S = sheets.setdefault(sh, s41.Sheet(SHEET[sh]))
    x0, y0, x1, y1 = box
    im = S.cutbox('o', x0 - 16, y0 - 16, x1 + 16, y1 + 16, keep_all=k in KEEP_ALL)
    bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    im = im.crop(bb)
    e = by[k]
    scale = e['dw'] / e['w']  # game pixels per art pixel, kept as it was
    im.save(os.path.join(OUT, k + '.png'), optimize=True)
    print(k, (e['w'], e['h']), '->', im.size)
    e['w'], e['h'], e['dw'] = im.width, im.height, round(im.width * scale)
open(LIST, 'w').write(TXT[:A] + json.dumps(entries, indent=2) + TXT[B:])
