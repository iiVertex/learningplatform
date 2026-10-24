// A practice session: review → new words → word games → reading → celebration.
window.Session = (function () {
  var h = UI.h;
  var W = Curriculum.wordById;

  var SECTION = {
    review: { icon: '🔁', ar: 'مُرَاجَعَةٌ' },
    learn: { icon: '🆕', ar: 'كَلِمَاتٌ جَدِيدَةٌ' },
    game: { icon: '🎮', ar: 'لُعْبَةُ الْكَلِمَاتِ' },
    read: { icon: '📖', ar: 'الْقِرَاءَةُ' },
  };

  // mode: 'daily' | 'extra' | 'reading'
  function start(app, mode) {
    var p = Store.get();
    var S = { mode: mode, steps: [], i: 0, stars: 0, quiz: { c: 0, t: 0 }, reading: {}, startedAt: Date.now(), cleanup: null };

    if (mode === 'daily') {
      S.plan = Curriculum.planToday(p);
      S.day = S.plan.day;
      S.plan.quizReview.forEach(function (q) { S.steps.push({ kind: 'quiz', sec: 'review', q: q }); });
      S.plan.newWords.forEach(function (id) { S.steps.push({ kind: 'learn', sec: 'learn', word: id }); });
      S.plan.quizPractice.forEach(function (q) { S.steps.push({ kind: 'quiz', sec: 'game', q: q }); });
      S.plan.sentences.forEach(function (id) { S.steps.push({ kind: 'read', sec: 'read', sentence: id }); });
    } else {
      // extra practice: never advances the day
      S.day = Math.max(1, p.day - 1);
      var stage = Curriculum.stageFor(S.day);
      var learned = Curriculum.learnedIds(p);
      if (!learned.length) return false;
      if (mode === 'extra') {
        var weak = learned.slice().sort(function (a, b) { return p.words[a].box - p.words[b].box; });
        Curriculum.shuffle(weak.slice(0, 16)).slice(0, 8).forEach(function (id) {
          var types = ['pic2word', 'word2pic', 'audio2word'].concat(stage.n >= 2 ? ['missing'] : []);
          S.steps.push({ kind: 'quiz', sec: 'game', q: quizFor(Curriculum.shuffle(types)[0], id, stage), noGrade: true });
        });
      }
      var known = {};
      learned.forEach(function (id) { known[id] = true; });
      var pool = SENTENCES.filter(function (s) { return known[s.w] && s.level <= stage.level; });
      pool = Curriculum.shuffle(pool).sort(function (a, b) {
        var sa = p.sentences[a.id], sb = p.sentences[b.id];
        return (sa ? sa.best : -1) - (sb ? sb.best : -1);
      });
      pool.slice(0, mode === 'reading' ? 6 : 3).forEach(function (s) { S.steps.push({ kind: 'read', sec: 'read', sentence: s.id }); });
    }
    S.steps.push({ kind: 'finish' });
    render(app, S);
    return true;
  }

  // Build a one-off quiz item (extra practice) using the curriculum's generator via a throwaway plan.
  function quizFor(type, id, stage) {
    var word = W[id];
    var p = Store.get();
    var others = Curriculum.shuffle(Curriculum.learnedIds(p).filter(function (x) { return x !== id; })).slice(0, stage.options - 1);
    if (others.length < stage.options - 1) {
      Curriculum.shuffle(WORDS.filter(function (w) { return w.id !== id && others.indexOf(w.id) < 0 && w.tier <= word.tier; }))
        .slice(0, stage.options - 1 - others.length).forEach(function (w) { others.push(w.id); });
    }
    if (type === 'missing') type = 'pic2word';
    return { type: type, word: id, options: Curriculum.shuffle([id].concat(others)), answer: id };
  }

  function render(app, S) {
    if (S.cleanup) { S.cleanup(); S.cleanup = null; }
    Voice.stop();
    var step = S.steps[S.i];
    app.innerHTML = '';
    var screen = h('div.screen.session');
    if (step.kind !== 'finish') screen.appendChild(topBar(app, S, step));
    var body = h('div.stage-body');
    screen.appendChild(body);
    app.appendChild(screen);
    var next = function () { S.i++; render(app, S); };
    if (step.kind === 'learn') S.cleanup = learnStep(body, S, step, next);
    else if (step.kind === 'quiz') S.cleanup = quizStep(body, S, step, next);
    else if (step.kind === 'read') S.cleanup = readStep(body, S, step, next);
    else finishStep(body, S, app);
    window.scrollTo(0, 0);
  }

  function topBar(app, S, step) {
    var total = S.steps.length - 1;
    var sec = SECTION[step.sec] || SECTION.game;
    var bar = h('div.progress', h('div.fill', { style: 'width:' + Math.round((S.i / total) * 100) + '%' }));
    return h('div.topbar',
      h('button.icon-btn', { title: 'Exit', onclick: function () { confirmExit(app, S); } }, '✖'),
      h('div.section-chip', sec.icon + ' ', UI.arabic(sec.ar, { cls: 'chipt' })),
      bar,
      h('div.star-count', '⭐ ', h('b', String(S.stars))));
  }

  function confirmExit(app, S) {
    UI.modal([h('p.modal-title', UI.arabic('هَلْ تُرِيدُ الْخُرُوجَ؟', { cls: 'mid' })), h('p.hint-en', 'Today\'s practice will start again next time.')], [
      { label: 'لَا، أُكْمِلُ', cls: 'btn-primary' },
      { label: 'نَعَمْ', onclick: function () { if (S.cleanup) S.cleanup(); Voice.stop(); App.go('home'); } },
    ]);
  }

  function nextButton(next, label) {
    return h('button.btn.btn-next', { onclick: function () { UI.sfx.tap(); next(); } }, label || 'التَّالِي ←');
  }

  function englishHint(word) {
    return Store.get().settings.englishHints ? h('p.hint-en', word.en) : null;
  }

  // ── new word card ──
  function learnStep(body, S, step, next) {
    var p = Store.get();
    var word = W[step.word];
    Curriculum.introduce(p, word.id, S.day);
    Store.save();
    var tiles = UI.tiles(word.ar);
    var said = false;
    var ra = UI.readAloud({
      key: 'w:' + word.id, text: word.ar, size: 'huge', tiles: tiles, micLabel: 'قُلْهَا',
      onResult: function (r) { if (r && r.score === 100 && !said) { said = true; S.stars++; UI.sfx.star(); } },
    });
    body.appendChild(h('div.card.learn',
      h('div.prompt', UI.sayBtn('newWord'), UI.arabic('كَلِمَةٌ جَدِيدَةٌ', { cls: 'mid' })),
      UI.picture(word, 'big'),
      englishHint(word),
      ra.el,
      tiles,
      pairCard(word),
      h('div.actions', nextButton(next))));
    var t = setTimeout(function () { ra.listen(false); }, 450);
    return function () { clearTimeout(t); ra.destroy(); };
  }

  // Male ↔ female partner of a word (e.g. قِطٌّ / قِطَّةٌ); tap either side to hear it.
  function pairCard(word) {
    var other = word.pair && W[word.pair];
    if (!other) return null;
    var m = word.g === 'm' ? word : other, f = word.g === 'f' ? word : other;
    function side(w, label) {
      return h('button.pair-side.' + w.g + (w.id === word.id ? '.on' : ''), { onclick: function () { Voice.play('w:' + w.id, w.ar); } },
        UI.arabic(label, { cls: 'chipt' }), UI.picture(w, 'tiny'), UI.arabic(w.ar, { cls: 'small' }));
    }
    return h('div.pair', side(m, 'مُذَكَّرٌ'), side(f, 'مُؤَنَّثٌ'));
  }

  // ── word games ──
  function quizStep(body, S, step, next) {
    var q = step.q;
    var word = W[q.word];
    var answered = false;
    var timers = [];
    var card = h('div.card.quiz');
    var options = h('div.options.' + ({ word2pic: 'pics', missing: 'letters', gender: 'genders' }[q.type] || 'words'));
    var actions = h('div.actions');
    var wordEl = null;

    function prompt(key) {
      var text = PHRASES[key];
      return h('div.prompt', UI.sayBtn(key), UI.arabic(text, { cls: 'mid' }));
    }

    function finish(correct, chosenBtn, rightBtn) {
      if (answered) return;
      answered = true;
      card.classList.add('answered');
      if (!step.retry) {
        S.quiz.t++;
        if (correct) S.quiz.c++;
        if (!step.noGrade) Curriculum.grade(Store.get(), word.id, correct, S.day);
        Store.save();
      }
      if (rightBtn) rightBtn.classList.add('right');
      if (q.type === 'missing' && wordEl) {
        var full = UI.arabic(word.ar, { cls: 'huge' });
        wordEl.replaceWith(full);
        wordEl = full;
      }
      var audioEl = wordEl || (rightBtn && rightBtn.querySelector('.ar'));
      if (correct) {
        S.stars++;
        UI.sfx.good();
        Voice.play('w:' + word.id, word.ar, { el: audioEl }).then(function () {
          timers.push(setTimeout(next, 500));
        });
      } else {
        chosenBtn.classList.add('wrong');
        UI.sfx.bad();
        timers.push(setTimeout(function () { Voice.play('w:' + word.id, word.ar, { el: audioEl }); }, 400));
        actions.appendChild(nextButton(next));
        // try this word once more (options reshuffled) at the end of the section
        if (!step.retry) {
          var j = S.i + 1;
          while (j < S.steps.length && S.steps[j].sec === step.sec) j++;
          var again = Object.assign({}, q, { options: Curriculum.shuffle(q.options) });
          S.steps.splice(j, 0, { kind: 'quiz', sec: step.sec, q: again, retry: true });
        }
      }
    }

    if (q.type === 'pic2word' || q.type === 'audio2word') {
      card.appendChild(prompt(q.type));
      if (q.type === 'pic2word') card.appendChild(UI.picture(word, 'big'));
      else {
        var big = h('button.big-speaker', { onclick: function () { Voice.play('w:' + word.id, word.ar); } }, '🔊');
        card.appendChild(big);
        timers.push(setTimeout(function () { Voice.play('w:' + word.id, word.ar); }, 400));
      }
      q.options.forEach(function (id) {
        var b = h('button.opt', UI.arabic(W[id].ar, { cls: 'optw' }));
        b.onclick = function () { finish(id === q.answer, b, options.querySelector('[data-id="' + q.answer + '"]')); };
        b.dataset.id = id;
        options.appendChild(b);
      });
    } else if (q.type === 'word2pic') {
      card.appendChild(prompt('word2pic'));
      wordEl = UI.arabic(word.ar, { cls: 'huge' });
      card.appendChild(h('div.read-box', wordEl));
      q.options.forEach(function (id) {
        var b = h('button.opt.pic-opt', UI.picture(W[id], 'popt'));
        b.dataset.id = id;
        b.onclick = function () { finish(id === q.answer, b, options.querySelector('[data-id="' + q.answer + '"]')); };
        options.appendChild(b);
      });
    } else if (q.type === 'gender') {
      card.appendChild(prompt('gender'));
      card.appendChild(UI.picture(word, 'mid'));
      wordEl = UI.arabic(word.ar, { cls: 'huge' });
      card.appendChild(h('div.read-box', wordEl));
      [['m', 'مُذَكَّرٌ', '👦'], ['f', 'مُؤَنَّثٌ', '👧']].forEach(function (o) {
        var b = h('button.opt.gender-opt.' + o[0], h('span.g-icon', o[2]), UI.arabic(o[1], { cls: 'optw' }));
        b.dataset.g = o[0];
        b.onclick = function () { finish(o[0] === q.answer, b, options.querySelector('[data-g="' + q.answer + '"]')); };
        options.appendChild(b);
      });
    } else if (q.type === 'missing') {
      card.appendChild(prompt('missing'));
      card.appendChild(UI.picture(word, 'mid'));
      var units = Arabic.wordUnits(word.ar);
      var holder = h('span.ar.huge', { dir: 'rtl', lang: 'ar' });
      var wordsSoFar = Arabic.splitWords(word.ar);
      var ui = 0;
      wordsSoFar.forEach(function (wd, wi) {
        if (wi) holder.appendChild(document.createTextNode(' '));
        var wspan = h('span.w');
        Arabic.wordUnits(wd).forEach(function (u) {
          if (ui === q.hide) wspan.appendChild(h('span.g.blank', 'ـــ'));
          else wspan.appendChild(h('span.g', u.g));
          ui++;
        });
        holder.appendChild(wspan);
      });
      wordEl = holder;
      card.appendChild(h('div.read-box', holder,
        h('button.icon-btn.inline-say', { onclick: function () { Voice.play('w:' + word.id, word.ar); } }, '🔊')));
      q.options.forEach(function (g) {
        var b = h('button.opt.letter', h('span.ar', g));
        b.dataset.g = g;
        b.onclick = function () { finish(g === q.answer, b, options.querySelector('[data-g="' + q.answer + '"]')); };
        options.appendChild(b);
      });
      void units;
    }
    card.appendChild(options);
    card.appendChild(actions);
    body.appendChild(card);
    return function () { timers.forEach(clearTimeout); };
  }

  // ── reading ──
  function readStep(body, S, step, next) {
    var s = Curriculum.sentenceById(step.sentence);
    var word = W[s.w];
    var p = Store.get();
    var best = 0;
    var size = s.level <= 1 ? 'big' : s.level <= 3 ? 'large' : 'medium';
    var ra = UI.readAloud({
      key: 's:' + s.id, text: s.t, size: size,
      onResult: function (r) {
        var st = p.sentences[s.id] = p.sentences[s.id] || { attempts: 0, best: 0, last: 0, lastDay: 0, history: [] };
        st.attempts++;
        if (!r) { Store.save(); return; }
        st.last = r.score;
        st.best = Math.max(st.best, r.score);
        st.lastDay = S.day;
        st.history = st.history.concat([r.score]).slice(-10);
        st.missed = r.words.filter(function (w) { return w.status !== 'good'; }).map(function (w) { return w.word; });
        var before = best >= 90 ? 3 : best >= 70 ? 2 : best >= 40 ? 1 : 0;
        best = Math.max(best, r.score);
        var after = best >= 90 ? 3 : best >= 70 ? 2 : best >= 40 ? 1 : 0;
        S.stars += after - before;
        S.reading[s.id] = best;
        Store.save();
        nextBtn.textContent = 'التَّالِي ←';
      },
    });
    var nextBtn = nextButton(next);
    body.appendChild(h('div.card.reading',
      h('div.prompt', UI.sayBtn('read'), UI.arabic(PHRASES.read, { cls: 'mid' })),
      UI.picture(word, 'small'),
      ra.el,
      h('div.actions', nextBtn)));
    return function () { ra.destroy(); };
  }

  // ── celebration ──
  function finishStep(body, S, app) {
    var p = Store.get();
    var readScores = Object.keys(S.reading).map(function (k) { return S.reading[k]; });
    var readAvg = readScores.length ? Math.round(readScores.reduce(function (a, b) { return a + b; }, 0) / readScores.length) : null;
    p.stars += S.stars;
    if (S.mode === 'daily') {
      Curriculum.finishDay(p, {
        newWords: S.plan.newWords, sentences: S.plan.sentences, quiz: S.quiz, reading: readAvg, readCount: readScores.length,
        secs: Math.round((Date.now() - S.startedAt) / 1000), stars: S.stars, review: S.plan.review,
      });
    } else {
      Store.save();
    }
    UI.confetti();
    UI.sfx.fanfare();
    Voice.play('u:done', PHRASES.done);
    var name = p.profile.name;
    var learnedToday = S.mode === 'daily' ? S.plan.newWords.map(function (id) { return W[id]; }) : [];
    body.appendChild(h('div.card.finish',
      h('div.trophy', '🏆'),
      h('h1', UI.arabic('أَحْسَنْتَ', { cls: 'mid' }), name ? ' يَا ' + name + '!' : '!'),
      h('div.finish-stats',
        h('div.stat', h('b', '⭐ ' + S.stars), h('span', UI.arabic('نُجُومٌ', { cls: 'small' }))),
        S.mode === 'daily' ? h('div.stat', h('b', '🔥 ' + Curriculum.streakAlive(p)), h('span', UI.arabic('أَيَّامٌ مُتَتَالِيَةٌ', { cls: 'small' }))) : null,
        readAvg != null ? h('div.stat', h('b', '📖 ' + readAvg + '%'), h('span', UI.arabic('الْقِرَاءَةُ', { cls: 'small' }))) : null),
      learnedToday.length ? h('div.learned-row', learnedToday.map(function (w) {
        return h('button.mini-word', { onclick: function () { Voice.play('w:' + w.id, w.ar); } }, UI.picture(w, 'tiny'), UI.arabic(w.ar, { cls: 'small' }));
      })) : null,
      h('div.actions',
        S.mode === 'daily' ? h('button.btn.btn-secondary.btn-xl', { onclick: function () { Worksheet.open(Worksheet.todaySet(Store.get())); } }, '✍️ ', UI.arabic('وَرَقَةُ الْكِتَابَةِ', { cls: 'btn-ar' })) : null,
        h('button.btn.btn-primary.btn-xl', { onclick: function () { App.go('home'); } }, '🏠 الرَّئِيسِيَّةُ'))));
  }

  return { start: start };
})();
