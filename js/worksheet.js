// Printable writing worksheet: a 2-page A4 PDF made in the browser.
//   Page 1 — the day's 10 words: picture, the word with harakat, and 3 empty boxes to copy it.
//   Page 2 — the day's 5 sentences: each one printed, with lines underneath to copy it once.
// Pages are drawn on a canvas (so Arabic shaping and harakat come out exactly as on screen) and wrapped
// into a minimal PDF by hand, so no library is needed.
window.Worksheet = (function () {
  var h = UI.h;
  var W = Curriculum.wordById;
  var WORDS_PER_SHEET = 10, SENTENCES_PER_SHEET = 5;
  var DPI = 200, PX = DPI / 25.4;            // canvas pixels per millimetre
  var PAGE_W = 210, PAGE_H = 297, M = 12;     // A4 in mm, margin
  var FONT = '"Noto Naskh Arabic", "Sakkal Majalla", "Traditional Arabic", serif';
  var INK = '#1f2430', SOFT = '#9aa3b2', LINE = '#c9d1dc', ACCENT = '#ff8a00';

  // ── what goes on the sheet ──

  // Words and sentences of today's session: the one finished today, otherwise the one coming up.
  // Topped up to 10 words / 5 sentences (review days have no new words) with words that need practice.
  function todaySet(p) {
    var last = p.log[p.log.length - 1];
    var words, sentences, day;
    if (last && last.date === Store.today() && !p.settings.multiPerDay) {
      day = last.day; words = (last.newWords || []).slice(); sentences = (last.sentences || []).slice();
    } else {
      var plan = Curriculum.planToday(p);
      day = plan.day; words = plan.newWords.slice(); sentences = plan.sentences.slice();
      plan.reviewWords.forEach(function (id) { if (words.length < WORDS_PER_SHEET && words.indexOf(id) < 0) words.push(id); });
    }
    return complete(p, { day: day, words: words, sentences: sentences, title: 'تَمْرِينُ الْكِتَابَةِ' });
  }

  // Words he finds hardest (most mistakes, lowest level), for an extra sheet from the parents' area.
  function reviewSet(p) {
    var ids = Curriculum.learnedIds(p).sort(function (a, b) {
      return (p.words[b].wrong - p.words[b].correct / 3) - (p.words[a].wrong - p.words[a].correct / 3) || p.words[a].box - p.words[b].box;
    });
    return complete(p, { day: p.day - 1, words: ids.slice(0, WORDS_PER_SHEET), sentences: [], title: 'مُرَاجَعَةُ الْكِتَابَةِ' });
  }

  function complete(p, set) {
    var words = set.words.filter(function (id) { return W[id]; });
    var learned = Curriculum.learnedIds(p).sort(function (a, b) { return p.words[a].box - p.words[b].box || p.words[b].learnedDay - p.words[a].learnedDay; });
    learned.forEach(function (id) { if (words.length < WORDS_PER_SHEET && words.indexOf(id) < 0) words.push(id); });
    var level = Curriculum.stageFor(Math.max(1, set.day)).level;
    var sentences = set.sentences.filter(function (id) { return Curriculum.sentenceById(id); });
    words.forEach(function (id) {
      if (sentences.length >= SENTENCES_PER_SHEET) return;
      var s = (Curriculum.sentencesByWord[id] || []).filter(function (x) { return x.level <= level && sentences.indexOf(x.id) < 0; })[0];
      if (s) sentences.push(s.id);
    });
    set.words = words.slice(0, WORDS_PER_SHEET);
    set.sentences = sentences.slice(0, SENTENCES_PER_SHEET);
    return set;
  }

  // ── drawing helpers (all sizes in mm) ──

  function page() {
    var c = document.createElement('canvas');
    c.width = Math.round(PAGE_W * PX);
    c.height = Math.round(PAGE_H * PX);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.scale(PX, PX);
    ctx.direction = 'rtl';
    ctx.textBaseline = 'alphabetic';
    return { canvas: c, ctx: ctx };
  }

  function font(ctx, sizeMm, weight) { ctx.font = (weight || 600) + ' ' + sizeMm + 'px ' + FONT; }

  // Largest font size (≤ max) at which text fits in width.
  function fit(ctx, text, width, max, weight) {
    var size = max;
    font(ctx, size, weight);
    while (size > 4 && ctx.measureText(text).width > width) { size -= 0.25; font(ctx, size, weight); }
    return size;
  }

  function roundRect(ctx, x, y, w, hgt, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + hgt, r);
    ctx.arcTo(x + w, y + hgt, x, y + hgt, r);
    ctx.arcTo(x, y + hgt, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Handwriting guide: a solid baseline and a dashed line above it for the letter body.
  function guide(ctx, x1, x2, base, body) {
    ctx.save();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(x1, base); ctx.lineTo(x2, base); ctx.stroke();
    ctx.setLineDash([1.2, 1.4]);
    ctx.lineWidth = 0.25;
    ctx.beginPath(); ctx.moveTo(x1, base - body); ctx.lineTo(x2, base - body); ctx.stroke();
    ctx.restore();
  }

  function header(ctx, set, title, instruction) {
    var p = Store.get();
    var right = PAGE_W - M;
    ctx.fillStyle = INK;
    ctx.textAlign = 'right';
    font(ctx, 8.5, 700);
    ctx.fillText(title, right, M + 9);
    font(ctx, 5.2, 600);
    ctx.fillStyle = '#4b5563';
    ctx.fillText(instruction, right, M + 18);
    ctx.textAlign = 'left';
    ctx.direction = 'ltr';
    font(ctx, 4.2, 600);
    ctx.fillStyle = SOFT;
    ctx.fillText('Day ' + set.day + '  ·  ' + Store.today(), M, M + 8);
    ctx.direction = 'rtl';
    ctx.textAlign = 'left';
    font(ctx, 5, 600);
    ctx.fillStyle = INK;
    ctx.fillText('الِاسْمُ: ' + (p.profile.name || '................'), M, M + 18);
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(M, M + 23); ctx.lineTo(PAGE_W - M, M + 23); ctx.stroke();
    return M + 28;
  }

  function footer(ctx, n) {
    ctx.textAlign = 'center';
    ctx.direction = 'ltr';
    font(ctx, 3.5, 600);
    ctx.fillStyle = SOFT;
    ctx.fillText('Reading Journey  ·  page ' + n + ' of 2', PAGE_W / 2, PAGE_H - 7);
    ctx.direction = 'rtl';
  }

  function loadImage(src) {
    return new Promise(function (resolve) {
      if (!src) return resolve(null);
      var img = new Image();
      if (/^https?:/.test(src) && src.indexOf(location.origin) !== 0) img.crossOrigin = 'anonymous';
      // A picture the browser won't let us read back (opened from file://, or a
      // pasted link without CORS) would block the whole PDF, so leave it out.
      img.onload = function () { resolve(readable(img) ? img : null); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function readable(img) {
    try {
      var c = document.createElement('canvas');
      c.width = c.height = 1;
      var cx = c.getContext('2d');
      cx.drawImage(img, 0, 0, 1, 1);
      cx.getImageData(0, 0, 1, 1);
      return true;
    } catch (e) { return false; }
  }

  function drawPicture(ctx, word, img, x, y, size) {
    ctx.save();
    roundRect(ctx, x, y, size, size, 2.5);
    ctx.clip();
    ctx.fillStyle = '#f6efe2';
    ctx.fillRect(x, y, size, size);
    if (word.img && word.img.indexOf('color:') === 0 && !Store.get().imageOverrides[word.id]) {
      ctx.fillStyle = word.img.slice(6);
      ctx.fillRect(x, y, size, size);
    } else if (img) {
      var s = Math.max(size / img.width, size / img.height);
      var w = img.width * s, hh = img.height * s;
      ctx.drawImage(img, x + (size - w) / 2, y + (size - hh) / 2, w, hh);
    } else {
      ctx.textAlign = 'center';
      ctx.font = (size * 0.6) + 'px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      ctx.fillStyle = INK;
      ctx.fillText(word.emoji || '', x + size / 2, y + size * 0.72);
    }
    ctx.restore();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 0.3;
    roundRect(ctx, x, y, size, size, 2.5);
    ctx.stroke();
  }

  // ── page 1: words ──
  function wordsPage(set, images) {
    var pg = page(), ctx = pg.ctx;
    var top = header(ctx, set, set.title + ': الْكَلِمَاتُ', 'اقْرَأِ الْكَلِمَةَ، ثُمَّ اكْتُبْهَا ثَلَاثَ مَرَّاتٍ فِي الْمُرَبَّعَاتِ.');
    var bottom = PAGE_H - 13;
    var rowH = (bottom - top) / WORDS_PER_SHEET;
    var right = PAGE_W - M;
    var pic = Math.min(17, rowH - 5), modelW = 40, gap = 2.5;
    var boxesRight = right - pic - gap - modelW - gap;
    var boxW = (boxesRight - M - 2 * gap) / 3;
    set.words.forEach(function (id, i) {
      var w = W[id];
      var y = top + i * rowH, cy = y + rowH / 2;
      var boxTop = y + 1.5, boxH = rowH - 3;
      // number + picture (right edge)
      drawPicture(ctx, w, images[id], right - pic, cy - pic / 2, pic);
      // model word
      var mx = right - pic - gap - modelW;
      ctx.fillStyle = '#fff8ee';
      roundRect(ctx, mx, boxTop, modelW, boxH, 2.5);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = INK;
      fit(ctx, w.ar, modelW - 4, 9.5, 700);
      ctx.fillText(w.ar, mx + modelW / 2, cy + 3);
      ctx.fillStyle = SOFT;
      font(ctx, 3.2, 700);
      ctx.textAlign = 'right';
      ctx.fillText(String(i + 1), mx + modelW - 1.5, boxTop + 4);
      // three writing boxes
      for (var b = 0; b < 3; b++) {
        var bx = boxesRight - (b + 1) * boxW - b * gap;
        ctx.strokeStyle = '#aab4c3';
        ctx.lineWidth = 0.35;
        roundRect(ctx, bx, boxTop, boxW, boxH, 2.5);
        ctx.stroke();
        guide(ctx, bx + 2, bx + boxW - 2, boxTop + boxH * 0.66, boxH * 0.3);
      }
    });
    footer(ctx, 1);
    return pg.canvas;
  }

  // Split a sentence into lines that fit width at the current font.
  function wrap(ctx, text, width) {
    var lines = [], cur = '';
    Arabic.splitWords(text).forEach(function (word) {
      var next = cur ? cur + ' ' + word : word;
      if (cur && ctx.measureText(next).width > width) { lines.push(cur); cur = word; } else cur = next;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  // ── page 2: sentences ──
  function sentencesPage(set) {
    var pg = page(), ctx = pg.ctx;
    var top = header(ctx, set, set.title + ': الْجُمَلُ', 'اقْرَأِ الْجُمْلَةَ، ثُمَّ اكْتُبْهَا مَرَّةً وَاحِدَةً عَلَى السُّطُورِ.');
    var bottom = PAGE_H - 13;
    var blockH = (bottom - top) / SENTENCES_PER_SHEET;
    var right = PAGE_W - M, width = PAGE_W - 2 * M;
    set.sentences.forEach(function (sid, i) {
      var s = Curriculum.sentenceById(sid);
      var y = top + i * blockH;
      // the model sentence (one line if it fits at a readable size, otherwise two)
      ctx.textAlign = 'right';
      ctx.fillStyle = INK;
      var size = 7.5;
      font(ctx, size, 700);
      var lines = wrap(ctx, s.t, width - 10);
      if (lines.length > 1) { size = 6.2; font(ctx, size, 700); lines = wrap(ctx, s.t, width - 10); }
      ctx.fillStyle = ACCENT;
      font(ctx, 4.5, 700);
      ctx.fillText(String(i + 1), right, y + 8);
      font(ctx, size, 700);
      ctx.fillStyle = INK;
      lines.forEach(function (ln, k) { ctx.fillText(ln, right - 7, y + 8 + k * size * 1.45); });
      // writing lines: enough for his handwriting (about 1.6× the printed length)
      var textBottom = y + 8 + (lines.length - 1) * size * 1.45 + 4;
      var writeLines = lines.length > 1 ? 3 : 2;
      var space = (y + blockH - 2) - textBottom;
      var lh = Math.min(15, space / writeLines);
      for (var k = 0; k < writeLines; k++) {
        var base = textBottom + (k + 1) * lh - 2;
        guide(ctx, M, right, base, lh * 0.32);
      }
      if (i < SENTENCES_PER_SHEET - 1) {
        ctx.strokeStyle = '#eef1f5';
        ctx.lineWidth = 0.3;
        ctx.beginPath(); ctx.moveTo(M, y + blockH); ctx.lineTo(right, y + blockH); ctx.stroke();
      }
    });
    footer(ctx, 2);
    return pg.canvas;
  }

  // ── minimal PDF: one full-page JPEG per page ──
  function jpegBytes(canvas) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (b) { b.arrayBuffer().then(function (buf) { resolve(new Uint8Array(buf)); }); }, 'image/jpeg', 0.9);
    });
  }

  function pdf(images) {  // images: [{ bytes, w, h }]
    var enc = new TextEncoder(), parts = [], offset = 0, offsets = [];
    var PW = 595.28, PH = 841.89;
    function push(x) { var b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); offset += b.length; }
    function obj(n, body) { offsets[n] = offset; push(n + ' 0 obj\n' + body + '\nendobj\n'); }
    push('%PDF-1.4\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [' + images.map(function (_, i) { return (3 + i * 3) + ' 0 R'; }).join(' ') + '] /Count ' + images.length + ' >>');
    images.forEach(function (im, i) {
      var pid = 3 + i * 3, cid = pid + 1, iid = pid + 2;
      obj(pid, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /XObject << /Im0 ' + iid + ' 0 R >> >> /Contents ' + cid + ' 0 R >>');
      var content = 'q ' + PW + ' 0 0 ' + PH + ' 0 0 cm /Im0 Do Q';
      obj(cid, '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream');
      offsets[iid] = offset;
      push(iid + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + im.w + ' /Height ' + im.h +
        ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + im.bytes.length + ' >>\nstream\n');
      push(im.bytes);
      push('\nendstream\nendobj\n');
    });
    var count = 3 + images.length * 3, xref = offset;
    var table = 'xref\n0 ' + count + '\n0000000000 65535 f \n';
    for (var n = 1; n < count; n++) table += String(offsets[n]).padStart(10, '0') + ' 00000 n \n';
    push(table + 'trailer\n<< /Size ' + count + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    return new Blob(parts, { type: 'application/pdf' });
  }

  function build(set) {
    var p = Store.get();
    var fonts = document.fonts ? Promise.all([
      document.fonts.load('700 40px "Noto Naskh Arabic"', 'كَتَبَ'),
      document.fonts.load('600 40px "Noto Naskh Arabic"', 'كَتَبَ'),
    ]).catch(function () {}) : Promise.resolve();
    var images = {};
    var loads = set.words.map(function (id) {
      return loadImage(p.imageOverrides[id] || (window.IMAGE_FILES || {})[id]).then(function (img) { images[id] = img; });
    });
    return Promise.all([fonts].concat(loads)).then(function () {
      var canvases = [wordsPage(set, images)];
      if (set.sentences.length) canvases.push(sentencesPage(set));
      return Promise.all(canvases.map(function (c) {
        return jpegBytes(c).then(function (bytes) { return { bytes: bytes, w: c.width, h: c.height }; });
      }));
    }).then(pdf);
  }

  // Make the PDF, then offer to open it (Chrome's viewer has a print button) or save it.
  function open(set) {
    if (!set.words.length) { UI.toast('No words yet — start today\'s practice first.'); return; }
    var wait = UI.modal([h('div.big-emoji', '✍️'), h('p', UI.arabic('أُجَهِّزُ وَرَقَةَ الْكِتَابَةِ...', { cls: 'mid' }))], []);
    build(set).then(function (blob) {
      wait.remove();
      var url = URL.createObjectURL(blob);
      var name = 'writing-day-' + set.day + '.pdf';
      UI.modal([
        h('div.big-emoji', '🖨️'),
        h('p', UI.arabic('وَرَقَةُ الْكِتَابَةِ جَاهِزَةٌ!', { cls: 'mid' })),
        h('p.hint-en', set.words.length + ' words × 3 boxes' + (set.sentences.length ? ' · ' + set.sentences.length + ' sentences' : '') + ' · A4, ready to print'),
        location.protocol === 'file:' ? h('p.hint-en', 'Pictures are left out because the app was opened as a file. Open it with start.bat to include them.') : null,
      ], [
        { label: '⬇ Save PDF', onclick: function () { var a = h('a', { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove(); } },
        { label: '🖨️ Open & print', cls: 'btn-primary', onclick: function () { window.open(url, '_blank'); } },
      ]);
    }).catch(function (e) {
      wait.remove();
      console.error(e);
      UI.toast('Could not make the worksheet: ' + e.message);
    });
  }

  return { todaySet: todaySet, reviewSet: reviewSet, open: open, build: build };
})();
