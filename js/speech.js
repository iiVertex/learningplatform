// Listens to the child reading. Two things run side by side on the same microphone:
//  • the browser's Arabic speech recognition (Chrome / Edge), which gives the transcripts used for feedback;
//  • a plain audio recording (MediaRecorder), so the parent can later hear exactly how he said it.
// The microphone is opened explicitly first, which gives a clear permission prompt and clear errors, and a
// level meter tells "the mic hears nothing" apart from "the recogniser didn't understand".
window.Listener = (function () {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

  function micError(e) {
    var n = e && e.name;
    if (n === 'NotAllowedError' || n === 'SecurityError') return 'not-allowed';
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'audio-capture';
    if (n === 'NotReadableError' || n === 'AbortError') return 'mic-busy';
    return 'start-failed';
  }

  function openMic() {
    if (!canRecord) return Promise.resolve(null);
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  }

  function recorderFor(stream) {
    var types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    var type = types.filter(function (t) { return MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t); })[0];
    try { return new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined); }
    catch (e) { return null; }
  }

  // opts: { lang, onUpdate(candidates), onLevel(0..1), onDone({ candidates, heard, voiced, error, audio, ms }),
  //         isComplete(candidates), silenceMs, startMs, maxMs }
  function listen(opts) {
    var startMs = opts.startMs || 10000, silenceMs = opts.silenceMs || 3000, maxMs = opts.maxMs || 40000;
    var t0 = Date.now(), lastActivity = 0;
    var stopped = false, aborted = false, finished = false;
    var heard = false, voiced = false, error = null;
    var carried = [], finals = [], interim = '';   // carried: finals from earlier recogniser runs (after a restart)
    var rec = null, recRunning = false, restarts = 0, completeTimer = 0;
    var stream = null, recorder = null, chunks = [], recorderDone = !canRecord, audio = null;
    var actx = null, raf = 0, ticker = 0, floor = 0.01;

    function allFinals() { return carried.concat(finals); }
    function candidates() {
      var tail = interim ? [interim] : [];
      var fin = allFinals();
      var main = fin.map(function (a) { return a[0]; });
      var list = [main.concat(tail).join(' ')];
      fin.forEach(function (alts, i) {
        alts.slice(1).forEach(function (alt) {
          var parts = main.slice();
          parts[i] = alt;
          list.push(parts.concat(tail).join(' '));
        });
      });
      return list.slice(0, 24);
    }

    function maybeFinish() {
      if (finished || recRunning || !recorderDone) return;
      finished = true;
      clearInterval(ticker);
      clearTimeout(completeTimer);
      cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      if (actx) actx.close().catch(function () {});
      if (aborted) return;
      opts.onDone({ candidates: candidates(), heard: heard, voiced: voiced, error: error, audio: audio, ms: Date.now() - t0 });
    }

    function stop() {
      if (stopped) return;
      stopped = true;
      if (rec && recRunning) { try { rec.stop(); } catch (e) { recRunning = false; } }
      if (recorder && recorder.state !== 'inactive') { try { recorder.stop(); } catch (e) { recorderDone = true; } }
      else recorderDone = true;
      maybeFinish();
    }

    // ── speech recognition (restarted if the browser ends it early while he may still be reading) ──
    function startRecognition() {
      if (!SR) return;
      rec = new SR();
      rec.lang = opts.lang || 'ar-SA';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 5;
      rec.onresult = function (e) {
        heard = true;
        lastActivity = Date.now();
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
        if (opts.isComplete && opts.isComplete(c) && !completeTimer) completeTimer = setTimeout(stop, 700);
      };
      rec.onerror = function (e) {
        if (e.error === 'aborted' || e.error === 'no-speech') return;
        error = e.error;
      };
      rec.onend = function () {
        recRunning = false;
        carried = allFinals();
        finals = [];
        if (interim) { carried.push([interim]); interim = ''; }
        var fatal = error && error !== 'network';
        if (!stopped && !fatal && !error && restarts < 6 && Date.now() - t0 < maxMs - 1500) {
          restarts++;
          try { rec.start(); recRunning = true; return; } catch (e) { /* fall through */ }
        }
        if (!stopped && fatal) stop();
        maybeFinish();
      };
      try { rec.start(); recRunning = true; }
      catch (e) { error = error || 'start-failed'; }
    }

    // ── recording + level meter ──
    function startRecording() {
      recorder = recorderFor(stream);
      if (!recorder) { recorderDone = true; return; }
      recorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onstop = function () {
        if (chunks.length) audio = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        recorderDone = true;
        maybeFinish();
      };
      recorder.start(250);
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        var an = actx.createAnalyser();
        an.fftSize = 1024;
        actx.createMediaStreamSource(stream).connect(an);
        var buf = new Float32Array(an.fftSize);
        (function meter() {
          an.getFloatTimeDomainData(buf);
          var sum = 0;
          for (var i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          var rms = Math.sqrt(sum / buf.length);
          floor = Math.min(floor * 1.002 + 0.00002, Math.max(rms, 0.002)); // slowly tracks background noise
          if (rms > Math.max(0.03, floor * 4)) { voiced = true; lastActivity = Date.now(); }
          if (opts.onLevel) opts.onLevel(Math.min(1, rms * 6));
          raf = requestAnimationFrame(meter);
        })();
      } catch (e) { /* level meter is optional */ }
    }

    function begin() {
      startRecording();
      startRecognition();
      if (!rec && !recorder) { error = error || 'unsupported'; stopped = true; recorderDone = true; maybeFinish(); return; }
      ticker = setInterval(function () {
        var now = Date.now(), elapsed = now - t0;
        if (elapsed > maxMs) return stop();
        if (!heard && !voiced) { if (elapsed > startMs) stop(); return; }
        if (now - lastActivity > silenceMs) stop();
      }, 200);
    }

    openMic().then(function (s) {
      if (aborted) { if (s) s.getTracks().forEach(function (t) { t.stop(); }); return; }
      stream = s;
      begin();
    }, function (e) {
      error = micError(e);
      stopped = true; recorderDone = true;
      maybeFinish();
    });

    return {
      stop: stop,
      abort: function () {
        aborted = true;
        stopped = true;
        clearInterval(ticker);
        clearTimeout(completeTimer);
        cancelAnimationFrame(raf);
        try { if (rec) rec.abort(); } catch (e) { /* ignore */ }
        try { if (recorder && recorder.state !== 'inactive') recorder.stop(); } catch (e) { /* ignore */ }
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        if (actx) actx.close().catch(function () {});
      },
    };
  }

  var MESSAGES = {
    'not-allowed': 'Microphone is blocked. Click the 🔒 / 🎤 icon in the address bar, allow the microphone, then reload the page.',
    'service-not-allowed': 'Speech checking is blocked for this page. Use Google Chrome and open the app with start.bat (http://localhost:8321).',
    'audio-capture': 'No microphone found. Plug in or enable a microphone (Windows Settings → Privacy → Microphone).',
    'mic-busy': 'The microphone is being used by another program (Zoom, Teams, …). Close it and try again.',
    'network': 'Speech checking needs an internet connection. His reading was still recorded for you.',
    'language-not-supported': 'This browser does not support Arabic speech recognition. Please use Google Chrome.',
    'start-failed': 'Could not start the microphone. Try again.',
    'unsupported': 'This browser cannot use the microphone. Please use Google Chrome.',
  };

  return {
    supported: !!SR, canRecord: canRecord, listen: listen,
    message: function (code) { return MESSAGES[code] || ''; },
  };
})();
