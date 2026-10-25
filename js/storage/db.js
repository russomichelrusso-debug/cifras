// Única camada que fala com o IndexedDB. Wrapper pequeno, sem dependências.

const DB_NAME = 'cifras';
const VERSION = 1;

let dbPromise = null;

function migrate(db, oldVersion) {
  if (oldVersion < 1) {
    const songs = db.createObjectStore('songs', { keyPath: 'id' });
    songs.createIndex('title', 'title');
    songs.createIndex('updatedAt', 'updatedAt');
    const setlists = db.createObjectStore('setlists', { keyPath: 'id' });
    setlists.createIndex('updatedAt', 'updatedAt');
    db.createObjectStore('settings');
  }
}

export function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = (e) => migrate(req.result, e.oldVersion);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function run(store, mode, fn) {
  const db = await openDb();
  const tx = db.transaction(store, mode);
  const result = fn(tx.objectStore(store));
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  return result instanceof IDBRequest ? result.result : result;
}

export const getAll = (store) => run(store, 'readonly', (s) => s.getAll());
export const get = (store, key) => run(store, 'readonly', (s) => s.get(key));
export const put = (store, value, key) => run(store, 'readwrite', (s) => (key === undefined ? s.put(value) : s.put(value, key)));
export const remove = (store, key) => run(store, 'readwrite', (s) => s.delete(key));
export const putMany = (store, values) => run(store, 'readwrite', (s) => values.forEach((v) => s.put(v)));
