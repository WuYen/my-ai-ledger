import { PromptTemplate } from "@langchain/core/prompts";
import { llm } from "@/lib/langchainClient";

// 建立 PromptTemplate
const prompt = PromptTemplate.fromTemplate(`
請根據以下消費描述，自動分類最適合的消費類別，只回一個最貼近的分類，不要多餘說明：
類別可選：餐飲、娛樂、運動、交通、購物、生活、醫療、收入、其他
描述：「{description}」
回答（只給類別）：
`);

// 用 LCEL 組合 chain：PromptTemplate → LLM
export const categoryChain = prompt.pipe(llm);
