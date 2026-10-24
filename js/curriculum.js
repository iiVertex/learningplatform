// The 6-month plan: 26 weeks × 7 days. Days 7, 14, 21… are review-and-challenge days.
// Words are reviewed with spaced repetition (Leitner boxes), counted in sessions, so a missed day never piles up work.
window.Curriculum = (function () {
  var TOTAL_DAYS = 182;
  var STAGES = [
    { n: 1, from: 1, to: 4, icon: '🌱', ar: 'الْبِذْرَةُ', en: 'Seed', newPerDay: 10, level: 1, reviewMax: 10, read: 5, options: 3,
      goal: 'Short concrete words; 2–3 word sentences. Build confidence decoding letters with harakat.' },
    { n: 2, from: 5, to: 9, icon: '🌿', ar: 'الْبُرْعُمُ', en: 'Sprout', newPerDay: 10, level: 2, reviewMax: 12, read: 5, options: 4,
      goal: 'More sectors, colours and longer words; 3–5 word sentences.' },
    { n: 3, from: 10, to: 16, icon: '🪴', ar: 'الْغُصْنُ', en: 'Branch', newPerDay: 10, level: 3, reviewMax: 12, read: 5, options: 4,
      goal: 'Verbs, adjectives and abstract words; 5–8 word sentences.' },
    { n: 4, from: 17, to: 22, icon: '🌳', ar: 'الشَّجَرَةُ', en: 'Tree', newPerDay: 10, level: 4, reviewMax: 12, read: 5, options: 4,
      goal: 'Sentences with two ideas (8–12 words); reading with fluency.' },
    { n: 5, from: 23, to: 26, icon: '🍎', ar: 'الثَّمَرَةُ', en: 'Fruit', newPerDay: 10, level: 5, reviewMax: 12, read: 5, options: 4,
      goal: 'Short paragraphs and mini stories; reading for meaning.' },
  ];
  // Leitner box → sessions until next review. Box 5+ counts as "mastered".
  var INTERVALS = [0, 1, 2, 4, 7, 14, 30];
  var PLAN_V = 2; // bump when the shape of a day changes, so a saved half-done plan is rebuilt

  var wordById = {};
  WORDS.forEach(function (w) { wordById[w.id] = w; });
  var sentencesByWord = {};
  SENTENCES.forEach(function (s) { (sentencesByWord[s.w] = sentencesByWord[s.w] || []).push(s); });

  function weekOf(day) { return Math.ceil(day / 7); }
  function stageFor(day) {
    var wk = Math.min(weekOf(day), 26);
    return STAGES.filter(function (s) { return wk >= s.from && wk <= s.to; })[0] || STAGES[STAGES.length - 1];
  }
  function isReviewDay(day) { return day % 7 === 0; }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // Next unlearned words: lowest tier first, in themed blocks — a whole category at a time, rotating through
  // the categories, topping up from the next category (or the next tier) until k words are picked.
  function pickNewWords(p, k) {
    var unlearned = WORDS.filter(function (w) { return !p.words[w.id]; });
    var cats = CATEGORIES.map(function (c) { return c.id; });
    var picked = [], cursor = p.catCursor % cats.length;
    var tiers = unlearned.map(function (w) { return w.tier; }).filter(function (t, i, a) { return a.indexOf(t) === i; }).sort();
    tiers.forEach(function (tier) {
      var pool = unlearned.filter(function (w) { return w.tier === tier; });
      for (var step = 0; step < cats.length && picked.length < k; step++) {
        var ci = (cursor + step) % cats.length;
        var inCat = pool.filter(function (w) { return w.cat === cats[ci] && picked.indexOf(w.id) < 0; });
        if (!inCat.length) continue;
        var took = inCat.slice(0, k - picked.length);
        took.forEach(function (w) { picked.push(w.id); });
        // only move past a category once it has been used up for this tier
        cursor = took.length === inCat.length ? (ci + 1) % cats.length : ci;
      }
    });
    return { ids: picked, cursor: cursor };
  }

  function dueWords(p, day) {
    return Object.keys(p.words)
      .filter(function (id) { return wordById[id] && p.words[id].due <= day; })
      .sort(function (a, b) { return p.words[a].due - p.words[b].due || p.words[a].box - p.words[b].box; });
  }

  function learnedIds(p) { return Object.keys(p.words).filter(function (id) { return wordById[id]; }); }

  // Pick reading sentences: today's words first, then unread ones, then low scores, then the oldest.
  function pickSentences(p, day, newIds, count, level) {
    var known = {};
    learnedIds(p).concat(newIds).forEach(function (id) { known[id] = true; });
    var chosen = [];
    function take(s) { if (s && chosen.indexOf(s) < 0 && chosen.length < count) chosen.push(s); }
    function bestFor(wid) {
      var list = (sentencesByWord[wid] || []).filter(function (s) { return s.level <= level; });
      list.sort(function (a, b) { return b.level - a.level; });
      var unread = list.filter(function (s) { return !p.sentences[s.id]; });
      return unread[0] || list[0];
    }
    // spread over the day's words (both themes) rather than only the first few
    var spread = newIds.filter(function (_, i) { return i % 2 === 0; }).concat(newIds.filter(function (_, i) { return i % 2 === 1; }));
    spread.forEach(function (id) { take(bestFor(id)); });
    var pool = SENTENCES.filter(function (s) { return known[s.w] && s.level <= level; });
    shuffle(pool.filter(function (s) { return !p.sentences[s.id]; }))
      .sort(function (a, b) { return b.level - a.level; }).forEach(take);
    pool.filter(function (s) { return p.sentences[s.id] && p.sentences[s.id].best < 75; })
      .sort(function (a, b) { return p.sentences[a.id].best - p.sentences[b.id].best; }).forEach(take);
    pool.filter(function (s) { return p.sentences[s.id]; })
      .sort(function (a, b) { return p.sentences[a.id].lastDay - p.sentences[b.id].lastDay; }).forEach(take);
    return chosen;
  }

  // ── quiz items ──
  var LOOKALIKE = ['بتثنيى', 'جحخ', 'دذ', 'رز', 'سش', 'صض', 'طظ', 'عغ', 'فق', 'كل', 'هة', 'وؤ', 'اأإآ'];
  function lookalikes(ch) {
    var g = LOOKALIKE.filter(function (s) { return s.indexOf(ch) >= 0; })[0] || '';
    return Array.from(g).filter(function (c) { return c !== ch; });
  }

  function distractors(target, n, p) {
    var tNorm = Arabic.normalize(target.ar);
    var learned = learnedIds(p).map(function (id) { return wordById[id]; });
    var all = WORDS.filter(function (w) { return w.tier <= target.tier + 1; });
    // never offer the male/female partner as a wrong answer: its picture looks the same
    function ok(w) { return w.id !== target.id && w.id !== target.pair && Arabic.normalize(w.ar) !== tNorm; }
    var first = Arabic.normalize(target.ar)[0];
    // prefer words he has seen that look alike (same first letter) or share a category, then anything else
    var ranked = shuffle(learned.filter(ok)).sort(function (a, b) {
      function rank(w) { return (Arabic.normalize(w.ar)[0] === first ? 2 : 0) + (w.cat === target.cat ? 1 : 0); }
      return rank(b) - rank(a);
    });
    var out = [];
    ranked.concat(shuffle(all.filter(ok))).forEach(function (w) {
      if (out.length < n && out.indexOf(w) < 0) out.push(w);
    });
    return out;
  }

  function makeMissing(word) {
    var units = Arabic.wordUnits(word.ar);
    // pick a letter to hide, avoiding the silent alef/lam of "ال" and spaces
    function wordStart(k) { return k === 0 || units[k - 1].g === ' '; }
    function inArticle(i) {
      if (units[i].letter === 'ا') return wordStart(i) && units[i + 1] && units[i + 1].letter === 'ل';
      if (units[i].letter === 'ل') return i > 0 && units[i - 1].letter === 'ا' && wordStart(i - 1);
      return false;
    }
    var candidates = [];
    units.forEach(function (u, i) { if (u.letter && !inArticle(i)) candidates.push(i); });
    if (!candidates.length) return null;
    var hide = candidates[Math.floor(Math.random() * candidates.length)];
    var correct = units[hide];
    var base = Arabic.stripHarakat(correct.g);
    var marks = correct.g.slice(base.length);
    var opts = lookalikes(base[0]).slice(0, 2);
    var spare = shuffle(Array.from('بتجدرسعفكلمنهوي')).filter(function (c) { return c !== base[0] && opts.indexOf(c) < 0; });
    while (opts.length < 3) opts.push(spare.shift());
    return { hide: hide, answer: correct.g, options: shuffle([correct.g].concat(opts.map(function (c) { return c + marks; }))) };
  }

  function quizItem(type, word, p, nOptions) {
    var item = { type: type, word: word.id };
    if (type === 'gender') { item.options = ['m', 'f']; item.answer = word.g; return item; }
    if (type === 'missing') {
      var m = makeMissing(word);
      if (!m) type = item.type = 'pic2word';
      else { item.hide = m.hide; item.options = m.options; item.answer = m.answer; return item; }
    }
    item.options = shuffle([word].concat(distractors(word, nOptions - 1, p))).map(function (w) { return w.id; });
    item.answer = word.id;
    return item;
  }

  function buildQuiz(reviewIds, newIds, p, stage) {
    var types = ['pic2word', 'word2pic', 'audio2word'];
    if (stage.n >= 2) types.push('missing');
    var items = [];
    reviewIds.forEach(function (id) {
      var w = wordById[id];
      items.push(quizItem(shuffle(w.g ? types.concat(['gender']) : types)[0], w, p, stage.options));
    });
    var review = shuffle(items);
    var fresh = [];
    newIds.forEach(function (id) {
      var t = shuffle(types);
      // words from the male & female sector always get one "مُذَكَّرٌ أَمْ مُؤَنَّثٌ؟" question
      if (wordById[id].cat === 'gender') t[1] = 'gender';
      fresh.push(quizItem(t[0], wordById[id], p, stage.options));
      fresh.push(quizItem(t[1], wordById[id], p, stage.options));
    });
    // spread the two questions about the same word apart
    fresh = shuffle(fresh);
    for (var i = 1; i < fresh.length; i++) {
      if (fresh[i].word === fresh[i - 1].word) {
        var j = fresh.findIndex(function (x, k) { return k > i && x.word !== fresh[i].word; });
        if (j > 0) { var t2 = fresh[i]; fresh[i] = fresh[j]; fresh[j] = t2; }
      }
    }
    return { review: review, practice: fresh };
  }

  // Build (or resume) the plan for the next daily session.
  function planToday(p) {
    var day = p.day;
    if (p.pending && p.pending.day === day && p.pending.v === PLAN_V) return hydrate(p, p.pending);
    var stage = stageFor(day);
    var review = isReviewDay(day);
    var plan = { v: PLAN_V, day: day, review: review, newWords: [], reviewWords: [], cursor: p.catCursor };
    if (review) {
      var recent = learnedIds(p).filter(function (id) { return p.words[id].learnedDay > day - 7; });
      var due = dueWords(p, day);
      plan.reviewWords = shuffle(recent).concat(due.filter(function (id) { return recent.indexOf(id) < 0; })).slice(0, 20);
    } else {
      var picked = pickNewWords(p, stage.newPerDay);
      plan.newWords = picked.ids;
      plan.cursor = picked.cursor;
      plan.reviewWords = dueWords(p, day).slice(0, stage.reviewMax);
    }
    var quiz = buildQuiz(plan.reviewWords, plan.newWords, p, stage);
    plan.quizReview = quiz.review;
    plan.quizPractice = quiz.practice;
    plan.sentences = pickSentences(p, day, plan.newWords, review ? 6 : stage.read, stage.level).map(function (s) { return s.id; });
    p.pending = plan;
    Store.save();
    return hydrate(p, plan);
  }

  function hydrate(p, plan) {
    var stage = stageFor(plan.day);
    return Object.assign({}, plan, { stage: stage, week: weekOf(plan.day) });
  }

  // ── spaced repetition updates ──
  function introduce(p, id, day) {
    if (!p.words[id]) p.words[id] = { box: 1, due: day + 1, learnedDay: day, seen: 0, correct: 0, wrong: 0 };
  }
  function grade(p, id, correct, day) {
    var w = p.words[id];
    if (!w) return;
    w.seen++;
    if (correct) { w.correct++; w.box = Math.min(w.box + 1, INTERVALS.length - 1); }
    else { w.wrong++; w.box = 1; }
    w.due = day + INTERVALS[w.box];
  }

  function finishDay(p, summary) {
    var t = Store.today();
    if (p.pending) p.catCursor = p.pending.cursor;
    if (p.lastSessionDate !== t) {
      var gap = p.lastSessionDate ? Store.daysBetween(p.lastSessionDate, t) : 99;
      p.streak = gap === 1 ? p.streak + 1 : 1;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
    }
    p.lastSessionDate = t;
    p.log.push(Object.assign({ day: p.day, date: t }, summary));
    p.day++;
    p.pending = null;
    Store.save();
  }

  function streakAlive(p) {
    if (!p.lastSessionDate) return 0;
    return Store.daysBetween(p.lastSessionDate, Store.today()) <= 1 ? p.streak : 0;
  }

  function stats(p) {
    var ids = learnedIds(p);
    return {
      learned: ids.length,
      mastered: ids.filter(function (id) { return p.words[id].box >= 5; }).length,
      total: WORDS.length,
    };
  }

  return {
    TOTAL_DAYS: TOTAL_DAYS, STAGES: STAGES, wordById: wordById, sentencesByWord: sentencesByWord,
    weekOf: weekOf, stageFor: stageFor, isReviewDay: isReviewDay, planToday: planToday, introduce: introduce,
    grade: grade, finishDay: finishDay, pickSentences: pickSentences, streakAlive: streakAlive, stats: stats, shuffle: shuffle, learnedIds: learnedIds,
    sentenceById: function (id) { return SENTENCES.filter(function (s) { return s.id === id; })[0]; },
  };
})();
