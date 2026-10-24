# رحلة القراءة — Reading Journey

A 6-month daily Arabic vocabulary + reading + writing program for a 9-year-old (about 20–30 minutes a day).

## Start it
Double-click **`start.bat`**. It starts a small local server and opens the app in Google Chrome at
http://localhost:8321. Keep the small "Reading Journey" window open while practising.

- Use **Chrome** (or Edge): the reading check uses the browser's Arabic speech recognition, which needs internet.
- Allow the microphone the first time Chrome asks.
- Progress is saved in this browser on this computer. Parents → Settings → *Download backup* now and then.
- **Parents area password: 1933** (asked every time it is opened).
- Microphone trouble? Parents → Settings → *Test microphone* checks the three parts separately
  (mic access, sound level, speech recognition) and plays back what it recorded.

## What a day looks like
1. **Review**: words due for spaced repetition (picture ↔ word, listen ↔ word, missing letter).
2. **New words**: photo + fully vowelled word; the voice reads it while each letter lights up; he says it back.
3. **Word games**: each new word twice, in different game types; mistakes come back once at the end.
4. **Reading**: sentences built on the words; he reads aloud and every word/letter is coloured
   green (right), orange (close) or red (missed). Tap a coloured word to hear it.

5. **Writing** (✍️ on the home screen, or at the end of the session): a 2-page A4 PDF to print —
   the day's 10 words with 3 boxes each to copy them, and the day's 5 sentences with lines to copy each once.

Every 7th day is a review-and-challenge day with no new words.

**His voice:** every word and sentence he says into the microphone is recorded (last 4 attempts of each).
Parents → *His voice* lists them by day: ▶ plays his recording, 🔊 the model voice, plus what the checker understood.
Recordings stay in this browser and are not part of the backup file.

**Male & female sector (الْمُذَكَّرُ وَالْمُؤَنَّثُ):** pairs such as قِطٌّ / قِطَّةٌ, أَسَدٌ / لَبُؤَةٌ, ثَوْرٌ / بَقَرَةٌ,
مُعَلِّمٌ / مُعَلِّمَةٌ. New-word cards show the partner word, and these words get a "مُذَكَّرٌ أَمْ مُؤَنَّثٌ؟" game.

## The plan (26 weeks)
| Stage | Weeks | New words/day | Sentences (5 a day) |
|---|---|---|---|
| 🌱 1 Seed | 1–4 | 10 | 2–3 words |
| 🌿 2 Sprout | 5–9 | 10 | 3–5 words |
| 🪴 3 Branch | 10–16 | 10 | 5–8 words |
| 🌳 4 Tree | 17–22 | 10 | 8–12 words |
| 🍎 5 Fruit | 23–26 | 10 | short paragraphs |

**Content status:** 223 words across 18 sectors and 223 sentences are ready. At 10 new words a day they last
about 26 program days (~4 weeks); after that the days are review-only until more words are added.
Stages 3–5 (verbs, adjectives, longer sentences, short stories) are the next batch to add.

## Adding or editing content
- Words: `js/data/words.js` · Sentences: `js/data/sentences.js` · Spoken instructions: `js/data/phrases.js`
- Then run `python tools/build_assets.py` to generate audio (neural Arabic voices) and download pictures
  for anything new or changed. Requires `pip install edge-tts pillow certifi` and Node.js.
- `python tools/contact_sheet.py OUTDIR` makes picture sheets for checking photos by eye.
- Any single picture can also be replaced from **Parents → Words → Picture**.
