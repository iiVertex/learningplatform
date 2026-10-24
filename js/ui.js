// Shared UI building blocks.
window.UI = (function () {
  // Tiny DOM builder: h('div.card#id', { onclick: fn, style: '' }, children...)
  function h(sel, attrs) {
    var m = sel.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i) || [];
    var el = document.createElement(m[1] || 'div');
    (m[2] || '').replace(/([.#])([\w-]+)/g, function (_, t, v) { if (t === '.') el.classList.add(v); else el.id = v; });
    var kids = Array.prototype.slice.call(arguments, 2);
    if (attrs && (typeof attrs !== 'object' || attrs.nodeType || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    (function add(list) {
      list.forEach(function (c) {
        if (c == null || c === false) return;
        if (Array.isArray(c)) add(c);
        else el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
      });
    })(kids);
    return el;
  }

  // Arabic text where every word is a .w span and every letter (with its harakat) a .g span.
  // opts.onWord(index, wordEl) makes words tappable.
  function arabic(text, opts) {
    opts = opts || {};
    var root = h('span.ar' + (opts.cls ? '.' + opts.cls : ''), { dir: 'rtl', lang: 'ar' });
    var u = 0;
    Arabic.splitWords(text).forEach(function (word, wi) {
      if (wi) root.appendChild(document.createTextNode(' '));
      var w = h('span.w', { dataset: { text: word, i: wi } });
      Arabic.wordUnits(word).forEach(function (unit) {
        w.appendChild(h('span.g', { dataset: { u: u++, wt: unit.weight || 0.2 } }, unit.g));
      });
      if (opts.onWord) {
        w.classList.add('tap');
        w.addEventListener('click', function () { opts.onWord(wi, w); });
      }
      root.appendChild(w);
    });
    return root;
  }

  // Letter tiles for a word (isolated letters with their harakat), linked to the word by data-u.
  function tiles(text) {
    var box = h('div.tiles', { dir: 'rtl' });
    var u = 0;
    Arabic.splitWords(text).forEach(function (word, wi) {
      if (wi) box.appendChild(h('span.tile-gap'));
      Arabic.wordUnits(word).forEach(function (unit) {
        var id = u++;
        if (!unit.letter) return;
        box.appendChild(h('span.tile', { dataset: { u: id } }, unit.g));
      });
    });
    return box;
  }

  // Colour the letters of a rendered sentence from an Arabic.assess() result.
  function paintAssessment(el, result) {
    var words = el.querySelectorAll('.w');
    result.words.forEach(function (r, i) {
      var w = words[i];
      if (!w) return;
      w.classList.remove('good', 'close', 'miss', 'live');
      w.classList.add(r.status);
      var li = 0;
      w.querySelectorAll('.g').forEach(function (g, gi) {
        g.classList.remove('ok', 'bad');
        if (!r.units[gi] || !r.units[gi].letter) return;
        g.classList.add(r.letterOk[li++] ? 'ok' : 'bad');
      });
    });
  }
  function clearAssessment(el) {
    el.querySelectorAll('.w').forEach(function (w) { w.classList.remove('good', 'close', 'miss', 'live'); });
    el.querySelectorAll('.g').forEach(function (g) { g.classList.remove('ok', 'bad'); });
  }

  // Picture for a word: parent override → downloaded photo → colour swatch → emoji.
  function picture(word, cls) {
    var p = Store.get();
    var box = h('div.pic' + (cls ? '.' + cls : ''));
    var src = p.imageOverrides[word.id] || (window.IMAGE_FILES || {})[word.id];
    if (word.img && word.img.indexOf('color:') === 0 && !p.imageOverrides[word.id]) {
      box.classList.add('swatch');
      box.style.background = word.img.slice(6);
      return box;
    }
    if (src) {
      var img = h('img', { src: src, alt: '', loading: 'lazy', draggable: 'false' });
      img.onerror = function () { box.innerHTML = ''; box.classList.add('emoji'); box.textContent = word.emoji; };
      box.appendChild(img);
    } else {
      box.classList.add('emoji');
      box.textContent = word.emoji;
    }
    return box;
  }

  // ── sound effects (synthesised, no files) ──
  var actx = null;
  function tone(freqs, dur, type, gain) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var t0 = actx.currentTime;
      freqs.forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = type || 'sine';
        o.frequency.value = f;
        var st = t0 + i * dur * 0.8;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(gain || 0.18, st + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
        o.connect(g); g.connect(actx.destination);
        o.start(st); o.stop(st + dur + 0.05);
      });
    } catch (e) { /* audio not available */ }
  }
  var sfx = {
    good: function () { tone([660, 880], 0.16, 'sine'); },
    bad: function () { tone([220, 180], 0.18, 'triangle', 0.12); },
    star: function () { tone([880, 1175, 1568], 0.12, 'sine', 0.12); },
    fanfare: function () { tone([523, 659, 784, 1047], 0.2, 'triangle', 0.15); },
    tap: function () { tone([520], 0.05, 'sine', 0.06); },
  };

  function confetti() {
    var colors = ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff', '#ff9f1c', '#c77dff'];
    var layer = h('div.confetti');
    for (var i = 0; i < 90; i++) {
      var c = h('i');
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = Math.random() * 0.6 + 's';
      c.style.animationDuration = 2 + Math.random() * 1.5 + 's';
      c.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
      layer.appendChild(c);
    }
    document.body.appendChild(layer);
    setTimeout(function () { layer.remove(); }, 4200);
  }

  function toast(msg, ms) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, ms || 3500);
  }

  // In-page dialog (never a browser alert/confirm).
  function modal(content, buttons) {
    var back = h('div.modal-back');
    var box = h('div.modal', content);
    var row = h('div.modal-actions');
    (buttons || [{ label: 'OK' }]).forEach(function (b) {
      row.appendChild(h('button.btn' + (b.cls ? '.' + b.cls : ''), {
        onclick: function () { back.remove(); if (b.onclick) b.onclick(); },
      }, b.label));
    });
    box.appendChild(row);
    back.appendChild(box);
    back.addEventListener('click', function (e) { if (e.target === back) back.remove(); });
    document.body.appendChild(back);
    return back;
  }

  function stars(n, max) {
    var row = h('div.stars');
    for (var i = 0; i < (max || 3); i++) row.appendChild(h('span' + (i < n ? '.on' : ''), '★'));
    return row;
  }

  // Speaker button that says an instruction phrase.
  function sayBtn(key) {
    return h('button.icon-btn.say', { title: 'Listen', onclick: function (e) { e.stopPropagation(); Voice.play('u:' + key, PHRASES[key]); } }, '🔊');
  }

  // Reading widget: a big text with Listen / Slow / Read-aloud buttons and live, letter-level feedback.
  // opts: { key, text, size, onResult(result, attempt), autoListen, compact }
  function readAloud(opts) {
    var settings = Store.get().settings;
    var textEl = arabic(opts.text, {
      cls: opts.size || 'big',
      onWord: function (i, w) {
        // tap a word to hear just that word (taken from the sentence recording)
        var t = Voice.timing(opts.key);
        if (t && t.t === opts.text && t.m[i]) Voice.play(opts.key, opts.text, { el: textEl, segment: i });
        else Voice.play('x:none', w.dataset.text, { el: w.parentNode });
      },
    });
    var box = h('div.read-box', textEl);
    var feedback = h('div.feedback');
    var micBtn, listenBtn, slowBtn, stopBtn;
    var session = null, attempts = 0;

    function setBusy(mode) {
      box.classList.toggle('listening', mode === 'mic');
      micBtn.classList.toggle('hidden', mode === 'mic');
      stopBtn.classList.toggle('hidden', mode !== 'mic');
      listenBtn.disabled = slowBtn.disabled = mode === 'mic';
    }

    function listen(slow) {
      if (session) return;
      clearAssessment(textEl);
      return Voice.play(opts.key, opts.text, { el: textEl, tiles: opts.tiles, slow: slow });
    }

    function message(ar, en) {
      feedback.innerHTML = '';
      if (ar) feedback.appendChild(h('p.msg', ar));
      if (en) feedback.appendChild(h('p.hint-en', en));
    }

    function startMic() {
      Voice.stop();
      Recordings.stop();
      if (!Listener.supported && !Listener.canRecord) {
        message(null, 'Speech checking needs Google Chrome. You can still listen and read along.');
        if (opts.onResult) opts.onResult(null, ++attempts);
        return;
      }
      clearAssessment(textEl);
      var level = h('i');
      feedback.innerHTML = '';
      feedback.appendChild(h('div.listening-note', h('span.pulse'), ' أَنَا أَسْتَمِعُ... اقْرَأِ الْآنَ'));
      feedback.appendChild(h('div.level', level));
      setBusy('mic');
      var words = Arabic.splitWords(opts.text).length;
      session = Listener.listen({
        lang: settings.recLang,
        silenceMs: words <= 2 ? 2000 : 3000,
        maxMs: words <= 2 ? 15000 : 45000,
        isComplete: function (c) { return Arabic.assessBest(opts.text, c).score === 100; },
        onLevel: function (v) { level.style.width = Math.round(v * 100) + '%'; },
        onUpdate: function (c) {
          // live follow-along: words light up as they are recognised
          var r = Arabic.assessBest(opts.text, c);
          textEl.querySelectorAll('.w').forEach(function (w, i) { w.classList.toggle('live', r.words[i].status === 'good'); });
        },
        onDone: function (res) {
          session = null;
          setBusy('idle');
          var result = res.heard ? Arabic.assessBest(opts.text, res.candidates) : null;
          // keep his voice for the parent whenever he actually said something
          if (res.audio && (res.heard || res.voiced)) {
            Recordings.save({
              key: opts.key, text: opts.text, day: Store.get().day, ms: res.ms,
              score: result ? result.score : null, heard: result ? result.transcript : '',
            }, res.audio);
          }
          if (res.error && Listener.message(res.error) && !result) {
            message(null, Listener.message(res.error));
            if (res.error === 'network' && opts.onResult) opts.onResult(null, ++attempts);
            return;
          }
          if (!result) {
            if (res.voiced && Listener.supported) message('سَمِعْتُ صَوْتَكَ، لَكِنْ لَمْ أَفْهَمْ. اقْتَرِبْ وَاقْرَأْ بِوُضُوحٍ.');
            else if (res.voiced) {
              message('أَحْسَنْتَ! 👍', 'Recorded for the parent. Speech checking needs Google Chrome.');
              if (opts.onResult) opts.onResult(null, ++attempts);
            } else message('لَمْ أَسْمَعْكَ. اضْغَطْ عَلَى الْمَيْكْرُوفُونِ وَاقْرَأْ بِصَوْتٍ عَالٍ.',
              res.ms > 3000 ? 'The microphone picked up no sound. Check that the right microphone is selected and not muted.' : null);
            return;
          }
          attempts++;
          paintAssessment(textEl, result);
          showResult(result);
          if (opts.onResult) opts.onResult(result, attempts);
        },
      });
    }

    function showResult(result) {
      feedback.innerHTML = '';
      var n = result.score >= 90 ? 3 : result.score >= 70 ? 2 : result.score >= 40 ? 1 : 0;
      var key = result.score === 100 ? 'excellent' : result.score >= 90 ? 'great' : result.score >= 60 ? 'almost' : 'tryAgain';
      feedback.appendChild(stars(n));
      feedback.appendChild(h('p.msg', PHRASES[key]));
      if (result.score < 100) feedback.appendChild(h('p.hint', 'اضْغَطْ عَلَى الْكَلِمَةِ الْمُلَوَّنَةِ لِتَسْمَعَهَا.'));
      if (n >= 2) sfx.good(); else sfx.bad();
      Voice.play('u:' + key, PHRASES[key]);
    }

    listenBtn = h('button.btn.btn-listen', { onclick: function () { listen(false); } }, '🔊 اسْتَمِعْ');
    slowBtn = h('button.btn.btn-slow', { onclick: function () { listen(true); }, title: 'Slow' }, '🐢');
    micBtn = h('button.btn.btn-mic', { onclick: startMic }, '🎤 ' + (opts.micLabel || 'اقْرَأْ'));
    stopBtn = h('button.btn.btn-stop.hidden', { onclick: function () { if (session) session.stop(); } }, '⏹ انْتَهَيْتُ');

    var el = h('div.read-aloud', box, h('div.controls', micBtn, stopBtn, listenBtn, slowBtn), feedback);
    return {
      el: el,
      textEl: textEl,
      listen: listen,
      destroy: function () { if (session) session.abort(); session = null; },
    };
  }

  return {
    h: h, arabic: arabic, tiles: tiles, picture: picture, sfx: sfx, confetti: confetti, toast: toast, modal: modal,
    stars: stars, sayBtn: sayBtn, readAloud: readAloud, paintAssessment: paintAssessment, clearAssessment: clearAssessment,
  };
})();
