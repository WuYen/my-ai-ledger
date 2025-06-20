// chains.ts
import { Pool } from "pg";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { DataSource } from "typeorm";
import { SqlDatabase } from "langchain/sql_db";
import { SqlToolkit, createSqlAgent } from "langchain/agents/toolkits/sql";
import { llm } from "@/lib/langchainClient";

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
