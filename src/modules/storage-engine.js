import { DB_NAME, DB_VERSION, STORES } from './app-config.js';

let _dbPromise = null;

function _open() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORES.RADIOS)) {
        db.createObjectStore(STORES.RADIOS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.ACCESSORIES)) {
        const s = db.createObjectStore(STORES.ACCESSORIES, { keyPath: 'id' });
        s.createIndex('radioId', 'radioId');
      }
      if (!db.objectStoreNames.contains(STORES.INSPECTIONS)) {
        const s = db.createObjectStore(STORES.INSPECTIONS, { keyPath: 'id' });
        s.createIndex('target', ['targetType', 'targetId']);
        s.createIndex('yearMonth', 'yearMonth');
      }
      if (!db.objectStoreNames.contains(STORES.REPAIRS)) {
        const s = db.createObjectStore(STORES.REPAIRS, { keyPath: 'id' });
        s.createIndex('target', ['targetType', 'targetId']);
        s.createIndex('status', 'status');
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function _promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function _tx(storeName, mode, fn) {
  const db = await _open();
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);
  const result = await fn(store);
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return result;
}

function makeStore(storeName) {
  return {
    async getAll() {
      return _tx(storeName, 'readonly', (store) => _promisify(store.getAll()));
    },
    async getById(id) {
      return _tx(storeName, 'readonly', (store) => _promisify(store.get(id)));
    },
    async put(record) {
      await _tx(storeName, 'readwrite', (store) => _promisify(store.put(record)));
      return record;
    },
    async remove(id) {
      return _tx(storeName, 'readwrite', (store) => _promisify(store.delete(id)));
    },
    async clear() {
      return _tx(storeName, 'readwrite', (store) => _promisify(store.clear()));
    },
    async bulkPut(records) {
      return _tx(storeName, 'readwrite', async (store) => {
        for (const r of records) store.put(r);
      });
    }
  };
}

export const StorageEngine = {
  radios: makeStore(STORES.RADIOS),
  accessories: makeStore(STORES.ACCESSORIES),
  inspections: makeStore(STORES.INSPECTIONS),
  repairs: makeStore(STORES.REPAIRS),

  async loadAll() {
    const [radios, accessories, inspections, repairs] = await Promise.all([
      this.radios.getAll(),
      this.accessories.getAll(),
      this.inspections.getAll(),
      this.repairs.getAll()
    ]);
    return { radios, accessories, inspections, repairs };
  },

  async replaceAll({ radios, accessories, inspections, repairs }) {
    await Promise.all([
      this.radios.clear(),
      this.accessories.clear(),
      this.inspections.clear(),
      this.repairs.clear()
    ]);
    await Promise.all([
      this.radios.bulkPut(radios),
      this.accessories.bulkPut(accessories),
      this.inspections.bulkPut(inspections),
      this.repairs.bulkPut(repairs)
    ]);
  }
};
