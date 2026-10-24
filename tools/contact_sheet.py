"""Make labelled contact sheets of all word pictures, for checking them by eye.
   python tools/contact_sheet.py OUTDIR [id,id,...]"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
data = json.loads(subprocess.run(['node', os.path.join(ROOT, 'tools', 'dump_data.js')], capture_output=True, check=True).stdout.decode('utf-8'))
only = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
words = [w for w in data['words'] if not w['img'].startswith('color:') and (not only or w['id'] in only)]
COLS, ROWS, TW, TH = 6, 5, 220, 180
font = ImageFont.truetype('arial.ttf', 16)
for page in range(0, len(words), COLS * ROWS):
    sheet = Image.new('RGB', (COLS * TW, ROWS * (TH + 24)), 'white')
    d = ImageDraw.Draw(sheet)
    for i, w in enumerate(words[page:page + COLS * ROWS]):
        x, y = (i % COLS) * TW, (i // COLS) * (TH + 24)
        p = os.path.join(ROOT, 'assets', 'img', w['id'] + '.jpg')
        if os.path.exists(p):
            im = Image.open(p); im.thumbnail((TW - 8, TH - 4)); sheet.paste(im, (x + 4, y + 2))
        d.text((x + 6, y + TH + 2), f"{w['id']}", fill='black', font=font)
    sheet.save(os.path.join(out, f'sheet{page // (COLS * ROWS) + 1}.jpg'), quality=80)
print('done')
