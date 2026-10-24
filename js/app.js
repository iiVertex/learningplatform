// Screens: onboarding, home, my words (dictionary), journey map. Parent area lives in parent.js.
window.App = (function () {
  var h = UI.h;
  var app = document.getElementById('app');
  var ORDINAL = ['', 'الْأُولَى', 'الثَّانِيَةُ', 'الثَّالِثَةُ', 'الرَّابِعَةُ', 'الْخَامِسَةُ'];

  function go(name, arg) {
    Voice.stop();
    app.innerHTML = '';
    document.body.dataset.screen = name;
    if (name === 'session') { if (!Session.start(app, arg || 'daily')) go('home'); return; }
    (SCREENS[name] || SCREENS.home)(arg);
    window.scrollTo(0, 0);
  }

  function header(title, back) {
    return h('div.topbar.plain',
      h('button.icon-btn', { title: 'Back', onclick: function () { go(back || 'home'); } }, '→'),
      h('div.title', UI.arabic(title, { cls: 'mid' })));
  }

  // ── first run (for the parent) ──
  function onboarding() {
    var p = Store.get();
    var name = h('input.input', { placeholder: 'مثال: يوسف', dir: 'rtl', value: p.profile.name || '' });
    var voice = p.settings.voice;
    function voiceBtn(v, label) {
      var b = h('button.btn.choice' + (voice === v ? '.on' : ''), {
        onclick: function () {
          voice = v; p.settings.voice = v;
          box.querySelectorAll('.choice').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          Voice.play('u:hello', PHRASES.hello);
        },
      }, label);
      return b;
    }
    var box = h('div.card.onboard', { dir: 'ltr' },
      h('div.logo', '📖🌱'),
      h('h1.en', 'Welcome to the Reading Journey'),
      h('p.en', 'A 6-month daily program (about 20–30 minutes a day) to build Arabic vocabulary and reading: picture words with fully-vowelled audio, word games, and reading aloud with letter-by-letter feedback.'),
      h('label.en', 'Child\'s name (in Arabic)'), name,
      h('label.en', 'Voice'), h('div.row', voiceBtn('f', '👩 Female voice'), voiceBtn('m', '👨 Male voice')),
      h('ul.en.tips',
        h('li', 'Use Google Chrome for the reading check, and allow the microphone when asked.'),
        h('li', 'One session per day keeps the habit; the plan adapts if a day is missed.'),
        h('li', 'The Parents area (bottom of the home screen, password 1933) shows progress, his voice recordings and settings.')),
      h('button.btn.btn-primary.btn-xl', {
        onclick: function () {
          p.profile.name = name.value.trim();
          if (!p.profile.name) { UI.toast('Please type a name'); return; }
          Store.save();
          go('home');
        },
      }, 'Start ▶'));
    app.appendChild(h('div.screen', box));
  }

  // ── home ──
  function home() {
    var p = Store.get();
    if (!p.profile.name) return onboarding();
    var doneToday = p.lastSessionDate === Store.today() && !p.settings.multiPerDay;
    var st = Curriculum.stats(p);
    var stage = Curriculum.stageFor(p.day);
    var finished = p.day > Curriculum.TOTAL_DAYS;

    var hero = h('div.hero',
      h('div.mascot', '🦉'),
      h('div.bubble', h('span.ar.mid', 'مَرْحَبًا يَا ' + p.profile.name + '! 👋'), UI.sayBtn('hello')));

    var chips = h('div.chips',
      h('div.chip', '🔥 ', h('b', String(Curriculum.streakAlive(p)))),
      h('div.chip', '⭐ ', h('b', String(p.stars))),
      h('div.chip', '📚 ', h('b', String(st.learned))));

    var today;
    if (doneToday) {
      today = h('div.card.today.done',
        h('div.big-emoji', '✅'),
        UI.arabic('أَحْسَنْتَ! أَنْهَيْتَ تَمْرِينَ الْيَوْمِ.', { cls: 'mid' }),
        h('p', UI.arabic('نَلْتَقِي غَدًا', { cls: 'small' }), ' 👋'),
        h('button.btn.btn-secondary.btn-xl', { onclick: function () { go('session', 'extra'); } }, '🎯 ', UI.arabic('تَمْرِينٌ إِضَافِيٌّ', { cls: 'btn-ar' })));
    } else {
      var plan = Curriculum.planToday(p);
      var rows = h('div.plan-rows');
      if (plan.review) rows.appendChild(h('div.plan-row.special', '🏅 ', UI.arabic('يَوْمُ الْمُرَاجَعَةِ وَالتَّحَدِّي', { cls: 'small' })));
      if (plan.newWords.length) rows.appendChild(h('div.plan-row', '🆕 ', UI.arabic('كَلِمَاتٌ جَدِيدَةٌ', { cls: 'small' }), ': ' + plan.newWords.length));
      if (plan.quizReview.length) rows.appendChild(h('div.plan-row', '🔁 ', UI.arabic('مُرَاجَعَةٌ', { cls: 'small' }), ': ' + plan.quizReview.length));
      rows.appendChild(h('div.plan-row', '📖 ', UI.arabic('جُمَلٌ لِلْقِرَاءَةِ', { cls: 'small' }), ': ' + plan.sentences.length));
      today = h('div.card.today',
        h('div.today-head',
          h('div.day-num', UI.arabic('الْيَوْمُ', { cls: 'small' }), h('b', String(plan.day))),
          h('div.stage-chip', stage.icon + ' ', UI.arabic('الْمَرْحَلَةُ ' + ORDINAL[stage.n] + ': ' + stage.ar, { cls: 'small' }))),
        finished ? h('p.en', 'The 6-month plan is complete — practice continues with review and reading.') : null,
        rows,
        h('button.btn.btn-primary.btn-xl.btn-start', { onclick: function () { go('session', 'daily'); } }, UI.arabic('ابْدَأْ', { cls: 'btn-ar' }), ' ▶'));
    }

    var tiles = h('div.tiles-row',
      tile('📚', 'قَامُوسِي', function () { go('dictionary'); }),
      tile('🗺️', 'رِحْلَتِي', function () { go('journey'); }),
      tile('🎤', 'أَقْرَأُ أَكْثَرَ', function () {
        if (!Curriculum.learnedIds(p).length) { UI.toast('ابْدَأْ تَمْرِينَ الْيَوْمِ أَوَّلًا'); return; }
        go('session', 'reading');
      }),
      tile('✍️', 'أَكْتُبُ', function () {
        Voice.play('u:write', PHRASES.write);
        Worksheet.open(Worksheet.todaySet(Store.get()));
      }));

    var journey = journeyBar(p);
    app.appendChild(h('div.screen.home', hero, chips, today, journey, tiles,
      h('button.parent-link', { onclick: function () { go('parent'); } }, '👨‍👩‍👦 Parents')));
  }

  function tile(icon, label, onclick) {
    return h('button.tile-btn', { onclick: onclick }, h('span.tile-icon', icon), UI.arabic(label, { cls: 'small' }));
  }

  function journeyBar(p) {
    var pct = Math.min(100, Math.round(((p.day - 1) / Curriculum.TOTAL_DAYS) * 100));
    var marks = h('div.jb-stages');
    Curriculum.STAGES.forEach(function (s) {
      var left = ((s.from - 1) / 26) * 100;
      marks.appendChild(h('span.jb-stage', { style: 'right:' + left + '%' }, s.icon));
    });
    return h('button.journey-bar', { onclick: function () { go('journey'); } },
      h('div.jb-track', h('div.jb-fill', { style: 'width:' + pct + '%' }), marks),
      h('div.jb-label', 'الْأُسْبُوعُ ' + Math.min(26, Curriculum.weekOf(p.day)) + ' / 26'));
  }

  // ── my words ──
  function dictionary(catId) {
    var p = Store.get();
    var learned = {};
    Curriculum.learnedIds(p).forEach(function (id) { learned[id] = true; });
    var bar = h('div.cat-bar');
    var all = h('button.cat' + (!catId ? '.on' : ''), { onclick: function () { go('dictionary'); } }, '⭐ ', UI.arabic('الْكُلُّ', { cls: 'small' }));
    bar.appendChild(all);
    CATEGORIES.forEach(function (c) {
      var n = WORDS.filter(function (w) { return w.cat === c.id && learned[w.id]; }).length;
      if (!n) return;
      bar.appendChild(h('button.cat' + (catId === c.id ? '.on' : ''), { onclick: function () { go('dictionary', c.id); } },
        c.icon + ' ', UI.arabic(c.ar, { cls: 'small' })));
    });
    var list = WORDS.filter(function (w) { return learned[w.id] && (!catId || w.cat === catId); });
    var grid = h('div.word-grid');
    list.forEach(function (w) {
      var box = p.words[w.id].box;
      grid.appendChild(h('button.word-card', { onclick: function () { wordModal(w); } },
        UI.picture(w, 'pcard'),
        UI.arabic(w.ar, { cls: 'wcard' }),
        h('div.mastery', [1, 2, 3, 4, 5].map(function (i) { return h('i' + (i <= box ? '.on' : '')); }))));
    });
    var locked = WORDS.length - Object.keys(learned).length;
    app.appendChild(h('div.screen.dict', header('قَامُوسِي'), bar,
      list.length ? grid : h('div.card.empty', UI.arabic('ابْدَأْ تَمْرِينَ الْيَوْمِ لِتَجْمَعَ الْكَلِمَاتِ!', { cls: 'mid' })),
      h('p.locked', '🔒 ' + locked)));
  }

  function wordModal(w) {
    var tiles = UI.tiles(w.ar);
    var ra = UI.readAloud({ key: 'w:' + w.id, text: w.ar, size: 'huge', tiles: tiles, micLabel: 'قُلْهَا' });
    var hint = Store.get().settings.englishHints ? h('p.hint-en', w.en) : null;
    var m = UI.modal([UI.picture(w, 'big'), hint, ra.el, tiles], [{ label: '✔', cls: 'btn-primary', onclick: ra.destroy }]);
    m.classList.add('word-modal');
    setTimeout(function () { ra.listen(false); }, 300);
  }

  // ── journey map ──
  function journey() {
    var p = Store.get();
    var curWeek = Curriculum.weekOf(p.day);
    var path = h('div.path');
    Curriculum.STAGES.forEach(function (s) {
      var sec = h('div.path-stage' + (curWeek >= s.from && curWeek <= s.to ? '.current' : ''),
        h('div.stage-title', h('span.stage-icon', s.icon), UI.arabic('الْمَرْحَلَةُ ' + ORDINAL[s.n] + ': ' + s.ar, { cls: 'mid' })));
      var nodes = h('div.nodes');
      for (var wk = s.from; wk <= s.to; wk++) {
        var state = wk < curWeek ? 'done' : wk === curWeek ? 'now' : 'future';
        var label = state === 'done' ? '✓' : String(wk);
        var node = h('div.node.' + state, h('span', label));
        if (state === 'now') {
          var dayInWeek = ((p.day - 1) % 7) + 1;
          node.appendChild(h('div.node-days', [1, 2, 3, 4, 5, 6, 7].map(function (d) {
            return h('i' + (d < dayInWeek ? '.on' : d === 7 ? '.star' : ''));
          })));
          node.appendChild(h('div.you', '🦉'));
        }
        nodes.appendChild(node);
      }
      sec.appendChild(nodes);
      path.appendChild(sec);
    });
    path.appendChild(h('div.path-end', '🏆'));
    app.appendChild(h('div.screen.journey', header('رِحْلَتِي'), path));
  }

  var SCREENS = { home: home, dictionary: dictionary, journey: journey, parent: function () { Parent.show(app); } };

  function init() {
    Store.load();
    window.IMAGE_FILES = window.IMAGE_FILES || {};
    window.AUDIO_TIMINGS = window.AUDIO_TIMINGS || {};
    go('home');
  }

  return { go: go, init: init, header: header };
})();
