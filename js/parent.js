// Parents' area (English): progress, weak words, reading history, plan, settings, backup.
window.Parent = (function () {
  var h = UI.h;
  var W = Curriculum.wordById;
  var tab = 'overview';

  function show(app) {
    if (sessionStorage.getItem('ysf.parent') === '1') return dashboard(app);
    var a = 6 + Math.floor(Math.random() * 7), b = 6 + Math.floor(Math.random() * 7);
    var input = h('input.input', { type: 'number', inputmode: 'numeric', placeholder: '?' });
    function check() {
      if (+input.value === a * b) { sessionStorage.setItem('ysf.parent', '1'); dashboard(app); }
      else { UI.toast('Not quite — try again'); input.value = ''; }
    }
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
    app.appendChild(h('div.screen.parent', { dir: 'ltr' },
      h('div.card.gate', h('h2', '👨‍👩‍👦 Parents only'), h('p', 'What is ' + a + ' × ' + b + '?'), input,
        h('div.row', h('button.btn', { onclick: function () { App.go('home'); } }, 'Back'),
          h('button.btn.btn-primary', { onclick: check }, 'Enter')))));
    input.focus();
  }

  function dashboard(app) {
    app.innerHTML = '';
    var tabs = [['overview', 'Overview'], ['words', 'Words'], ['reading', 'Reading'], ['plan', '6-month plan'], ['settings', 'Settings']];
    var body = h('div.p-body');
    var nav = h('div.p-tabs', tabs.map(function (t) {
      return h('button.p-tab' + (tab === t[0] ? '.on' : ''), { onclick: function () { tab = t[0]; dashboard(app); } }, t[1]);
    }));
    app.appendChild(h('div.screen.parent', { dir: 'ltr' },
      h('div.p-head', h('button.btn', { onclick: function () { App.go('home'); } }, '← Back to app'), h('h2', 'Parents\' dashboard')),
      nav, body));
    ({ overview: overview, words: words, reading: reading, plan: plan, settings: settings })[tab](body, app);
  }

  function statCard(label, value, sub) {
    return h('div.p-stat', h('div.p-stat-label', label), h('div.p-stat-value', value), sub ? h('div.p-stat-sub', sub) : null);
  }
  function pct(c, t) { return t ? Math.round((c / t) * 100) + '%' : '—'; }
  function bar(v) {
    var color = v >= 85 ? 'var(--good)' : v >= 60 ? 'var(--close)' : 'var(--miss)';
    return h('span.p-bar', h('i', { style: 'width:' + v + '%;background:' + color }), h('b', v + '%'));
  }

  function overview(body) {
    var p = Store.get();
    var st = Curriculum.stats(p);
    var day = Math.min(p.day, Curriculum.TOTAL_DAYS);
    var stage = Curriculum.stageFor(day);
    var last7 = p.log.slice(-7).filter(function (l) { return l.reading != null; });
    var readAvg = last7.length ? Math.round(last7.reduce(function (a, l) { return a + l.reading; }, 0) / last7.length) : null;
    var secs = p.log.reduce(function (a, l) { return a + (l.secs || 0); }, 0);
    var q = p.log.reduce(function (a, l) { return { c: a.c + l.quiz.c, t: a.t + l.quiz.t }; }, { c: 0, t: 0 });
    body.appendChild(h('div.p-stats',
      statCard('Program day', (p.day - 1) + ' done', 'Next: day ' + p.day + ' of ' + Curriculum.TOTAL_DAYS + ' · week ' + Curriculum.weekOf(day)),
      statCard('Stage', stage.icon + ' ' + stage.n + ' · ' + stage.en, stage.goal),
      statCard('Streak', '🔥 ' + Curriculum.streakAlive(p), 'Best: ' + p.bestStreak + ' days'),
      statCard('Words', st.learned + ' / ' + st.total, st.mastered + ' mastered (reviewed correctly over weeks)'),
      statCard('Reading score', readAvg != null ? readAvg + '%' : '—', 'Average of the last 7 sessions'),
      statCard('Word games', pct(q.c, q.t), 'First-try accuracy, all time'),
      statCard('Time practised', Math.round(secs / 60) + ' min', p.log.length ? 'About ' + Math.round(secs / 60 / p.log.length) + ' min per session' : '')));

    var weak = Curriculum.learnedIds(p).filter(function (id) { return p.words[id].wrong > 0 && p.words[id].box <= 2; });
    if (weak.length) {
      body.appendChild(h('h3', 'Words to practise together'));
      body.appendChild(h('div.p-chips', weak.slice(0, 20).map(function (id) {
        return h('button.p-word', { onclick: function () { Voice.play('w:' + id, W[id].ar); } }, UI.arabic(W[id].ar, { cls: 'small' }), ' · ' + W[id].en);
      })));
    }

    body.appendChild(h('h3', 'Recent sessions'));
    if (!p.log.length) { body.appendChild(h('p.muted', 'No sessions yet.')); return; }
    var rows = p.log.slice(-21).reverse().map(function (l) {
      return h('tr',
        h('td', l.date), h('td', String(l.day) + (l.review ? ' 🏅' : '')),
        h('td', h('span.ar.small', (l.newWords || []).map(function (id) { return W[id] ? Arabic.stripHarakat(W[id].ar) : id; }).join('، ') || '—')),
        h('td', l.quiz.t ? bar(Math.round((l.quiz.c / l.quiz.t) * 100)) : '—'),
        h('td', l.reading != null ? bar(l.reading) : '—'),
        h('td', Math.round((l.secs || 0) / 60) + ' min'),
        h('td', '⭐ ' + (l.stars || 0)));
    });
    body.appendChild(h('div.p-table-wrap', h('table.p-table',
      h('thead', h('tr', ['Date', 'Day', 'New words', 'Word games', 'Reading', 'Time', 'Stars'].map(function (t) { return h('th', t); }))),
      h('tbody', rows))));
  }

  function words(body, app) {
    var p = Store.get();
    var filter = body.dataset.filter || 'all';
    var ids = Curriculum.learnedIds(p);
    var shown = ids.filter(function (id) {
      var w = p.words[id];
      return filter === 'all' || (filter === 'weak' ? w.wrong > 0 && w.box <= 2 : w.box >= 5);
    }).sort(function (a, b) { return p.words[a].box - p.words[b].box; });
    var seg = h('div.row', [['all', 'All learned (' + ids.length + ')'], ['weak', 'Needs practice'], ['mastered', 'Mastered']].map(function (f) {
      return h('button.btn.small' + (filter === f[0] ? '.btn-primary' : ''), { onclick: function () { body.innerHTML = ''; body.dataset.filter = f[0]; words(body, app); } }, f[1]);
    }));
    body.appendChild(seg);
    body.appendChild(h('p.muted', 'Level 1–6: each correct answer moves a word up and spaces its next review further out; a mistake sends it back to level 1. Use "Picture" to replace any photo you don\'t like.'));
    var rows = shown.map(function (id) {
      var w = W[id], s = p.words[id];
      return h('tr',
        h('td', UI.picture(w, 'thumb')),
        h('td', h('button.linkish', { onclick: function () { Voice.play('w:' + id, w.ar); } }, UI.arabic(w.ar, { cls: 'small' }), ' 🔊')),
        h('td', w.en),
        h('td', (CATEGORIES.filter(function (c) { return c.id === w.cat; })[0] || {}).en),
        h('td', h('span.dots', [1, 2, 3, 4, 5, 6].map(function (i) { return h('i' + (i <= s.box ? '.on' : '')); }))),
        h('td', s.seen ? pct(s.correct, s.seen) + ' of ' + s.seen : '—'),
        h('td', h('button.btn.small', { onclick: function () { pictureEditor(w, function () { body.innerHTML = ''; words(body, app); }); } }, 'Picture')));
    });
    body.appendChild(h('div.p-table-wrap', h('table.p-table',
      h('thead', h('tr', ['', 'Arabic', 'English', 'Category', 'Level', 'Accuracy', ''].map(function (t) { return h('th', t); }))),
      h('tbody', rows))));
    if (!shown.length) body.appendChild(h('p.muted', 'Nothing here yet.'));
  }

  function pictureEditor(w, done) {
    var p = Store.get();
    var url = h('input.input', { placeholder: 'Paste an image URL (https://…)', dir: 'ltr' });
    var file = h('input', { type: 'file', accept: 'image/*' });
    file.onchange = function () {
      var f = file.files[0];
      if (!f) return;
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        var s = Math.min(1, 480 / Math.max(img.width, img.height));
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        p.imageOverrides[w.id] = c.toDataURL('image/jpeg', 0.82);
        Store.save(); UI.toast('Picture saved'); document.querySelector('.modal-back').remove(); done();
      };
      img.src = URL.createObjectURL(f);
    };
    UI.modal([h('div', { dir: 'ltr' }, h('h3', 'Picture for ' + w.en), UI.picture(w, 'mid'),
      h('p.muted', 'Upload a photo from this computer, or paste a link to one.'), file, url)], [
      { label: 'Use original', onclick: function () { delete p.imageOverrides[w.id]; Store.save(); done(); } },
      { label: 'Save link', cls: 'btn-primary', onclick: function () { if (url.value.trim()) { p.imageOverrides[w.id] = url.value.trim(); Store.save(); } done(); } },
    ]);
  }

  function reading(body) {
    var p = Store.get();
    var ids = Object.keys(p.sentences).filter(function (id) { return Curriculum.sentenceById(id) && p.sentences[id].attempts; });
    ids.sort(function (a, b) { return p.sentences[a].best - p.sentences[b].best; });
    body.appendChild(h('p.muted', 'Every sentence he has read aloud, hardest first. "Best" is the best attempt; tap 🔊 to hear the model reading. Words he struggled with in his last attempt are listed on the right.'));
    if (!ids.length) { body.appendChild(h('p.muted', 'No reading yet.')); return; }
    body.appendChild(h('div.p-table-wrap', h('table.p-table',
      h('thead', h('tr', ['Sentence', 'Tries', 'Best', 'Last', 'Missed words'].map(function (t) { return h('th', t); }))),
      h('tbody', ids.map(function (id) {
        var s = Curriculum.sentenceById(id), r = p.sentences[id];
        return h('tr',
          h('td', h('button.linkish', { onclick: function () { Voice.play('s:' + id, s.t); } }, UI.arabic(s.t, { cls: 'small' }), ' 🔊')),
          h('td', String(r.attempts)), h('td', bar(r.best)), h('td', String(r.last) + '%'),
          h('td', h('span.ar.small', (r.missed || []).join('  '))));
      })))));
  }

  function plan(body) {
    var p = Store.get();
    var curStage = Curriculum.stageFor(Math.min(p.day, Curriculum.TOTAL_DAYS)).n;
    body.appendChild(h('p', 'Six days a week he learns new words, plays word games with them and reads sentences aloud. Every 7th day is a review-and-challenge day with no new words. Spaced repetition brings back each word just before it would be forgotten, so the reviews get further apart as he masters it.'));
    var tiers = {}, levels = {};
    WORDS.forEach(function (w) { tiers[w.tier] = (tiers[w.tier] || 0) + 1; });
    SENTENCES.forEach(function (s) { levels[s.level] = (levels[s.level] || 0) + 1; });
    body.appendChild(h('div.p-table-wrap', h('table.p-table',
      h('thead', h('tr', ['Stage', 'Weeks', 'Focus', 'New words / day', 'Sentences', 'Content ready'].map(function (t) { return h('th', t); }))),
      h('tbody', Curriculum.STAGES.map(function (s) {
        var ready = (tiers[s.n] || 0) + ' words · ' + (levels[s.level] || 0) + ' sentences';
        return h('tr' + (s.n === curStage ? '.hl' : ''),
          h('td', s.icon + ' ' + s.n + ' · ' + s.en), h('td', s.from + '–' + s.to), h('td', s.goal),
          h('td', String(s.newPerDay)), h('td', 'Level ' + s.level), h('td', (tiers[s.n] || levels[s.level]) ? ready : 'coming next'));
      })))));
    body.appendChild(h('h3', 'Vocabulary sectors'));
    body.appendChild(h('div.p-chips', CATEGORIES.map(function (c) {
      var n = WORDS.filter(function (w) { return w.cat === c.id; }).length;
      var got = WORDS.filter(function (w) { return w.cat === c.id && p.words[w.id]; }).length;
      return h('span.p-word', c.icon + ' ' + c.en + ' ' + got + '/' + n);
    })));
  }

  function settings(body, app) {
    var p = Store.get();
    var s = p.settings;
    function field(label, control, help) { return h('div.p-field', h('label', label), control, help ? h('p.muted', help) : null); }
    function select(value, options, onchange) {
      var el = h('select.input', options.map(function (o) { return h('option', { value: o[0], selected: String(o[0]) === String(value) }, o[1]); }));
      el.onchange = function () { onchange(el.value); Store.save(); UI.toast('Saved'); };
      return el;
    }
    function toggle(value, onchange) {
      var el = h('input', { type: 'checkbox', checked: value });
      el.onchange = function () { onchange(el.checked); Store.save(); UI.toast('Saved'); };
      return el;
    }
    var name = h('input.input', { value: p.profile.name, dir: 'rtl' });
    name.onchange = function () { p.profile.name = name.value.trim(); Store.save(); UI.toast('Saved'); };

    var micOut = h('div.p-mic-out');
    var micBtn = h('button.btn', {
      onclick: function () {
        if (!Listener.supported) { micOut.textContent = 'This browser has no speech recognition — please use Google Chrome.'; return; }
        micOut.textContent = '🎤 Listening… say a short Arabic sentence.';
        Listener.listen({
          lang: s.recLang, silenceMs: 2500,
          onUpdate: function (c) { micOut.textContent = '🎤 ' + c[0]; },
          onDone: function (r) { micOut.textContent = r.error ? Listener.message(r.error) || r.error : r.heard ? 'Heard: ' + r.candidates[0] : 'Nothing heard — check the microphone.'; },
        });
      },
    }, 'Test microphone');

    var jump = select('', [['', 'Choose…']].concat(Curriculum.STAGES.slice(1).map(function (st) { return [st.n, 'Start at stage ' + st.n + ' (' + st.en + ', week ' + st.from + ')']; })), function (v) {
      if (!v) return;
      var st = Curriculum.STAGES[v - 1];
      var day = (st.from - 1) * 7 + 1;
      WORDS.forEach(function (w) { if (w.tier < st.n && !p.words[w.id]) p.words[w.id] = { box: 3, due: day + 2, learnedDay: day - 1, seen: 0, correct: 0, wrong: 0 }; });
      p.day = day; p.pending = null; Store.save(); UI.toast('Moved to day ' + day); dashboard(app);
    });

    body.appendChild(h('div.p-settings',
      field('Child\'s name', name),
      field('Voice', select(s.voice, [['f', 'Female (Zariyah)'], ['m', 'Male (Hamed)']], function (v) { s.voice = v; Voice.play('u:hello', PHRASES.hello); })),
      field('Speaking speed', select(s.speed, [[0.8, 'Slower'], [0.9, 'A bit slower'], [1, 'Normal']], function (v) { s.speed = +v; })),
      field('Speech recognition dialect', select(s.recLang, [['ar-SA', 'Arabic (Saudi Arabia)'], ['ar-AE', 'Arabic (UAE)'], ['ar-EG', 'Arabic (Egypt)'], ['ar-JO', 'Arabic (Jordan)'], ['ar-KW', 'Arabic (Kuwait)'], ['ar-QA', 'Arabic (Qatar)'], ['ar-LB', 'Arabic (Lebanon)'], ['ar-MA', 'Arabic (Morocco)'], ['ar-TN', 'Arabic (Tunisia)']], function (v) { s.recLang = v; }),
        'Pick the closest to his accent. Reading is always checked against the written standard Arabic.'),
      field('Microphone', h('div', micBtn, micOut)),
      field('Show English meaning', toggle(s.englishHints, function (v) { s.englishHints = v; }), 'Off by default so he connects the Arabic word straight to the picture.'),
      field('Allow more than one session per day', toggle(s.multiPerDay, function (v) { s.multiPerDay = v; }), 'Off keeps a steady daily rhythm. Extra practice is always available after the daily session.'),
      field('Placement', jump, 'If stage 1 is too easy, skip ahead. Earlier words are marked as known and still come back in reviews.'),
      field('Backup', h('div.row',
        h('button.btn', { onclick: exportData }, 'Download backup'),
        (function () {
          var f = h('input', { type: 'file', accept: 'application/json', style: 'display:none' });
          f.onchange = function () {
            var r = new FileReader();
            r.onload = function () { try { Store.replace(JSON.parse(r.result)); UI.toast('Backup restored'); dashboard(app); } catch (e) { UI.toast('That file is not a valid backup'); } };
            r.readAsText(f.files[0]);
          };
          return h('span', f, h('button.btn', { onclick: function () { f.click(); } }, 'Restore backup'));
        })()), 'Progress is stored in this browser on this computer. Download a backup now and then.'),
      field('Reset', h('button.btn.btn-danger', {
        onclick: function () {
          var inp = h('input.input', { placeholder: 'type RESET' });
          UI.modal([h('div', { dir: 'ltr' }, h('h3', 'Erase all progress?'), h('p', 'This cannot be undone. Type RESET to confirm.'), inp)], [
            { label: 'Cancel' },
            { label: 'Erase', cls: 'btn-danger', onclick: function () { if (inp.value === 'RESET') { Store.reset(); sessionStorage.removeItem('ysf.parent'); App.go('home'); } } },
          ]);
        },
      }, 'Erase all progress'))));
  }

  function exportData() {
    var blob = new Blob([JSON.stringify(Store.get(), null, 1)], { type: 'application/json' });
    var a = h('a', { href: URL.createObjectURL(blob), download: 'reading-journey-backup-' + Store.today() + '.json' });
    document.body.appendChild(a); a.click(); a.remove();
  }

  return { show: show };
})();
