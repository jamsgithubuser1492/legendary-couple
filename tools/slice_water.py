"""Cuts the water effect sprites (waves, ripples, wakes) from sheet 33. Run: python3 tools/slice_water.py"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
import slice_walks as sw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'sprites')
SRC = Image.open(os.path.join(ROOT, 'art', 'source', 'sheet33_water_effects.jpg')).convert('RGB')

WAVE_COLS = [(76, 142), (146, 212), (216, 283), (286, 352)]
WAVE_ROWS = [('s', 746, 785), ('m', 786, 830), ('l', 833, 892)]


def feather(img):
    """Fade the flat water slab at the bottom and sides so each wave melts into the sea."""
    a = np.array(img.getchannel('A')).astype(float) / 255
    h, w = a.shape
    yy, xx = np.mgrid[0:h, 0:w]
    side = np.minimum(xx, w - 1 - xx) / (w * 0.16)
    bottom = (h - 1 - yy) / (h * 0.3)
    lower = np.clip((yy - h * 0.35) / (h * 0.2), 0, 1)  # only soften the lower part
    fade = 1 - lower * (1 - np.clip(np.minimum(side, bottom), 0, 1))
    img.putalpha(Image.fromarray((a * fade * 255).astype(np.uint8)))
    return img


def foam(box, thresh=125, span=75):
    box = (box[0] + 5, box[1] + 5, box[2] - 5, box[3] - 5)  # stay inside the panel border
    """White foam on teal water, turned into a transparent white overlay."""
    im = np.array(SRC.crop(box)).astype(float)
    a = np.clip((im[..., 0] - thresh) / span, 0, 1)
    a = ndimage.gaussian_filter(a, 0.6)
    out = np.dstack([np.full(a.shape, 255), np.full(a.shape, 255), np.full(a.shape, 255), (a * 255)]).astype(np.uint8)
    img = Image.fromarray(out, 'RGBA')
    bb = img.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    return img.crop(bb) if bb else img


def save(img, name, width):
    img = img.resize((width, max(1, round(img.height * width / img.width))), Image.LANCZOS)
    img.save(os.path.join(OUT, name + '.png'), optimize=True)
    print(name, img.size)


def main():
    for row, y0, y1 in WAVE_ROWS:
        for i, (x0, x1) in enumerate(WAVE_COLS):
            im, arr, bg, dist, figs = sw.figures(SRC, (x0 + 6, y0 + 6, x1 - 6, y1 - 6), min_area=300)  # inside the cell, so its beige is the background
            big = max(figs, key=lambda f: f[4])
            img = feather(sw.cut_figure(im, arr, bg, dist, big, pad=1))
            save(img, f'wave_{row}{i}', {'s': 70, 'm': 84, 'l': 100}[row] * 2)
    save(foam((452, 745, 522, 812)), 'ripple_ring', 140)
    save(foam((612, 745, 682, 812)), 'ripple_cross', 140)
    save(foam((888, 802, 1000, 850)), 'wake_prop', 190)
    save(foam((888, 858, 1000, 905)), 'wake_dinghy', 190)


if __name__ == '__main__':
    main()
