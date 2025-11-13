import { LedgerSchema } from "./ledger.schema";
import { ledgerRepository } from "./ledger.repository";
import { embedding } from "@/lib/langchainClient";
import { categoryChain } from "@/chains/categoryChain";

export const ledgerService = {
  /** 建立一筆 ledger (驗證 + AI 分類 + embedding) */
  async create(rawInput: any) {
    // 1. 驗證輸入格式
    const parsed = LedgerSchema.safeParse(rawInput);
    if (!parsed.success) {
      console.error("❌ LedgerSchema Validation Error:", parsed.error);
      throw parsed.error;
    }

    const ledger = parsed.data;

    // 2. Langchain Embedding
    const [vector] = await embedding.embedDocuments([ledger.description]);

    // 3. AI 類別推論
    const aiCat = await categoryChain.invoke({ description: ledger.description });
    const category = aiCat.content;

    // 4. 寫入資料庫
    const saved = await ledgerRepository.insert({
      ...ledger,
      category,
      embedding: vector,
    });

    return saved;
  },

  /** 提供 API GET 用 */
  async listByMonth(year: number, month: number) {
    return ledgerRepository.listByMonth(year, month);
  },
};
