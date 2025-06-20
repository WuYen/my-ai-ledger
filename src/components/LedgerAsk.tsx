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
      const res = await fetch('/api/ask', {
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
          {response.result.summary}
        </div>
      )}
    </div>
  );
}
