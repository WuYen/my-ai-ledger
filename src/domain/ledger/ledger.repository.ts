import { supabase } from "@/lib/supabaseClient";
import type { Ledger } from "./ledger.schema";

export const ledgerRepository = {
  /** 寫入一筆 ledger */
  async insert(entry: Omit<Ledger, "id" | "created_at">) {
    const { data, error } = await supabase
      .from("ledger")
      .insert(entry)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** 查本月紀錄 */
  async listByMonth(year: number, month: number) {
    const start = new Date(year, month - 1, 1).toISOString();
    const end = new Date(year, month, 0, 23, 59, 59).toISOString();

    const { data, error } = await supabase
      .from("ledger")
      .select("*")
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },
};


export async function getHourlyCategoryStats(hour: number) {
  const lower = Math.max(0, hour - 1);
  const upper = Math.min(23, hour + 1);

  const { data, error } = await supabase
    .from("ledger")
    .select(`
      category,
      created_at
    `)
    .eq("type", "expense")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const freqMap: Record<string, { count: number; hours: number[] }> = {};

  data.forEach((item) => {
    const h = new Date(item.created_at).getHours();
    if (h >= lower && h <= upper) {
      if (!freqMap[item.category]) {
        freqMap[item.category] = { count: 0, hours: [] };
      }
      freqMap[item.category].count++;
      freqMap[item.category].hours.push(h);
    }
  });

  return Object.entries(freqMap)
    .map(([category, { count, hours }]) => ({
      category,
      freq: count,
      avgHour: hours.reduce((a, b) => a + b, 0) / hours.length,
    }))
    .sort((a, b) => b.freq - a.freq);
}
