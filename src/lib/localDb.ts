export interface LedgerRecord {
  id?: number;
  description: string;
  amount: number;
  category: string;
  type: string;
  created_at: string;
  synced?: boolean;
}

const DB_NAME = 'ledger-db';
const STORE_NAME = 'ledger';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.createObjectStore(STORE_NAME, {
        keyPath: 'id',
        autoIncrement: true,
      });
      store.createIndex('created_at', 'created_at');
      store.createIndex('synced', 'synced');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => void
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    callback(store);
    tx.oncomplete = () => resolve(undefined as T);
    tx.onerror = () => reject(tx.error);
  });
}

export async function addLocal(record: Omit<LedgerRecord, 'id'>): Promise<LedgerRecord> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(record);
    req.onsuccess = () => resolve({ ...record, id: req.result as number });
    req.onerror = () => reject(req.error);
  });
}

export async function updateLocal(id: number, data: Partial<LedgerRecord>) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const record = { ...(getReq.result as LedgerRecord), ...data };
      store.put(record);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function recordsByMonth(month: string): Promise<LedgerRecord[]> {
  const db = await openDB();
  const [y, m] = month.split('-').map(Number);
  const start = new Date(y, m - 1, 1).toISOString();
  const end = new Date(y, m, 0, 23, 59, 59).toISOString();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME);
    const index = tx.objectStore(STORE_NAME).index('created_at');
    const range = IDBKeyRange.bound(start, end);
    const res: LedgerRecord[] = [];
    index.openCursor(range).onsuccess = (e: any) => {
      const cursor = e.target.result as IDBCursorWithValue | null;
      if (cursor) {
        res.push(cursor.value as LedgerRecord);
        cursor.continue();
      } else {
        resolve(res);
      }
    };
    index.openCursor(range).onerror = () => reject(tx.error);
  });
}

export async function unsyncedRecords(): Promise<LedgerRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME);
    const index = tx.objectStore(STORE_NAME).index('synced');
    const req = index.getAll(IDBKeyRange.only(false));
    req.onsuccess = () => resolve(req.result as LedgerRecord[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeOld(before: Date) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const index = tx.objectStore(STORE_NAME).index('created_at');
    const range = IDBKeyRange.upperBound(before.toISOString(), true);
    index.openCursor(range).onsuccess = (e: any) => {
      const cursor = e.target.result as IDBCursorWithValue | null;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
