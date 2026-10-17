const DB_VERSION = 1;
export function createDatabase(name = 'gym-tracker') {
  let connection;
  function open() {
    if (connection) return connection;
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open(name, DB_VERSION);
      request.onupgradeneeded = event => {
        const db = request.result;
        if (event.oldVersion < 1) {
          const workouts = db.createObjectStore('workouts', { keyPath: 'id' });
          workouts.createIndex('date', 'date'); workouts.createIndex('status', 'status');
          db.createObjectStore('exercises', { keyPath: 'id' });
          db.createObjectStore('templates', { keyPath: 'id' });
          const bodyweights = db.createObjectStore('bodyweights', { keyPath: 'id' });
          bodyweights.createIndex('date', 'date');
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      };
      request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
      request.onerror = () => { connection = null; reject(request.error || new Error('Storage unavailable.')); };
    });
    return connection;
  }
  async function run(storeName, mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const request = action(tx.objectStore(storeName));
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error || new Error('Storage operation failed.'));
      tx.onabort = () => reject(tx.error || new Error('Storage operation cancelled.'));
    });
  }
  async function importData(data) {
    const db = await open();
    const stores = ['workouts', 'exercises', 'templates', 'bodyweights'];
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, 'readwrite'); let added = 0, duplicates = 0;
      for (const name of stores) for (const record of data[name] || []) {
        const store = tx.objectStore(name), request = store.get(record.id);
        request.onsuccess = () => { if (request.result) duplicates++; else { store.add(record); added++; } };
      }
      tx.oncomplete = () => resolve({ added, duplicates });
      tx.onerror = () => reject(tx.error || new Error('Import failed.'));
      tx.onabort = () => reject(tx.error || new Error('Import cancelled.'));
    });
  }
  return {
    open,
    all: name => run(name, 'readonly', store => store.getAll()),
    get: (name, id) => run(name, 'readonly', store => store.get(id)),
    put: (name, record) => run(name, 'readwrite', store => store.put(record)),
    remove: (name, id) => run(name, 'readwrite', store => store.delete(id)),
    meta: key => run('meta', 'readonly', store => store.get(key)),
    setMeta: (key, value) => run('meta', 'readwrite', store => store.put({ key, value })),
    importData
  };
}
export const db = createDatabase();
