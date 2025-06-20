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

// const embeddingRetriever = new RunnableLambda({
//   func: async (question: string) => {
//     // 初始化和查向量庫
//     const vectorStore = await PGVectorStore.initialize(
//       new OpenAIEmbeddings({ model: "text-embedding-3-small" }),
//       {
//         pool: pgPool,
//         tableName: "ledger",
//         columns: {
//           idColumnName: "id",
//           vectorColumnName: "embedding",
//           contentColumnName: "description",
//           metadataColumnName: "category",
//         },
//         distanceStrategy: "cosine",
//       }
//     );
//     const docs = await vectorStore.similaritySearch(question, 5);
//     return docs;
//   }
// });

// // 🗣 定義 summary prompt
// const summaryPrompt = PromptTemplate.fromTemplate(`
// 你是一個貼心助理，幫忙把以下“找到的內容”整理成自然、清楚的中文回答。

// 用戶問題：{question}

// 找到的內容：
// {docs}

// 請根據這些內容回答，用簡短自然的語句：
// `);

// const summaryLLM = summaryPrompt.pipe(llm);

// // 🔗 將兩段 chain 串在一起
// export const embeddingSummaryChain = embeddingRetriever.pipe(
//   new RunnableParallel({
//     steps: {
//       question: new RunnableLambda({ func: (q: string) => q }),
//       docs: new RunnableLambda({ func: (docs: any) =>
//         docs.map((d: any, i: number) => `(${i + 1}) ${d.pageContent}【${d.metadata}】`).join("\n")
//       })
//     }
//   })
// ).pipe(summaryLLM);