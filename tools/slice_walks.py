"""Cuts walking animation frames out of the walk sheets (sheets 21 and 22).

Each row is scanned for separate figures, which are sorted left to right and saved as one horizontal strip
per character, bottom aligned in equal sized frames. Run:  python3 tools/slice_walks.py
"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art', 'source')
OUT = os.path.join(ROOT, 'public', 'assets', 'sprites')

# (name, sheet file, scan box x0,y0,x1,y1, display height in game px, expected figure count or None)
STRIPS = [
    # frames 0-2 walk west (mirrored for east), 3-5 walk toward the camera, 6 front idle, 7 back idle
    ('james_new', 'sheet25_ew_rebuild.jpg', (455, 410, 1048, 548), 52, 8),
    # same layout; the 8th figure on her row is James from behind, so only 7 are kept
    ('rachel_new', 'sheet25_ew_rebuild.jpg', 'cols', 50, 7),
    ('dog_walk_side', 'sheet21_companion_walks.jpg', (440, 860, 1085, 930), 26, None),
]


def figures(img, box, min_area=900):
    im = img.crop(box).convert('RGB')
    arr = np.array(im).astype(np.int16)
    border = np.concatenate([arr[0], arr[-1], arr[:, 0], arr[:, -1]]).reshape(-1, 3)
    bg = np.median(border, axis=0)
    dist = np.sqrt(((arr - bg) ** 2).sum(axis=2))
    fg = dist > 26
    fg = ndimage.binary_opening(fg, iterations=1)
    fg = ndimage.binary_closing(fg, iterations=2)
    fg = ndimage.binary_fill_holes(fg)
    lab, n = ndimage.label(fg)
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab), start=1):
        area = int((lab[sl] == i).sum())
        if area < min_area:
            continue
        out.append((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop, area))
    out.sort()
    return im, arr, bg, dist, out


def cut_figure(im, arr, bg, dist, bbox, pad=3):
    x0, y0, x1, y1 = bbox[:4]
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(arr.shape[1], x1 + pad), min(arr.shape[0], y1 + pad)
    sub = arr[y0:y1, x0:x1]
    d = dist[y0:y1, x0:x1]
    near = d < 16
    lab, n = ndimage.label(near)
    edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    sizes = ndimage.sum(near, lab, range(n + 1))
    remove = np.zeros_like(near)
    for k in range(1, n + 1):
        if k in edge or sizes[k] > 60:
            remove |= lab == k
    alpha = (~remove).astype(float)
    alpha = ndimage.binary_opening(alpha > 0.5, iterations=1).astype(float)
    comp, cn = ndimage.label(alpha > 0.5)
    if cn > 1:
        csz = ndimage.sum(alpha > 0.5, comp, range(1, cn + 1))
        keep = np.zeros_like(alpha, dtype=bool)
        for i, s in enumerate(csz, start=1):
            if s >= csz.max() * 0.1:
                keep |= comp == i
        alpha = keep.astype(float)
    # defringe: recolour pale edge pixels from the solid interior
    mask = alpha > 0.5
    core = ndimage.binary_erosion(mask, iterations=2)
    arr2 = sub.copy()
    if core.any():
        _, idx = ndimage.distance_transform_edt(~core, return_indices=True)
        bleed = arr2[idx[0], idx[1]]
        fix = mask & ~core & (arr2.mean(axis=2) > bleed.mean(axis=2) + 12)
        arr2 = np.where(fix[..., None], bleed, arr2)
    alpha = ndimage.gaussian_filter(alpha, 0.6)
    rgba = np.dstack([arr2.clip(0, 255).astype(np.uint8), (alpha * 255).astype(np.uint8)])
    img = Image.fromarray(rgba, 'RGBA')
    bb = img.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    return img.crop(bb) if bb else img


# column x ranges of the eight figures on the sheet-25 rows
EW_COLS = [(458, 522), (528, 590), (597, 660), (669, 731), (743, 806), (817, 879), (900, 964), (972, 1036)]


def column_frames(src, y0, y1, n):
    frames = []
    for x0, x1 in EW_COLS[:n]:
        box = (x0, y0, x1, y1)
        im, arr, bg, dist, figs = figures(src, box, min_area=1500)
        if not figs:
            continue
        big = max(figs, key=lambda f: f[4])
        frames.append(cut_figure(im, arr, bg, dist, big))
    return frames


def main():
    meta = {}
    for name, sheet, box, disp_h, keep in STRIPS:
        src = Image.open(os.path.join(SRC, sheet)).convert('RGB')
        if box == 'cols':
            frames = column_frames(src, 562, 696, keep)
        else:
            im, arr, bg, dist, figs = figures(src, box, min_area=2500 if keep else 900)
            figs = [f for f in figs if (f[2] - f[0]) > 28]  # drop thin column divider lines
            if keep:
                figs = figs[:keep]
            frames = [cut_figure(im, arr, bg, dist, f) for f in figs]
        if not frames:
            print('no figures for', name)
            continue
        # one shared scale so every frame keeps its true proportions, based on the tallest frame
        tall = max(f.height for f in frames)
        scale = (disp_h * 2) / tall  # stored at 2x
        frames = [f.resize((max(1, round(f.width * scale)), max(1, round(f.height * scale))), Image.LANCZOS) for f in frames]
        fw = max(f.width for f in frames) + 4
        fh = max(f.height for f in frames) + 2
        strip = Image.new('RGBA', (fw * len(frames), fh), (0, 0, 0, 0))
        for i, f in enumerate(frames):
            strip.paste(f, (i * fw + (fw - f.width) // 2, fh - f.height), f)
        strip.quantize(colors=256, method=Image.FASTOCTREE, dither=Image.NONE).save(os.path.join(OUT, name + '.png'), optimize=True)
        meta[name] = {'frames': len(frames), 'fw': fw, 'fh': fh}
        print(name, len(frames), 'frames', fw, 'x', fh)
    with open(os.path.join(ROOT, 'src', 'game', 'walkSheets.ts'), 'w') as f:
        f.write('// Generated by tools/slice_walks.py. Do not edit by hand.\n')
        f.write('export const WALK_STRIPS = ' + json.dumps(meta, indent=2) + ' as const;\n')


if __name__ == '__main__':
    main()
