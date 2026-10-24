"""Generate the app's audio and pictures.

  python tools/build_assets.py              # everything missing or out of date
  python tools/build_assets.py --audio      # audio only
  python tools/build_assets.py --images     # pictures only
  python tools/build_assets.py --images --redo cat,dog   # re-download chosen pictures

Audio: Microsoft neural Arabic voices (via edge-tts), with per-word timestamps used to
light up letters in sync with the voice. Pictures: Wikipedia / Wikimedia Commons.
Both steps are incremental: only new or changed words/sentences are processed.
"""
import argparse
import asyncio
import io
import json
import os
import ssl
import subprocess
import sys
import time
import urllib.parse
import urllib.request

import certifi
import edge_tts
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')
AUDIO_DIR = os.path.join(ASSETS, 'audio')
IMG_DIR = os.path.join(ASSETS, 'img')
VOICES = {'f': 'ar-SA-ZariyahNeural', 'm': 'ar-SA-HamedNeural'}
RATE = '-10%'  # a little slower than normal speech; the app can slow it down further
UA = 'YsfArabicReading/1.0 (personal, non-commercial learning app)'
SSL_CTX = ssl.create_default_context(cafile=certifi.where())


def load_data():
    out = subprocess.run(['node', os.path.join(ROOT, 'tools', 'dump_data.js')], capture_output=True, check=True)
    return json.loads(out.stdout.decode('utf-8'))


def read_json(path, default):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def write_js(path, var, obj):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(f'window.{var} = ')
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')


# ───────────────────────────── audio ─────────────────────────────

def audio_jobs(data):
    """(key, text) pairs. Key 'w:cat' → file w/cat.mp3."""
    jobs = [('w:' + w['id'], w['ar']) for w in data['words']]
    jobs += [('s:' + s['id'], s['t']) for s in data['sentences']]
    jobs += [('u:' + k, t) for k, t in data['phrases'].items()]
    return jobs


async def synth(text, voice, path):
    comm = edge_tts.Communicate(text, voice, rate=RATE, boundary='WordBoundary')
    audio = bytearray()
    marks = []
    async for chunk in comm.stream():
        if chunk['type'] == 'audio':
            audio.extend(chunk['data'])
        elif chunk['type'] == 'WordBoundary':
            # offset/duration come in 100-nanosecond units → milliseconds
            marks.append([round(chunk['offset'] / 10000), round(chunk['duration'] / 10000), chunk['text']])
    if not audio:
        raise RuntimeError('no audio returned')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(audio)
    return marks


async def build_audio(data):
    timings_path = os.path.join(AUDIO_DIR, 'timings.json')
    timings = read_json(timings_path, {})
    jobs = audio_jobs(data)
    sem = asyncio.Semaphore(6)
    failures = []
    done = 0

    async def run(vkey, voice, key, text):
        nonlocal done
        kind, name = key.split(':', 1)
        path = os.path.join(AUDIO_DIR, vkey, kind, name + '.mp3')
        prev = timings.setdefault(vkey, {}).get(key)
        if prev and prev['t'] == text and os.path.exists(path):
            return
        async with sem:
            for attempt in range(4):
                try:
                    marks = await synth(text, voice, path)
                    timings[vkey][key] = {'t': text, 'm': marks}
                    done += 1
                    if done % 25 == 0:
                        print(f'  audio: {done} files generated...', flush=True)
                    return
                except Exception as e:  # network hiccups: retry with backoff
                    err = e
                    await asyncio.sleep(1.5 * (attempt + 1))
            failures.append((vkey, key, str(err)))

    await asyncio.gather(*(run(v, voice, k, t) for v, voice in VOICES.items() for k, t in jobs))

    # drop timings for words/sentences that no longer exist
    keys = {k for k, _ in jobs}
    for v in timings:
        timings[v] = {k: val for k, val in timings[v].items() if k in keys}
    os.makedirs(AUDIO_DIR, exist_ok=True)
    with open(timings_path, 'w', encoding='utf-8') as f:
        json.dump(timings, f, ensure_ascii=False, indent=0)
    write_js(os.path.join(AUDIO_DIR, 'timings.js'), 'AUDIO_TIMINGS', timings)
    print(f'audio: {done} generated, {len(failures)} failed')
    for f in failures:
        print('  FAILED', f)


# ───────────────────────────── images ─────────────────────────────

def fetch(url, timeout=40):
    """GET with back-off when Wikimedia rate-limits us (HTTP 429)."""
    for wait in (0, 4, 10, 25, 60):
        time.sleep(wait)
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        try:
            with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
    raise RuntimeError('rate-limited by Wikimedia; run again later')


