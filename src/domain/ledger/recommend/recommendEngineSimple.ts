// src/domain/ledger/recommend/recommendEngineSimple.ts

import { llm } from "@/lib/langchainClient";
import { hourlyPatternModel } from "@/domain/ledger/models/timePatternModel";

export const aiRecommendSimple = async () => {
  const now = new Date();

  // Step 1: ML 模型：時間段特徵
  const timePattern = await hourlyPatternModel(now);

  // Step 2: LangChain Prompt（完整 prompt，但註解掉其他模型）
  const prompt = `
你是一個 AI 記帳助手，請根據使用者在「這個時間段」的歷史行為做推論。

現在時間：${now.toLocaleString()}

# --- ML 模型輸入 ---
時間段模型 (Hourly Pattern Model)：
${JSON.stringify(timePattern, null, 2)}


請根據「時間段模型」，推論使用者現在最可能記錄的 **Top 5 類別**。

請回傳以下 JSON 格式（不要多餘文字）：

{
  "top5": [
    { "category": "", "reason": "", "score": 0.0 },
    { "category": "", "reason": "", "score": 0.0 },
    { "category": "", "reason": "", "score": 0.0 },
    { "category": "", "reason": "", "score": 0.0 },
    { "category": "", "reason": "", "score": 0.0 }
  ]
}

說明：
- "category"：推薦的類別名稱
- "reason"：為什麼在此時段推薦這個類別（依據 freq、avgHour 或 user pattern）
- "score"：0~1 的推論信心值
`;

  console.log("🧠 [AI Prompt - Simple Recommend] =", prompt);

  // Step 3: 呼叫 LangChain LLM
  const res = await llm.invoke(prompt);

  // LangChain 的結果在 res.content
  const text = typeof res.content === "string" ? res.content : res.content.toString();

  console.log("🤖 [AI Raw Output] =", text);

  try {
    const json = JSON.parse(text);
    return json;
  } catch (err) {
    console.error("❌ AI 回傳非 JSON，回傳如下:", text);
    throw new Error("AI JSON parse error in recommendEngineSimple");
  }
};
