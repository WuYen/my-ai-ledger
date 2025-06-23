// chains.ts
import { Pool } from "pg";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { DataSource } from "typeorm";
import { SqlDatabase } from "langchain/sql_db";
import { SqlToolkit, createSqlAgent } from "langchain/agents/toolkits/sql";
import { llm } from "@/lib/langchainClient";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableLambda, RunnableParallel } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

// 🧭 基礎設定：共用 pg Pool、LLM、TypeORM DataSource
export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const ds = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
});

export async function initDb() {
  if (!ds.isInitialized) await ds.initialize();
}

// 🔍 embeddingChain：語意查詢（PGVectorStore + similaritySearch）
export async function embeddingChain(question: string) {
  await initDb();

  const vectorStore = await PGVectorStore.initialize(
    new OpenAIEmbeddings({ model: "text-embedding-3-small" }),
    {
      pool: pgPool,
      tableName: "ledger",
      columns: {
        idColumnName: "id",
        vectorColumnName: "embedding",
        contentColumnName: "description",
        metadataColumnName: "category",
      },
      distanceStrategy: "cosine",
    }
  );

  const docs = await vectorStore.similaritySearch(question, 5);
  console.log(`🔍 Embedding 結果:`, docs);
  return docs; // 回傳 array of Document（包含 description + metadata）
}

// 🧠 sqlAgentChain：進階 SQL Agent，支援重試、自動 SQL
export async function sqlAgentChain(question: string) {
  await initDb();

  const db = await SqlDatabase.fromDataSourceParams({ appDataSource: ds });
  const toolkit = new SqlToolkit(db, llm);
  const agent = await createSqlAgent(llm, toolkit,);

  const result = await agent.invoke({ input: question });
  console.log(`🔍 SQL Agent 結果:`, result);
  return { summary: result.output, data: result };
}

const fastSqlPrompt = PromptTemplate.fromTemplate(`
你是 SQL 專家，資料表結構如下：

Table: ledger
- id: integer
- created_at: timestamp
- description: text
- amount: numeric
- category: text
- type: text（值可能是 "income" 或 "expense"）

category 類別可選：餐飲、娛樂、運動、交通、購物、生活、醫療、收入、其他

請根據使用者問題，生成 PostgreSQL 語法的 SQL 查詢，不需要任何解釋或註解。
只回傳 SQL 本身。

範例：
問題：「這個月花最多的是哪一類？」
SQL：
SELECT category, SUM(amount) AS total
FROM ledger
WHERE type = 'expense'
  AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
GROUP BY category
ORDER BY total DESC
LIMIT 1;

問題：「收入總共多少？」
SQL：
SELECT SUM(amount) FROM ledger WHERE type = 'income';

問題：「{question}」
SQL：

只回傳 SQL 查詢語句本身，不要加上任何說明、註解或 Markdown 格式
`);

export const fastSqlChain = new RunnableLambda({
  func: async (input: { question: string }) => input
})
  .pipe(
    new RunnableLambda({
      func: async ({ question }: { question: string }) => {
        const sql = await fastSqlPrompt.pipe(llm).pipe(new StringOutputParser()).invoke({ question });
        return { question, sql };
      }
    })
  )
  .pipe(
    new RunnableLambda({
      func: async ({ question, sql }: { question: string; sql: string }) => {
        try {
          console.log("🔗 fastSqlChain 執行 SQL:", sql);
          const result = await pgPool.query(sql);
          console.log("🔗 fastSqlChain SQL 查詢結果:", result.rows);
          return { question, sql, docs: result.rows };
        } catch (err) {
          console.error("🔗 fastSqlChain SQL 查詢失敗:", err);
          throw err;
        }
      }
    })
  )
  .pipe(
    new RunnableLambda({
      func: async ({ question, docs }: { question: string; docs: any[] }) => {
        const summary = await summaryLLM.invoke({ question, docs });
        return { summary: summary, data: docs };
      }
    })
  )
  .pipe(
    new RunnableLambda({
      func: (result: any) => {
        console.log("🔗 fastSqlChain 最終結果:", result);
        return result;
      }
    })
  );

const embeddingRetriever = new RunnableLambda({
  func: async (question: string) => {
    // 初始化和查向量庫
    const vectorStore = await PGVectorStore.initialize(
      new OpenAIEmbeddings({ model: "text-embedding-3-small" }),
      {
        pool: pgPool,
        tableName: "ledger",
        columns: {
          idColumnName: "id",
          vectorColumnName: "embedding",
          contentColumnName: "description",
          metadataColumnName: "category",
        },
        distanceStrategy: "cosine",
      }
    );
    const docs = await vectorStore.similaritySearch(question, 5);
    return docs;
  }
});

// 🗣 定義 summary prompt
const summaryPrompt = PromptTemplate.fromTemplate(`
你是一個貼心助理，幫忙把以下“找到的內容”整理成自然、清楚的中文回答。

用戶問題：{question}

找到的內容：
{docs}

請根據這些內容回答，用簡短自然的語句：
`);

const summaryLLM = summaryPrompt.pipe(llm);

// --- 只保留新版 embeddingSummaryChain ---
export const embeddingSummaryChain = embeddingRetriever.pipe(
  new RunnableParallel({
    steps: {
      question: new RunnableLambda({ func: (q: string) => q }),
      docs: new RunnableLambda({ func: (docs: any) => docs })
    }
  })
).pipe(
  new RunnableLambda({
    func: async ({ question, docs }: { question: string, docs: any[] }) => {
      // 將 docs 格式化為 summary prompt 需要的格式
      const formattedDocs = docs.map((d: any, i: number) => `(${i + 1}) ${d.pageContent}【${d.metadata}】`).join("\n");
      return { question, docs, formattedDocs };
    }
  })
).pipe(
  new RunnableLambda({
    func: async ({ question, docs, formattedDocs }: { question: string, docs: any[], formattedDocs: string }) => {
      // 呼叫 summaryLLM
      const summary = await summaryLLM.invoke({ question, docs: formattedDocs });
      return { content: summary, data: docs };
    }
  })
).pipe(
  new RunnableLambda({
    func: (result: any) => {
      console.log('🔗 embeddingSummaryChain 最終結果:', result);
      return result;
    }
  })
);
