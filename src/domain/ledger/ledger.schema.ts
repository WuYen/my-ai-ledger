import { z } from "zod";

export const LedgerSchema = z.object({
  id: z.number().optional(),             // int4 (serial primary key)
  created_at: z.string().optional(),     // timestamp from Supabase
  description: z.string().min(1),        // text
  amount: z.number(),                    // numeric
  category: z.string().optional(),       // text (由 AI 自動分類)
  embedding: z.array(z.number()).optional(),  // vector
  type: z.enum(["expense", "income"]),   // text
});

export type Ledger = z.infer<typeof LedgerSchema>;
