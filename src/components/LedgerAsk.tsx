import { useState } from 'react';

export default function LedgerAsk() {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError('');
    setResponse(null);
    try {
      const res = await fetch('/api/ledger/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setResponse(data);
    } catch (e: any) {
      setError('查詢失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-10 p-4 border rounded-xl shadow bg-white">
      <div className="flex gap-2">
        <input
          className="flex-1 border p-2 rounded"
          placeholder="請輸入你想查詢的問題，例如：和運動有關的開銷有哪些？"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') ask(); }}
          disabled={loading}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-200"
          onClick={ask}
          disabled={loading || !question.trim()}
        >
          {loading ? '查詢中...' : '查詢'}
        </button>
      </div>

      {error && <div className="text-red-600 mt-3">{error}</div>}

      {response && (
        <div className="mt-6">
          {response.type === 'sql' ? (
            <div>
              <div className="font-semibold mb-2">AI 回答：</div>
              <div className="bg-gray-100 p-3 rounded">{response.result}</div>
              {response.sql && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-gray-500">顯示 SQL 運算步驟</summary>
                  <pre className="whitespace-pre-wrap bg-gray-50 p-2 rounded">{JSON.stringify(response.sql, null, 2)}</pre>
                </details>
              )}
            </div>
          ) : (
            <div>
              <div className="font-semibold mb-2">相似紀錄：</div>
              <ul className="space-y-2">
                {Array.isArray(response.result) && response.result.length > 0 ? (
                  response.result.map((item: any) => (
                    <li key={item.id} className="p-3 border rounded shadow-sm bg-gray-50">
                      <div className="font-bold">{item.description}</div>
                      <div className="text-sm text-gray-600">
                        {item.category} | {item.amount} | {item.type}
                      </div>
                      <div className="text-xs text-gray-400">{new Date(item.created_at).toLocaleString()}</div>
                      <div className="text-xs text-gray-400">相似度：{(item.similarity * 100).toFixed(1)}%</div>
                    </li>
                  ))
                ) : (
                  <div className="text-gray-400">沒有找到相似紀錄</div>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
