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

    try {
      const stores = [STORES.RADIOS, STORES.ACCESSORIES, STORES.INSPECTIONS, STORES.REPAIRS];

      for (const storeName of stores) {
        const colRef = collection(db, COLLECTION_MAP[storeName]);

        const unsub = onSnapshot(
          colRef,
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

            if (snapshot.empty && storeName === STORES.ACCESSORIES) {
              return;
            }

            // แปลง Firestore documents เป็น array
            const remoteDocs = snapshot.docs.map((d) => d.data());

            // บันทึกเฉพาะเมื่อไม่ใช่ local write ที่เพิ่งยิงไป
            _isApplyingRemote = true;
            try {
              await StorageEngine[storeName].clear();
              if (remoteDocs.length > 0) {
                await StorageEngine[storeName].bulkPut(remoteDocs);
              }
            } finally {
              _isApplyingRemote = false;
            }

            if (typeof onDataUpdated === 'function') {
              onDataUpdated(storeName);
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
