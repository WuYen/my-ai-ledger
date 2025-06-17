'use client';
import { useState, useEffect } from 'react';

type LedgerItem = {
  id: number;
  created_at: string;
  description: string;
  amount: number;
  category: string;
  type: string; // income/expense
};

function formatMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function LedgerList() {
  // 當前選擇的月份
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return formatMonth(now); // e.g. "2024-06"
  });

  const [records, setRecords] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 查詢資料
  useEffect(() => {
    setLoading(true);
    // 傳給 API 的參數，取該月的第一天
    const [year, month] = currentMonth.split('-').map(Number);
    const dateParam = `${year}-${String(month).padStart(2, '0')}-01`;

    fetch(`/api/ledger?date=${dateParam}`)
      .then(res => res.json())
      .then(res => setRecords(res.data || []))
      .finally(() => setLoading(false));
  }, [currentMonth]);

  // 切換月份
  function handleMonthChange(diff: number) {
    const [year, month] = currentMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + diff, 1);
    setCurrentMonth(formatMonth(newDate));
  }

  return (
    <div className="max-w-lg mx-auto mt-8">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => handleMonthChange(-1)}
          className="p-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          ←
        </button>
        <span className="text-lg font-semibold">{currentMonth} 收支紀錄</span>
        <button
          onClick={() => handleMonthChange(1)}
          className="p-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          →
        </button>
      </div>
      {loading ? (
        <div>載入中...</div>
      ) : (
        <ul className="space-y-2">
          {records.length === 0 && <div className="text-gray-400">本月沒有紀錄</div>}
          {records.map(item => (
            <li
              key={item.id}
              className={`p-3 rounded shadow flex justify-between items-center
                ${item.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}
            >
              <div>
                <div className="font-semibold">{item.description}</div>
                <div className="text-xs text-gray-500">
                  {item.category} | {new Date(item.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className={`text-lg font-bold ${item.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                {item.type === 'income' ? '+' : '-'}{item.amount}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
