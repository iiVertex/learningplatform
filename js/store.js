// Progress is saved in this browser (localStorage). The parent area can export/import a backup file.
window.Store = (function () {
  var KEY = 'ysf.reading.v1';

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function daysBetween(a, b) {
    return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
  }

  function fresh() {
    return {
      version: 1,
      profile: { name: '', created: today() },
      settings: { voice: 'f', speed: 1, recLang: 'ar-SA', englishHints: false, multiPerDay: false },
      day: 1,               // the next daily session to do (1 … 182 for the 6-month plan)
      lastSessionDate: null,
      streak: 0,
      bestStreak: 0,
      stars: 0,
      catCursor: 0,
      pending: null,        // plan of the day in progress, so an interrupted session restarts the same way
      words: {},            // id → { box, due, learnedDay, seen, correct, wrong }
      sentences: {},        // id → { attempts, best, last, lastDay, history: [] }
      log: [],              // one entry per finished session
      imageOverrides: {},   // id → url / data-url chosen by the parent
    };
  }

  var state;
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      state = raw ? Object.assign(fresh(), JSON.parse(raw)) : fresh();
      state.settings = Object.assign(fresh().settings, state.settings);
    } catch (e) {
      state = fresh();
    }
    return state;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('Could not save progress', e); }
  }

  return {
    load: load,
    save: save,
    get: function () { return state || load(); },
    reset: function () { state = fresh(); save(); return state; },
    replace: function (obj) { state = Object.assign(fresh(), obj); save(); return state; },
    today: today,
    daysBetween: daysBetween,
  };
})();
