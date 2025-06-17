// src/app/api/ledger/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { embedding } from '@/lib/langchainClient';
import { categoryChain } from '@/chains/categoryChain';

export async function POST(request: NextRequest) {
  const { description, amount, type } = await request.json();
  const ledgerType = (type === "expense" || !type) ? 'expense' : 'income';
  // 1. 用 langchain 產生 embedding
  const [descEmbedding] = await embedding.embedDocuments([description]);

  // 2. 用 langchain LLM Chain 做分類
  const categoryResult = await categoryChain.call({ description });
  const category = categoryResult.text.trim();

  // 3. 寫入資料庫
  const { data, error } = await supabase
    .from('ledger')
    .insert([{ description, amount, type: ledgerType, category, embedding: descEmbedding }]);

  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json({ data });
}

export async function GET(request: NextRequest) {
  // 取得 query 參數
  const { searchParams } = new URL(request.url);

  // 參數支援 ?year=2024&month=6 或 ?date=2024-06-01
  let year = Number(searchParams.get('year'));
  let month = Number(searchParams.get('month')); // JS month 1~12
  let baseDateStr = searchParams.get('date');

  let now = new Date();

  // 優先以 date 參數為主
  if (baseDateStr) {
    now = new Date(baseDateStr);
  } else if (year && month) {
    now = new Date(year, month - 1, 1); // JS month 0-based
  }

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // 查詢本月所有紀錄
  const { data, error } = await supabase
    .from('ledger')
    .select('*')
    .gte('created_at', startOfMonth)
    .lte('created_at', endOfMonth)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ data });
}
