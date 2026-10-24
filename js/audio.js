// Plays the pre-generated neural voice and lights up each letter as it is spoken.
// Word timings come from the TTS engine; letters inside a word are paced by a simple weight
// (shadda and long vowels take a little longer). Falls back to the browser's own Arabic voice.
window.Voice = (function () {
  var current = null;

  function settings() { return Store.get().settings; }
  function timing(key) {
    var all = window.AUDIO_TIMINGS || {};
    return (all[settings().voice] || {})[key];
  }
  function url(key) {
    var i = key.indexOf(':');
    return 'assets/audio/' + settings().voice + '/' + key.slice(0, i) + '/' + encodeURIComponent(key.slice(i + 1)) + '.mp3';
  }

  function stop() {
    if (current) { var c = current; current = null; c(); }
    if (window.speechSynthesis) speechSynthesis.cancel();
  }

  // Map each timing mark to a rendered word element (.w), tolerating small mismatches.
  function mapMarks(words, marks) {
    if (marks.length === words.length) return marks.map(function (_, i) { return i; });
    var map = [], ptr = 0;
    marks.forEach(function (m) {
      var target = Arabic.normalize(m[2]);
      for (var k = ptr; k < Math.min(words.length, ptr + 3); k++) {
        if (Arabic.similarity(Arabic.normalize(words[k].dataset.text || ''), target) >= 0.6) { ptr = k; break; }
      }
      map.push(Math.min(ptr, words.length - 1));
      ptr++;
    });
    return map;
  }

  // el: element produced by UI.arabic(); tiles: optional element whose children have matching data-u.
  function Highlighter(el, marks, tiles) {
    var words = Array.prototype.slice.call(el.querySelectorAll('.w'));
    var map = mapMarks(words, marks);
    var lit = {};
    function light(g, on) {
      g.classList.toggle('lit', on);
      if (tiles) {
        var t = tiles.querySelector('[data-u="' + g.dataset.u + '"]');
        if (t) t.classList.toggle('lit', on);
      }
    }
    return {
      at: function (ms) {
        var cur = -1;
        for (var i = 0; i < marks.length; i++) if (marks[i][0] <= ms) cur = i;
        words.forEach(function (w, wi) {
          var markIdx = map.indexOf(wi);
          var state = markIdx < 0 ? 'none' : markIdx < cur ? 'done' : markIdx === cur ? 'now' : 'none';
          w.classList.toggle('speaking', state === 'now');
          var gs = w.querySelectorAll('.g');
          var total = 0;
          gs.forEach(function (g) { total += +g.dataset.wt; });
          var frac = state === 'done' ? 1 : state === 'now' ? Math.min(1, (ms - marks[cur][0]) / Math.max(1, marks[cur][1])) : 0;
          var acc = 0;
          gs.forEach(function (g) {
            var on = state !== 'none' && (frac >= 1 || acc < frac * total + 0.001);
            acc += +g.dataset.wt;
            if (lit[g.dataset.u] !== on) { lit[g.dataset.u] = on; light(g, on); }
          });
        });
      },
      clear: function () {
        words.forEach(function (w) { w.classList.remove('speaking'); });
        el.querySelectorAll('.g.lit').forEach(function (g) { light(g, false); });
      },
    };
  }

  function playFile(key, marks, rate, opts) {
    return new Promise(function (resolve) {
      var a = new Audio(url(key));
      a.playbackRate = rate;
      a.preservesPitch = true;
      var segEnd = null, raf = 0, finished = false;
      if (opts.segment != null && marks[opts.segment]) {
        var m = marks[opts.segment];
        a.currentTime = Math.max(0, (m[0] - 40) / 1000);
        segEnd = (m[0] + m[1] + 60) / 1000;
      }
      var hl = opts.el ? Highlighter(opts.el, marks, opts.tiles) : null;
      function finish() {
        if (finished) return;
        finished = true;
        cancelAnimationFrame(raf);
        a.pause();
        if (hl) setTimeout(hl.clear, 350);
        if (current === finish) current = null;
        resolve();
      }
      function tick() {
        if (segEnd && a.currentTime >= segEnd) return finish();
        if (hl) hl.at(a.currentTime * 1000);
        raf = requestAnimationFrame(tick);
      }
      a.onended = finish;
      a.onerror = function () { finish(); };
      current = finish;
      a.play().then(function () { raf = requestAnimationFrame(tick); }).catch(finish);
    });
  }

  function playSynth(text, rate, opts) {
    return new Promise(function (resolve) {
      if (!window.speechSynthesis) return resolve();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'ar-SA';
      u.rate = 0.85 * rate;
      var voices = speechSynthesis.getVoices().filter(function (v) { return /^ar/i.test(v.lang); });
      if (voices.length) u.voice = voices[0];
      var words = opts.el ? Array.prototype.slice.call(opts.el.querySelectorAll('.w')) : [];
      var starts = [], pos = 0;
      words.forEach(function (w) { var t = w.dataset.text; pos = text.indexOf(t, pos); starts.push(pos); pos += t.length; });
      u.onboundary = function (e) {
        if (e.name && e.name !== 'word') return;
        words.forEach(function (w, i) {
          var on = starts[i] <= e.charIndex;
          w.querySelectorAll('.g').forEach(function (g) { g.classList.toggle('lit', on); });
        });
      };
      function finish() {
        if (opts.el) setTimeout(function () { opts.el.querySelectorAll('.g.lit').forEach(function (g) { g.classList.remove('lit'); }); }, 350);
        if (current === cancel) current = null;
        resolve();
      }
      function cancel() { speechSynthesis.cancel(); }
      u.onend = finish;
      u.onerror = finish;
      current = cancel;
      speechSynthesis.speak(u);
    });
  }

  // key: 'w:<wordId>' | 's:<sentenceId>' | 'u:<phraseKey>'; text: exactly what is displayed.
  // opts: { el, tiles, slow, segment }
  function play(key, text, opts) {
    opts = opts || {};
    stop();
    var t = timing(key);
    var rate = (settings().speed || 1) * (opts.slow ? 0.7 : 1);
    if (t && t.t === text) return playFile(key, t.m, rate, opts);
    return playSynth(text, rate, opts);
  }

  function hasFile(key, text) { var t = timing(key); return !!(t && t.t === text); }

  return { play: play, stop: stop, hasFile: hasFile, timing: timing };
})();
