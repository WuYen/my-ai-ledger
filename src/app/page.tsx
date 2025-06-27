// 假設在 src/app/page.tsx
'use client';
import { useState } from 'react';
import LedgerList from '@/components/LedgerList';
import LedgerAsk from '@/components/LedgerAsk';
import { addLedger } from '@/lib/useLedger';

export default function Home() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');

  const handleAdd = async () => {
    await addLedger({
      description,
      amount: Number(amount),
      category,
      type: 'expense',
    });
    setDescription('');
    setAmount('');
    setCategory('');
  };

  return (
    <div className="p-8">
      <input value={description} onChange={e => setDescription(e.target.value)} placeholder="描述" className="border p-2 m-1" />
      <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="金額" type="number" className="border p-2 m-1" />
      <input value={category} onChange={e => setCategory(e.target.value)} placeholder="分類" className="border p-2 m-1" />
      <button onClick={handleAdd} className="bg-blue-600 text-white p-2 m-1 rounded">記一筆</button>
      <LedgerList />
      <LedgerAsk />
    </div>
  );
}
