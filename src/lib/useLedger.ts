'use client';
import { useEffect, useState } from 'react';
import {
  LedgerRecord,
  addLocal,
  updateLocal,
  recordsByMonth,
  unsyncedRecords,
  removeOld,
} from './localDb';

export function useLedger(month: string) {
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const local = await recordsByMonth(month);
      setRecords(local);

      // keep only last 6 months
      const before = new Date();
      before.setMonth(before.getMonth() - 6);
      await removeOld(before);

      // sync unsynced
      const pending = await unsyncedRecords();
      for (const item of pending) {
        try {
          const res = await fetch('/api/ledger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description: item.description,
              amount: item.amount,
              category: item.category,
              type: item.type,
            }),
          });
          const data = await res.json();
          if (data.data && data.data[0]) {
            await updateLocal(item.id!, { ...data.data[0], synced: true });
          }
        } catch (e) {
          console.error('sync failed', e);
        }
      }

      try {
        const [y, m] = month.split('-').map(Number);
        const dateParam = `${y}-${String(m).padStart(2, '0')}-01`;
        const res = await fetch(`/api/ledger?date=${dateParam}`);
        const data = await res.json();
        if (data.data) {
          for (const d of data.data) {
            await updateLocal(d.id, { ...d, synced: true });
          }
          const updated = await recordsByMonth(month);
          setRecords(updated);
        }
      } catch (e) {
        console.error('fetch remote failed', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [month]);

  return { records, loading };
}

export async function addLedger(record: Omit<LedgerRecord, 'id' | 'created_at' | 'synced'>) {
  const item: LedgerRecord = {
    ...record,
    created_at: new Date().toISOString(),
    synced: false,
  };
  await addLocal(item);
}
