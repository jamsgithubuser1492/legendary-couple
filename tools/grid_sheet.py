"""Draws a labelled 50 pixel grid over part of a sheet so cut boxes can be read off. Usage: python3 tools/grid_sheet.py sheet.jpg out.png y0 y1 [step]"""
import sys
from PIL import Image, ImageDraw
name, out, y0, y1, step = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]) if len(sys.argv) > 5 else 50
im = Image.open('art/source/' + name).convert('RGB'); d = ImageDraw.Draw(im)
for x in range(0, im.width, step):
    d.line([(x, y0), (x, y1)], fill=(255, 0, 0) if x % 100 == 0 else (255, 150, 150), width=1); d.text((x + 2, y0 + 2), str(x), fill=(255, 0, 0))
for y in range(y0 - y0 % step, y1, step):
    d.line([(0, y), (im.width, y)], fill=(0, 0, 255) if y % 100 == 0 else (150, 150, 255), width=1); d.text((2, y + 2), str(y), fill=(0, 0, 255))
c = im.crop((0, y0, im.width, y1)); c = c.resize((int(c.width * 1.5), int(c.height * 1.5)), Image.LANCZOS); c.save(out)
