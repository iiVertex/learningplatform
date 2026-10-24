// Arabic text helpers: grapheme splitting (letter + its harakat), normalisation for comparing
// what was said with what was written, and word/letter alignment for reading feedback.
window.Arabic = (function () {
  var HARAKAT = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
  var TATWEEL = /ـ/g;
  var PUNCT = /[.,،؛؟!?:"'«»()\[\]\-–—…]/g;
  var LETTER_MAP = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ة': 'ه', 'ى': 'ي', 'ؤ': 'و', 'ئ': 'ي' };
  var LONG_VOWELS = 'اويى';
  var segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('ar', { granularity: 'grapheme' }) : null;

  function stripHarakat(s) { return s.replace(HARAKAT, '').replace(TATWEEL, ''); }
  function isLetter(ch) { return /[ء-يٱ-ۓ]/.test(ch); }
  function normLetter(ch) { return LETTER_MAP[ch] || ch; }

  function graphemes(s) {
    if (segmenter) return Array.from(segmenter.segment(s), function (x) { return x.segment; });
    // fallback: attach combining marks to the preceding character
    var out = [];
    for (var i = 0; i < s.length; i++) {
      if (out.length && /[ؐ-ًؚ-ٰٟ]/.test(s[i])) out[out.length - 1] += s[i];
      else out.push(s[i]);
    }
    return out;
  }

  // Normalised letters only (no harakat, no punctuation, unified alef/ta-marbuta/ya/hamza seats).
  function normalize(s) {
    return Array.from(stripHarakat(s).replace(PUNCT, '').trim()).map(normLetter).join('');
  }

  // A displayed word → graphemes with their normalised letter and a timing weight.
  function wordUnits(word) {
    return graphemes(word).map(function (g) {
      var base = stripHarakat(g);
      var letter = base && isLetter(base[0]) ? normLetter(base[0]) : null;
      var weight = letter ? 1 : 0;
      if (letter && g.indexOf('ّ') >= 0) weight += 0.6; // shadda: doubled sound
      if (letter && LONG_VOWELS.indexOf(base[0]) >= 0) weight += 0.3;
      return { g: g, letter: letter, weight: weight };
    });
  }

  function splitWords(sentence) { return sentence.trim().split(/\s+/).filter(Boolean); }

  // Levenshtein distance + which items of `a` were matched exactly.
  function levAlign(a, b) {
    var n = a.length, m = b.length, d = [], i, j;
    for (i = 0; i <= n; i++) { d.push(new Array(m + 1).fill(0)); d[i][0] = i; }
    for (j = 0; j <= m; j++) d[0][j] = j;
    for (i = 1; i <= n; i++) {
      for (j = 1; j <= m; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    var ok = new Array(n).fill(false);
    i = n; j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
        ok[i - 1] = a[i - 1] === b[j - 1]; i--; j--;
      } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
        i--;
      } else {
        j--;
      }
    }
    return { dist: d[n][m], ok: ok };
  }

  function similarity(a, b) {
    if (!a.length && !b.length) return 1;
    return 1 - levAlign(Array.from(a), Array.from(b)).dist / Math.max(a.length, b.length);
  }

  // Align target words to heard words (both normalised strings), maximising total similarity.
  // Also allows two heard words to cover one target word (speech engines sometimes split words).
  function alignWords(target, heard) {
    var n = target.length, m = heard.length, MIN = 0.34;
    var S = [], B = [], i, j;
    for (i = 0; i <= n; i++) { S.push(new Array(m + 1).fill(0)); B.push(new Array(m + 1).fill(null)); }
    for (i = 1; i <= n; i++) {
      for (j = 1; j <= m; j++) {
        var best = S[i - 1][j], how = 'skipT';
        if (S[i][j - 1] > best) { best = S[i][j - 1]; how = 'skipH'; }
        var s1 = similarity(target[i - 1], heard[j - 1]);
        if (s1 >= MIN && S[i - 1][j - 1] + s1 > best) { best = S[i - 1][j - 1] + s1; how = 'one'; }
        if (j >= 2) {
          var s2 = similarity(target[i - 1], heard[j - 2] + heard[j - 1]);
          if (s2 >= MIN && s2 > s1 + 0.15 && S[i - 1][j - 2] + s2 > best) { best = S[i - 1][j - 2] + s2; how = 'two'; }
        }
        S[i][j] = best; B[i][j] = how;
      }
    }
    var match = new Array(n).fill(null);
    i = n; j = m;
    while (i > 0 && j > 0) {
      var h = B[i][j];
      if (h === 'one') { match[i - 1] = heard[j - 1]; i--; j--; }
      else if (h === 'two') { match[i - 1] = heard[j - 2] + heard[j - 1]; i--; j -= 2; }
      else if (h === 'skipH') j--;
      else i--;
    }
    return match;
  }

  // Compare a displayed sentence with one transcript.
  // Returns { score 0-100, words: [{ word, units, status: good|close|miss, sim, letterOk[] }] }
  function assess(sentence, transcript) {
    var words = splitWords(sentence);
    var targets = words.map(normalize);
    var heard = splitWords(transcript || '').map(normalize).filter(Boolean);
    var match = alignWords(targets, heard);
    var total = 0, counted = 0;
    var result = words.map(function (word, i) {
      var units = wordUnits(word);
      var letters = units.filter(function (u) { return u.letter; }).map(function (u) { return u.letter; });
      var said = match[i];
      var sim = 0, letterOk = letters.map(function () { return false; });
      if (said) {
        var al = levAlign(letters, Array.from(said));
        sim = 1 - al.dist / Math.max(letters.length, said.length);
        letterOk = al.ok;
      }
      var status = sim >= 0.999 ? 'good' : sim >= 0.5 ? 'close' : 'miss';
      if (letters.length) { counted++; total += status === 'good' ? 1 : status === 'close' ? sim * 0.8 : 0; }
      return { word: word, units: units, status: status, sim: sim, letterOk: letterOk, heard: said };
    });
    return { score: counted ? Math.round((total / counted) * 100) : 0, words: result, transcript: transcript };
  }

  // Try every candidate transcript and keep the most generous reading.
  function assessBest(sentence, candidates) {
    var best = null;
    (candidates || []).forEach(function (c) {
      var r = assess(sentence, c);
      if (!best || r.score > best.score) best = r;
    });
    return best || assess(sentence, '');
  }

  return {
    stripHarakat: stripHarakat, normalize: normalize, graphemes: graphemes, wordUnits: wordUnits,
    splitWords: splitWords, similarity: similarity, assess: assess, assessBest: assessBest, isLetter: isLetter,
  };
})();
