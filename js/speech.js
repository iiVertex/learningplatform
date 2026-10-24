// Listens to the child reading, using the browser's Arabic speech recognition (Chrome / Edge).
// Collects several alternative transcripts so the assessment can pick the most charitable one.
window.Listener = (function () {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  // opts: { lang, onUpdate(candidates), onDone({ candidates, heard, error }), isComplete(candidates),
  //         silenceMs, startMs, maxMs }
  function listen(opts) {
    var rec = new SR();
    rec.lang = opts.lang || 'ar-SA';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 5;

    var finals = [], interim = '', heard = false, stopped = false, ended = false, error = null;
    var silenceTimer = 0, startTimer = 0, maxTimer = 0, completeTimer = 0;

    function candidates() {
      var tail = interim ? [interim] : [];
      var main = finals.map(function (a) { return a[0]; });
      var list = [main.concat(tail).join(' ')];
      finals.forEach(function (alts, i) {
        alts.slice(1).forEach(function (alt) {
          var parts = main.slice();
          parts[i] = alt;
          list.push(parts.concat(tail).join(' '));
        });
      });
      return list.slice(0, 24);
    }

    function stop() {
      if (stopped) return;
      stopped = true;
      try { rec.stop(); } catch (e) { /* already stopped */ }
    }
    function clearTimers() { [silenceTimer, startTimer, maxTimer, completeTimer].forEach(clearTimeout); }

    rec.onresult = function (e) {
      heard = true;
      finals = [];
      interim = '';
      for (var i = 0; i < e.results.length; i++) {
        var r = e.results[i];
        if (r.isFinal) finals.push(Array.prototype.map.call(r, function (x) { return x.transcript.trim(); }));
        else interim += ' ' + r[0].transcript.trim();
      }
      interim = interim.trim();
      var c = candidates();
      if (opts.onUpdate) opts.onUpdate(c);
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(stop, opts.silenceMs || 3000);
      if (opts.isComplete && opts.isComplete(c) && !completeTimer) completeTimer = setTimeout(stop, 700);
    };
    rec.onerror = function (e) { if (e.error !== 'aborted') error = e.error; };
    rec.onend = function () {
      if (ended) return;
      ended = true;
      clearTimers();
      opts.onDone({ candidates: candidates(), heard: heard, error: error });
    };

    startTimer = setTimeout(function () { if (!heard) stop(); }, opts.startMs || 8000);
    maxTimer = setTimeout(stop, opts.maxMs || 40000);
    try {
      rec.start();
    } catch (e) {
      ended = true;
      clearTimers();
      setTimeout(function () { opts.onDone({ candidates: [''], heard: false, error: 'start-failed' }); });
    }
    return {
      stop: stop,
      abort: function () { ended = true; clearTimers(); try { rec.abort(); } catch (e) { /* ignore */ } },
    };
  }

  var MESSAGES = {
    'not-allowed': 'Microphone is blocked. Click the 🔒 / 🎤 icon in the address bar and allow the microphone.',
    'service-not-allowed': 'Microphone is blocked for this page.',
    'audio-capture': 'No microphone found. Plug in or enable a microphone.',
    'network': 'Speech checking needs an internet connection.',
    'language-not-supported': 'This browser does not support Arabic speech recognition. Please use Google Chrome.',
    'start-failed': 'Could not start the microphone. Try again.',
  };

  return { supported: !!SR, listen: listen, message: function (code) { return MESSAGES[code] || ''; } };
})();
