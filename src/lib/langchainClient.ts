// src/lib/langchainClient.ts
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";

export const llm = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4.1-mini-2025-04-14", // 可改其他
  temperature: 0.1,
});

export const embedding = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  model: "text-embedding-3-small",
});
