import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const MODEL = "openai/gpt-6.1-sol";

export async function aiText(instructions: string, messages: ModelMessage[]): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured");
  let runId: string | undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
      if (res.status === 402) throw new Error("AI credits are exhausted. Please try again later.");
      if (res.status === 429) throw new Error("AI is busy right now. Please try again in a moment.");
      return res;
    },
  });
  const result = streamText({
    model: provider.responses(MODEL),
    instructions,
    messages,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  return await result.text;
}

export async function getCatalog() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await client
    .from("products")
    .select("id, name, category, price, stock, artisan_name, artisan_location, description")
    .eq("is_active", true)
    .limit(300);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function catalogText(items: Awaited<ReturnType<typeof getCatalog>>) {
  return items
    .map((p) => `id=${p.id} | ${p.name} | ${p.category} | ₹${p.price} | stock ${p.stock} | by ${p.artisan_name}${p.artisan_location ? ` (${p.artisan_location})` : ""} | ${p.description.slice(0, 140)}`)
    .join("\n");
}

export function parseIds(text: string, valid: Set<string>): string[] {
  const m = text.match(/\[[\s\S]*\]/);
  let arr: unknown[] = [];
  try { arr = m ? JSON.parse(m[0]) : []; } catch { arr = []; }
  const ids = arr.filter((x): x is string => typeof x === "string" && valid.has(x));
  if (ids.length) return ids;
  return (text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) ?? []).filter((x) => valid.has(x));
}