def get_json(url):
    return json.loads(fetch(url, 25))


def get_bytes(url):
    return fetch(url)


def commons_api(params):
    params.update({'format': 'json', 'formatversion': '2'})
    return get_json('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(params))


def resolve_image(src):
    """Return (image_url, credit_page) for a picture source spec, or (None, None)."""
    if src.startswith('color:') or src == 'emoji':
        return None, None
    if src.startswith('commons:'):
        res = commons_api({'action': 'query', 'generator': 'search', 'gsrsearch': 'filetype:bitmap ' + src[8:],
                           'gsrnamespace': 6, 'gsrlimit': 5, 'prop': 'imageinfo', 'iiprop': 'url', 'iiurlwidth': 640})
        pages = sorted(res.get('query', {}).get('pages', []), key=lambda p: p.get('index', 99))
        for p in pages:
            ii = (p.get('imageinfo') or [{}])[0]
            if ii.get('thumburl'):
                return ii['thumburl'], ii.get('descriptionurl')
        return None, None
    if src.startswith('file:'):
        res = commons_api({'action': 'query', 'titles': 'File:' + src[5:], 'prop': 'imageinfo',
                           'iiprop': 'url', 'iiurlwidth': 640})
        ii = (res['query']['pages'][0].get('imageinfo') or [{}])[0]
        return ii.get('thumburl'), ii.get('descriptionurl')
    title = urllib.parse.quote(src.replace(' ', '_'), safe='')
    d = get_json(f'https://en.wikipedia.org/api/rest_v1/page/summary/{title}')
    thumb = (d.get('thumbnail') or {}).get('source')
    if not thumb:
        return None, None
    page = (d.get('content_urls') or {}).get('desktop', {}).get('page')
    return thumb.replace('/330px-', '/640px-'), page


def save_image(raw, path):
    im = Image.open(io.BytesIO(raw))
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        bg = Image.new('RGB', im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        im = bg
    im = im.convert('RGB')
    im.thumbnail((640, 640))
    im.save(path, 'JPEG', quality=84, optimize=True)


def build_images(data, redo):
    os.makedirs(IMG_DIR, exist_ok=True)
    credits_path = os.path.join(IMG_DIR, 'credits.json')
    credits = read_json(credits_path, {})
    ok = failed = 0
    for w in data['words']:
        wid, src = w['id'], w['img']
        path = os.path.join(IMG_DIR, wid + '.jpg')
        if src.startswith('color:') or src == 'emoji':
            credits.pop(wid, None)
            if os.path.exists(path):
                os.remove(path)
            continue
        known = credits.get(wid, {})
        if os.path.exists(path) and known.get('src') == src and wid not in redo:
            continue
        try:
            url, page = resolve_image(src)
            if not url:
                raise RuntimeError('no picture found')
            try:
                raw = get_bytes(url)
            except urllib.error.HTTPError:
                raw = get_bytes(url.replace('/640px-', '/330px-'))  # original smaller than 640px
            save_image(raw, path)
            credits[wid] = {'src': src, 'url': url, 'page': page}
            ok += 1
            print(f'  img {wid:14s} ← {src}')
        except Exception as e:
            failed += 1
            print(f'  img {wid:14s} FAILED ({src}): {e}')
        time.sleep(1.0)  # be polite to Wikimedia
    ids = {w['id'] for w in data['words']}
    credits = {k: v for k, v in credits.items() if k in ids}
    with open(credits_path, 'w', encoding='utf-8') as f:
        json.dump(credits, f, ensure_ascii=False, indent=1)
    files = {wid: f'assets/img/{wid}.jpg?v={int(os.path.getmtime(os.path.join(IMG_DIR, wid + ".jpg")))}'
             for wid in sorted(credits) if os.path.exists(os.path.join(IMG_DIR, wid + '.jpg'))}
    write_js(os.path.join(ASSETS, 'images.js'), 'IMAGE_FILES', files)
    print(f'images: {ok} downloaded, {failed} failed, {len(files)} total')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--audio', action='store_true')
    ap.add_argument('--images', action='store_true')
    ap.add_argument('--redo', default='', help='comma-separated word ids whose pictures to re-download')
    args = ap.parse_args()
    both = not args.audio and not args.images
    data = load_data()
    print(f"{len(data['words'])} words, {len(data['sentences'])} sentences, {len(data['phrases'])} phrases")
    if args.images or both:
        build_images(data, set(filter(None, args.redo.split(','))))
    if args.audio or both:
        asyncio.run(build_audio(data))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
