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
