import { embedding } from "@/lib/langchainClient";
import { supabase } from "@/lib/supabaseClient";

export const embeddingChain = async (input: string) => {
  const [queryEmbedding] = await embedding.embedDocuments([input]);
  // 呼叫 Supabase RPC function
  const { data, error } = await supabase.rpc("match_ledger_by_embedding", {
    query_embedding: queryEmbedding,
    match_count: 5
  });
  if (error) throw error;
  return data;
};

//TODO: 確認你的 Supabase 有建好 match_ledger_by_embedding 這個 SQL function。
