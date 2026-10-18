"""Numbers every object the slicer finds on a sheet (a probe image plus a coordinate list). Usage: python3 tools/probe_sheet.py sheet.jpg out_prefix"""
import sys, importlib.util, os
from PIL import Image, ImageDraw
spec = importlib.util.spec_from_file_location('s41', 'tools/slice_sheets41_45.py'); s41 = importlib.util.module_from_spec(spec); spec.loader.exec_module(s41)
name, out = sys.argv[1], sys.argv[2]
sh = s41.Sheet(name)
im = sh.img.copy().convert('RGB'); d = ImageDraw.Draw(im)
for i, c in enumerate(sh.cs):
    d.rectangle([c[0], c[1], c[2], c[3]], outline=(255, 0, 0), width=1)
    d.text((c[0] + 2, c[1] + 1), str(i), fill=(0, 0, 255))
print(len(sh.cs))
w, h = im.size
im.crop((0, 0, w, h // 2 + 20)).resize((w * 2, (h // 2 + 20) * 2), Image.LANCZOS).save(out + '_a.png')
im.crop((0, h // 2 - 20, w, h)).resize((w * 2, (h - h // 2 + 20) * 2), Image.LANCZOS).save(out + '_b.png')
for i, c in enumerate(sh.cs): print(i, c[:4], c[2]-c[0], c[3]-c[1])
