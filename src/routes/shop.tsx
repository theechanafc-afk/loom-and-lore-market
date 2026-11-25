import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/site/ProductCard";
import { CATEGORIES } from "@/lib/constants";
import { smartSearch } from "@/lib/ai.functions";

type Search = { q?: string | undefined; category?: string | undefined; ai?: boolean | undefined };

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    ...(typeof s["q"] === "string" && s["q"] ? { q: s["q"] } : {}),
    ...(typeof s["category"] === "string" && s["category"] ? { category: s["category"] } : {}),
    ...(s["ai"] === true || s["ai"] === "true" ? { ai: true } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Shop Handloom & Handicrafts – WeaveHeritage" },
      { name: "description", content: "Browse and search handmade sarees, wooden crafts, pottery, paintings, jewellery, lamps and bamboo crafts." },
      { property: "og:title", content: "Shop Handloom & Handicrafts – WeaveHeritage" },
      { property: "og:description", content: "Browse handmade Indian products by category or with AI smart search." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { q, category, ai } = Route.useSearch();
  const nav = useNavigate({ from: "/shop" });
  const [text, setText] = useState(q ?? "");
  const [aiMode, setAiMode] = useState(!!ai);
  const search = useServerFn(smartSearch);
  useEffect(() => setText(q ?? ""), [q]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const aiQ = useQuery({
    queryKey: ["smart", q],
    enabled: aiMode && !!q,
    retry: false,
    staleTime: 10 * 60_000,
    queryFn: () => search({ data: { query: q! } }),
  });

  let list = products ?? [];
  if (category) list = list.filter((p) => p.category === category);
  if (q) {
    if (aiMode) {
      const ids = aiQ.data?.ids ?? [];
      list = ids.map((id) => list.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
    } else {
      const t = q.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(t));
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-4xl font-bold">{category ?? "All handmade products"}</h1>
      <form className="mt-5 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); nav({ search: (s) => ({ ...s, q: text || undefined, ...(aiMode ? { ai: true } : { ai: undefined }) }) }); }}>
        <div className="relative flex-1">
          {aiMode ? <Wand2 className="absolute left-2.5 top-2.5 h-4 w-4 text-terracotta" /> : <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />}
          <Input value={text} onChange={(e) => setText(e.target.value)} className="pl-8" placeholder={aiMode ? "e.g. a wedding gift for my sister under ₹5000" : "Search by product name"} />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant={aiMode ? "default" : "outline"} onClick={() => setAiMode(!aiMode)}><Wand2 /> Smart search {aiMode ? "on" : "off"}</Button>
          <Button type="submit">Search</Button>
        </div>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant={!category ? "default" : "outline"} onClick={() => nav({ search: (s) => ({ ...s, category: undefined }) })}>All</Button>
        {CATEGORIES.map((c) => <Button key={c} size="sm" variant={category === c ? "default" : "outline"} onClick={() => nav({ search: (s) => ({ ...s, category: c }) })}>{c}</Button>)}
      </div>
      {q && <p className="mt-4 text-sm text-muted-foreground">{aiMode ? "AI results" : "Results"} for “{q}” {q && <button className="ml-2 underline" onClick={() => nav({ search: (s) => ({ ...s, q: undefined }) })}>clear</button>}</p>}
      {aiQ.isFetching && <p className="mt-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Finding the perfect pieces…</p>}
      {aiQ.error && <p className="mt-6 text-destructive">{(aiQ.error as Error).message}</p>}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {isLoading && [0, 1, 2, 3].map((i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-muted" />)}
        {!aiQ.isFetching && list.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
      {!isLoading && !aiQ.isFetching && list.length === 0 && <p className="mt-10 text-center text-muted-foreground">No products found.</p>}
    </div>
  );
}
