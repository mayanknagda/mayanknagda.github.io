const DB_VERSION = 1;
export function createDatabase(name = 'habit-tracker') {
  let connection;
  function open() { if (connection) return connection; connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION);
    request.onupgradeneeded = event => { const database = request.result; if (event.oldVersion < 1) { database.createObjectStore('habits', { keyPath: 'id' }); const entries = database.createObjectStore('entries', { keyPath: 'id' }); entries.createIndex('date', 'date'); entries.createIndex('habitId', 'habitId'); database.createObjectStore('meta', { keyPath: 'key' }); } };
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onerror = () => { connection = null; reject(request.error || new Error('Storage unavailable.')); };
  }); return connection; }
  async function run(name, mode, action) { const database = await open(); return new Promise((resolve, reject) => { const tx = database.transaction(name, mode), request = action(tx.objectStore(name)); tx.oncomplete = () => resolve(request?.result); tx.onerror = () => reject(tx.error || new Error('Storage operation failed.')); tx.onabort = () => reject(tx.error || new Error('Storage operation cancelled.')); }); }
  async function importData(data) { const database = await open(); return new Promise((resolve, reject) => { const tx = database.transaction(['habits', 'entries'], 'readwrite'); let added = 0, duplicates = 0; for (const name of ['habits', 'entries']) for (const record of data[name]) { const store = tx.objectStore(name), request = store.get(record.id); request.onsuccess = () => { if (request.result) duplicates++; else { store.add(record); added++; } }; } tx.oncomplete = () => resolve({ added, duplicates }); tx.onerror = () => reject(tx.error || new Error('Import failed.')); tx.onabort = () => reject(tx.error || new Error('Import cancelled.')); }); }
  async function deleteHabitWithEntries(id, entryIds) { const database = await open(); return new Promise((resolve, reject) => { const tx = database.transaction(['habits', 'entries'], 'readwrite'); tx.objectStore('habits').delete(id); for (const entryId of entryIds) tx.objectStore('entries').delete(entryId); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error || new Error('Delete failed.')); tx.onabort = () => reject(tx.error || new Error('Delete cancelled.')); }); }
  return { open, all: name => run(name, 'readonly', store => store.getAll()), get: (name, id) => run(name, 'readonly', store => store.get(id)), put: (name, record) => run(name, 'readwrite', store => store.put(record)), remove: (name, id) => run(name, 'readwrite', store => store.delete(id)), meta: key => run('meta', 'readonly', store => store.get(key)), setMeta: (key, value) => run('meta', 'readwrite', store => store.put({ key, value })), importData, deleteHabitWithEntries };
}
export const db = createDatabase();
