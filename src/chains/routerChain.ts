import { llm } from "@/lib/langchainClient";
import { sqlAgentChain, embeddingSummaryChain } from "./sqlChain";

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
    const decision = res.content;
    console.log(`🔍 判斷結果: ${decision}`);
    if (decision === "SQL查詢") {
        const result = await sqlAgentChain(question);
        return { type: "sql", summary: result.summary };
    } else {
        const result = await embeddingSummaryChain.invoke(question);
        console.log('🔗 embeddingSummaryChain 最終結果:', result);
        return { type: "embedding", summary: result.content.content };
    }
};
