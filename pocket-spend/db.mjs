const DB_VERSION = 1;

export function createDatabase(name = 'pocket-spend') {
  let connection;
  function openDatabase() {
    if (connection) return connection;
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open(name, DB_VERSION);
      request.onupgradeneeded = event => {
        const db = request.result;
        if (event.oldVersion < 1) {
          const tx = db.createObjectStore('transactions', { keyPath: 'id' });
          tx.createIndex('date', 'date');
          tx.createIndex('type', 'type');
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => { connection = null; reject(request.error || new Error('Storage could not be opened.')); };
    });
    return connection;
  }
  async function request(store, mode, action) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const result = action(tx.objectStore(store));
      tx.oncomplete = () => resolve(result?.result);
      tx.onerror = () => reject(tx.error || new Error('Storage operation failed.'));
      tx.onabort = () => reject(tx.error || new Error('Storage operation was cancelled.'));
    });
  }
  async function importTransactions(records) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transactions', 'readwrite');
      const store = tx.objectStore('transactions');
      let added = 0, duplicates = 0;
      for (const record of records) {
        const get = store.get(record.id);
        get.onsuccess = () => {
          if (get.result) { duplicates++; return; }
          store.add(record);
          added++;
        };
      }
      tx.oncomplete = () => resolve({ added, duplicates });
      tx.onerror = () => reject(tx.error || new Error('Import failed.'));
      tx.onabort = () => reject(tx.error || new Error('Import cancelled.'));
    });
  }
  return {
    openDatabase,
    allTransactions: () => request('transactions', 'readonly', store => store.getAll()),
    putTransaction: tx => request('transactions', 'readwrite', store => store.put(tx)),
    deleteTransaction: id => request('transactions', 'readwrite', store => store.delete(id)),
    getMeta: key => request('meta', 'readonly', store => store.get(key)),
    setMeta: (key, value) => request('meta', 'readwrite', store => store.put({ key, value })),
    importTransactions
  };
}

const database = createDatabase();
export const { openDatabase, allTransactions, putTransaction, deleteTransaction, getMeta, setMeta, importTransactions } = database;
