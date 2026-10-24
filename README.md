# رحلة القراءة — Reading Journey

A 6-month daily Arabic vocabulary + reading program for a 9-year-old (about 15–20 minutes a day).

## Start it
Double-click **`start.bat`**. It starts a small local server and opens the app in Google Chrome at
http://localhost:8321. Keep the small "Reading Journey" window open while practising.

- Use **Chrome** (or Edge): the reading check uses the browser's Arabic speech recognition, which needs internet.
- Allow the microphone the first time Chrome asks.
- Progress is saved in this browser on this computer. Parents → Settings → *Download backup* now and then.

## What a day looks like
1. **Review**: words due for spaced repetition (picture ↔ word, listen ↔ word, missing letter).
2. **New words**: photo + fully vowelled word; the voice reads it while each letter lights up; he says it back.
3. **Word games**: each new word twice, in different game types; mistakes come back once at the end.
4. **Reading**: sentences built on the words; he reads aloud and every word/letter is coloured
   green (right), orange (close) or red (missed). Tap a coloured word to hear it.

Every 7th day is a review-and-challenge day with no new words.

## The plan (26 weeks)
| Stage | Weeks | New words/day | Sentences |
|---|---|---|---|
| 🌱 1 Seed | 1–4 | 3 | 2–3 words |
| 🌿 2 Sprout | 5–9 | 4 | 3–5 words |
| 🪴 3 Branch | 10–16 | 4 | 5–8 words |
| 🌳 4 Tree | 17–22 | 4 | 8–12 words |
| 🍎 5 Fruit | 23–26 | 3 | short paragraphs |

**Content status:** 206 words across 17 sectors and 206 sentences are ready, covering stages 1–2 (about the
first 10 weeks). Stages 3–5 (verbs, adjectives, longer sentences, short stories) are the next batch to add.

## Adding or editing content
- Words: `js/data/words.js` · Sentences: `js/data/sentences.js` · Spoken instructions: `js/data/phrases.js`
- Then run `python tools/build_assets.py` to generate audio (neural Arabic voices) and download pictures
  for anything new or changed. Requires `pip install edge-tts pillow certifi` and Node.js.
- `python tools/contact_sheet.py OUTDIR` makes picture sheets for checking photos by eye.
- Any single picture can also be replaced from **Parents → Words → Picture**.
