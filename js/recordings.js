// Recordings of the child's voice (every word and sentence he says to the microphone), kept in this browser
// (IndexedDB) so the parent can listen to his pronunciation. Metadata and audio live in separate stores so
// listing is light. The last KEEP attempts per word/sentence are kept.
window.Recordings = (function () {
  var DB = 'ysf.recordings', KEEP = 4;
  var dbp = null, player = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error('no indexedDB'));
      var req = indexedDB.open(DB, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        var meta = db.createObjectStore('meta', { keyPath: 'id', autoIncrement: true });
        meta.createIndex('key', 'key');
        meta.createIndex('at', 'at');
        db.createObjectStore('audio');
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    return dbp;
  }

  function done(tx) {
    return new Promise(function (resolve, reject) {
      tx.oncomplete = function () { resolve(); };
      tx.onerror = tx.onabort = function () { reject(tx.error); };
    });
  }
  function result(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  // meta: { key: 'w:cat' | 's:cat-1', text, score, heard, day, ms }
  function save(meta, blob) {
    if (!blob || !blob.size) return Promise.resolve(null);
    return open().then(function (db) {
      var tx = db.transaction(['meta', 'audio'], 'readwrite');
      var rec = Object.assign({ at: Date.now(), date: Store.today(), kind: meta.key.charAt(0) === 'w' ? 'word' : 'sentence', size: blob.size }, meta);
      var id;
      var req = tx.objectStore('meta').add(rec);
      req.onsuccess = function () { id = req.result; tx.objectStore('audio').put(blob, id); };
      return done(tx).then(function () { prune(meta.key); return id; });
    }).catch(function (e) { console.warn('Could not save recording', e); return null; });
  }

  function prune(key) {
    return forKey(key).then(function (list) {
      var old = list.slice(KEEP);
      if (!old.length) return;
      return open().then(function (db) {
        var tx = db.transaction(['meta', 'audio'], 'readwrite');
        old.forEach(function (r) { tx.objectStore('meta').delete(r.id); tx.objectStore('audio').delete(r.id); });
        return done(tx);
      });
    });
  }

  // Newest first.
  function forKey(key) {
    return open().then(function (db) {
      return result(db.transaction('meta').objectStore('meta').index('key').getAll(key));
    }).then(function (list) { return list.sort(function (a, b) { return b.at - a.at; }); })
      .catch(function () { return []; });
  }

  function all() {
    return open().then(function (db) { return result(db.transaction('meta').objectStore('meta').getAll()); })
      .then(function (list) { return list.sort(function (a, b) { return b.at - a.at; }); })
      .catch(function () { return []; });
  }

  // Latest recording per key → { key: meta }
  function latest() {
    return all().then(function (list) {
      var out = {};
      list.forEach(function (r) { if (!out[r.key]) out[r.key] = r; });
      return out;
    });
  }

  function stop() {
    if (player) { player.pause(); URL.revokeObjectURL(player.src); player = null; }
  }

  function play(id) {
    Voice.stop();
    stop();
    return open().then(function (db) { return result(db.transaction('audio').objectStore('audio').get(id)); })
      .then(function (blob) {
        if (!blob) throw new Error('missing');
        return new Promise(function (resolve) {
          var a = player = new Audio(URL.createObjectURL(blob));
          a.onended = a.onerror = function () { if (player === a) stop(); resolve(); };
          a.play().catch(function () { resolve(); });
        });
      });
  }

  function clear() {
    stop();
    return open().then(function (db) {
      var tx = db.transaction(['meta', 'audio'], 'readwrite');
      tx.objectStore('meta').clear();
      tx.objectStore('audio').clear();
      return done(tx);
    });
  }

  return { save: save, forKey: forKey, all: all, latest: latest, play: play, stop: stop, clear: clear };
})();
