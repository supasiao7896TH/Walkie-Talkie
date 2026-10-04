import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase-config.js';
import { STORES } from './app-config.js';
import { StorageEngine } from './storage-engine.js';
import { DEFAULT_RADIOS, DEFAULT_ACCESSORIES } from '../data/seed-data.js';

const COLLECTION_MAP = {
  [STORES.RADIOS]: 'pe1_radios',
  [STORES.ACCESSORIES]: 'pe1_accessories',
  [STORES.INSPECTIONS]: 'pe1_inspections',
  [STORES.REPAIRS]: 'pe1_repairs'
};

let _syncStatus = 'connecting'; // 'connecting' | 'online' | 'offline' | 'error'
let _statusListeners = [];
let _unsubscribes = [];
let _isApplyingRemote = false;

function setSyncStatus(status) {
  _syncStatus = status;
  _statusListeners.forEach((fn) => fn(status));
}

// Debounce helper ป้องกันการ re-render หน้าจอถี่เกินไปเวลามีหลาย snapshot รัวๆ
function debounce(fn, waitMs = 150) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}

export const CloudSyncManager = {
  getStatus() {
    return _syncStatus;
  },

  onStatusChange(fn) {
    _statusListeners.push(fn);
    fn(_syncStatus);
    return () => {
      _statusListeners = _statusListeners.filter((l) => l !== fn);
    };
  },

  async initRealtimeSync({ onDataUpdated } = {}) {
    setSyncStatus('connecting');

    const debouncedOnDataUpdated = debounce((storeName) => {
      if (typeof onDataUpdated === 'function') {
        onDataUpdated(storeName);
      }
    }, 150);

    try {
      const stores = [STORES.RADIOS, STORES.ACCESSORIES, STORES.INSPECTIONS, STORES.REPAIRS];

      for (const storeName of stores) {
        const colRef = collection(db, COLLECTION_MAP[storeName]);

        const unsub = onSnapshot(
          colRef,
          { includeMetadataChanges: true },
          async (snapshot) => {
            setSyncStatus('online');

            // หาก Firestore เพิ่งสร้างและยังไม่มีเอกสารใดๆ ใน pe1_radios ให้ seed ขึ้น cloud ครั้งแรก
            if (storeName === STORES.RADIOS && snapshot.empty) {
              const localRadios = await StorageEngine.radios.getAll();
              const radiosToUpload = localRadios.length > 0 ? localRadios : DEFAULT_RADIOS;
              const localAcc = await StorageEngine.accessories.getAll();
              const accToUpload = localAcc.length > 0 ? localAcc : DEFAULT_ACCESSORIES;

              await this.bulkPush(STORES.RADIOS, radiosToUpload);
              await this.bulkPush(STORES.ACCESSORIES, accToUpload);
              return;
            }

            if (snapshot.empty) {
              return;
            }

            // ใช้ docChanges() แบบ Delta Update แทนการ clear() ทั้งตาราง
            const changes = snapshot.docChanges();
            let hasExternalChange = false;

            _isApplyingRemote = true;
            try {
              for (const change of changes) {
                // ถ้า change นี้มาจาก local write ในเครื่องนี้เอง และยัง pending อยู่ ไม่ต้องทับ IndexedDB
                if (change.doc.metadata.hasPendingWrites) {
                  continue;
                }

                hasExternalChange = true;
                const data = change.doc.data();

                if (change.type === 'added' || change.type === 'modified') {
                  await StorageEngine[storeName].put(data);
                } else if (change.type === 'removed') {
                  await StorageEngine[storeName].remove(change.doc.id);
                }
              }
            } finally {
              _isApplyingRemote = false;
            }

            // สั่ง re-render เฉพาะเมื่อมีข้อมูลจากภายนอกหรือยืนยันจาก server เข้ามาจริงๆ
            if (hasExternalChange) {
              debouncedOnDataUpdated(storeName);
            }
          },
          (error) => {
            console.warn(`[CloudSync] Store ${storeName} offline or error:`, error.message);
            setSyncStatus('offline');
          }
        );

        _unsubscribes.push(unsub);
      }
    } catch (err) {
      console.warn('[CloudSync] Firebase initialization error:', err);
      setSyncStatus('offline');
    }
  },

  stopSync() {
    _unsubscribes.forEach((unsub) => unsub());
    _unsubscribes = [];
    setSyncStatus('offline');
  },

  async pushRecord(storeName, record) {
    if (_isApplyingRemote) return;
    try {
      const colName = COLLECTION_MAP[storeName];
      if (!colName || !record.id) return;
      const docRef = doc(db, colName, String(record.id));
      await setDoc(docRef, record);
    } catch (err) {
      console.warn(`[CloudSync] pushRecord error for ${storeName}:`, err.message);
    }
  },

  async deleteRecord(storeName, id) {
    if (_isApplyingRemote) return;
    try {
      const colName = COLLECTION_MAP[storeName];
      if (!colName || !id) return;
      const docRef = doc(db, colName, String(id));
      await deleteDoc(docRef);
    } catch (err) {
      console.warn(`[CloudSync] deleteRecord error for ${storeName}:`, err.message);
    }
  },

  async bulkPush(storeName, records) {
    if (_isApplyingRemote || !records || records.length === 0) return;
    try {
      const colName = COLLECTION_MAP[storeName];
      if (!colName) return;
      const batch = writeBatch(db);
      for (const r of records) {
        if (!r.id) continue;
        const ref = doc(db, colName, String(r.id));
        batch.set(ref, r);
      }
      await batch.commit();
    } catch (err) {
      console.warn(`[CloudSync] bulkPush error for ${storeName}:`, err.message);
    }
  }
};
