import { llm } from "@/lib/langchainClient";
import { sqlAgentChain } from "./sqlAgentChain";
import { embeddingChain } from "./embeddingChain";

export const routerChain = async (question: string) => {
  const prompt = `
請判斷以下用戶問題該使用「語意查詢」還是「SQL查詢」？
如果需要統計、加總、分組、金額，請選「SQL查詢」；
如果是模糊、相似、描述性、主題性查詢，請選「語意查詢」。
只回 "SQL查詢" 或 "語意查詢"。

用戶問題：「${question}」
答案：
  `;
  const res = await llm.invoke(prompt);
  const decision = res.content?.trim();

  if (decision === "SQL查詢") {
    const result = await sqlAgentChain.invoke({ input: question });
    return { type: "sql", result: result.output, sql: result.intermediateSteps };
  } else {
    const result = await embeddingChain(question);
    return { type: "embedding", result };
  }
};
