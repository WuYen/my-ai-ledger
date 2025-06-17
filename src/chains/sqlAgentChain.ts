import { SQLDatabase } from "@langchain/community/sql_db";
import { Client } from "pg";
import { ChatOpenAI } from "@langchain/openai";
import { createSqlAgent, SqlToolkit } from "@langchain/community/agents/toolkits/sql";

// 用 singleton 避免重複 connect
const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
});
await pgClient.connect();

const db = await SQLDatabase.fromPGClient(pgClient, {
  includeTables: ["ledger"],
});

const llm = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4.1-mini-2025-04-14",
  temperature: 0,
});

const toolkit = new SqlToolkit(db, llm);
export const sqlAgentChain = createSqlAgent(llm, toolkit);
