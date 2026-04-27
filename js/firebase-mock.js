// =====================================================
//  Firebase Mock — modo local (sem servidor Firebase)
//  Usa localStorage para persistência e o evento
//  nativo "storage" para sincronizar entre abas.
//  O evento "storage" é disparado pelo browser sempre
//  que OUTRA aba modifica localStorage — 100% confiável.
// =====================================================

(function () {
  const KEY = 'cbc_store';
  const listeners = {}; // path -> Set<callback>

  // ---- Helpers de armazenamento ----

  function getStore() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch (_) { return {}; }
  }

  function saveStore(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function parsePath(path) {
    return path.split('/').filter(Boolean);
  }

  function getAtPath(obj, parts) {
    let cur = obj;
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = cur[p];
    }
    return cur;
  }

  function setAtPath(obj, parts, value) {
    if (parts.length === 0) return value;
    const [h, ...t] = parts;
    const base = (obj != null && typeof obj === 'object') ? obj : {};
    return { ...base, [h]: t.length === 0 ? value : setAtPath(base[h], t, value) };
  }

  function makeSnapshot(value) {
    return {
      exists: () => value !== undefined && value !== null,
      val:    () => (value !== undefined ? value : null)
    };
  }

  // ---- Dispara todos os listeners registrados ----
  // (chamado tanto ao escrever localmente quanto ao
  //  receber o evento "storage" de outra aba)

  function fireAllListeners() {
    const store = getStore();
    Object.entries(listeners).forEach(([path, cbs]) => {
      const val = getAtPath(store, parsePath(path));
      cbs.forEach(cb => {
        try { cb(makeSnapshot(val)); }
        catch (e) { console.error('[mock] listener error:', e); }
      });
    });
  }

  // ---- Sincronização entre abas via evento nativo ----
  // O evento "storage" só dispara em abas DIFERENTES
  // da que fez a escrita — complementa o fireAllListeners
  // local que roda na aba que escreveu.

  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      fireAllListeners();
    }
  });

  // ---- MockRef ----

  class MockRef {
    constructor(path) {
      this._path  = path;
      this._parts = parsePath(path);
    }

    /** Substitui o valor no caminho exato */
    set(value) {
      let store = getStore();
      store = setAtPath(store, this._parts, value);
      saveStore(store);
      fireAllListeners(); // dispara na aba atual
      return Promise.resolve();
    }

    /** Merge superficial no caminho */
    update(updates) {
      let store   = getStore();
      const cur   = getAtPath(store, this._parts) || {};
      store       = setAtPath(store, this._parts, { ...cur, ...updates });
      saveStore(store);
      fireAllListeners(); // dispara na aba atual
      return Promise.resolve();
    }

    /** Leitura única */
    once(_event) {
      const val = getAtPath(getStore(), this._parts);
      return Promise.resolve(makeSnapshot(val));
    }

    /** Listener em tempo real */
    on(_event, callback) {
      if (!listeners[this._path]) listeners[this._path] = new Set();
      listeners[this._path].add(callback);
      // Dispara imediatamente com o valor atual
      const val = getAtPath(getStore(), this._parts);
      try { callback(makeSnapshot(val)); } catch (e) { console.error('[mock] on() init error:', e); }
      return callback;
    }

    off(_event, callback) {
      listeners[this._path]?.delete(callback);
    }
  }

  // ---- Expõe interface compatível com Firebase ----

  window.db = { ref: (path) => new MockRef(path) };

  window.firebase = {
    initializeApp: () => {},
    database:      () => window.db
  };

  // Limpa jogos velhos (>2h) ao abrir o lobby
  if (/index\.html|^\/$/.test(location.pathname)) {
    const store = getStore();
    const games = store.games || {};
    let dirty = false;
    Object.keys(games).forEach(id => {
      if (games[id]._created && Date.now() - games[id]._created > 7_200_000) {
        delete games[id];
        dirty = true;
      }
    });
    if (dirty) saveStore({ ...store, games });
  }

  console.log('%c🐱 Cat Battle Cards — MODO LOCAL', 'color:#f39c12;font-weight:bold;font-size:16px');
  console.log('Abra 2 abas em http://localhost:8765 para simular 2 jogadores!');
  console.log('Sincronização via localStorage + evento "storage" (nativo do browser).');
})();
