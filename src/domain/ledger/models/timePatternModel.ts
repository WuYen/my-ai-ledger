// src/domain/ledger/models/timePatternModel.ts

import { getHourlyCategoryStats } from "../ledger.repository";

export async function hourlyPatternModel(date: Date = new Date()) {
  const hour = date.getHours();

  const stats = await getHourlyCategoryStats(hour);

  if (!stats.length) {
    return {
      hour,
      suggestions: [],
      topCategory: null,
    };
  }

  return {
    hour,
    suggestions: stats,           // 排序好的 ML 結果
    topCategory: stats[0].category // 最有代表性的類別
  };
}
