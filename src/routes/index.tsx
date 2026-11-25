import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Wand2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/site/ProductCard";
import { CATEGORIES, CATEGORY_IMAGES, getRecentViews } from "@/lib/constants";
import { getRecommendations } from "@/lib/ai.functions";
import { useAuth } from "@/lib/auth";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WeaveHeritage – Handmade Indian Sarees & Crafts" },
      { name: "description", content: "Discover handloom sarees, pottery, paintings, jewellery and crafts made by Indian artisans. AI-powered recommendations and search." },
      { property: "og:title", content: "WeaveHeritage – Handmade Indian Sarees & Crafts" },
      { property: "og:description", content: "Shop authentic handloom and handicrafts directly from India's artisans." },
    ],
  }),
  component: Home,
});

function useProducts() {
  return useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function Recommendations() {
  const { user } = useAuth();
  const { data: products } = useProducts();
  const rec = useServerFn(getRecommendations);
  const [views, setViews] = useState<string[]>([]);
  useEffect(() => setViews(getRecentViews()), []);
  const { data: purchased } = useQuery({
    queryKey: ["purchased", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("order_items").select("product_id").limit(20)).data?.map((r) => r.product_id).filter((x): x is string => !!x) ?? [],
  });
  const enabled = views.length > 0 || (purchased?.length ?? 0) > 0;
  const q = useQuery({
    queryKey: ["recs", views, purchased],
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: () => rec({ data: { viewedIds: views, purchasedIds: purchased ?? [] } }),
  });
  if (!enabled) return null;
  const items = (q.data?.ids ?? []).map((id) => products?.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
  return (
    <section className="mx-auto max-w-7xl px-4 pt-14">
      <div className="mb-2 flex items-center gap-2 text-terracotta"><Wand2 className="h-5 w-5" /><span className="text-sm font-semibold uppercase tracking-wider">Picked for you by AI</span></div>
      <h2 className="text-3xl font-bold md:text-4xl">Recommended for you</h2>
      {q.data?.reason && <p className="mt-1 text-muted-foreground">{q.data.reason}</p>}
      {q.isLoading && <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-muted" />)}</div>}
      {q.error && <p className="mt-4 text-sm text-destructive">{(q.error as Error).message}</p>}
      {items.length > 0 && <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
    </section>
  );
}

function Home() {
  const { data: products, isLoading } = useProducts();
  return (
    <div>
      <section className="relative isolate overflow-hidden">
        <img src="/images/hero-loom.jpg" alt="Artisan weaving silk on a handloom" width={1600} height={912} className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-hero-overlay" />
        <div className="mx-auto max-w-7xl px-4 py-24 md:py-36">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Handmade in India</p>
          <h1 className="mt-3 max-w-2xl text-5xl font-bold leading-[1.05] text-cream md:text-7xl">Every thread tells a story.</h1>
          <p className="mt-5 max-w-lg text-lg text-cream/85">Sarees, pottery, paintings and crafts — bought directly from the artisans who make them.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild><Link to="/shop">Shop the collection <ArrowRight /></Link></Button>
            <Button size="lg" variant="secondary" asChild><Link to="/shop" search={{ ai: true }}><Wand2 /> Try AI search</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-14">
        <h2 className="text-3xl font-bold md:text-4xl">Shop by craft</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {CATEGORIES.map((c) => (
            <Link key={c} to="/shop" search={{ category: c }} className="group text-center">
              <div className="aspect-square overflow-hidden rounded-full border-4 border-card shadow-card">
                <img src={CATEGORY_IMAGES[c]} alt={c} loading="lazy" width={1024} height={1024} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
              </div>
              <p className="mt-2 text-sm font-semibold group-hover:text-terracotta">{c}</p>
            </Link>
          ))}
        </div>
      </section>

      <Recommendations />

      <section className="mx-auto max-w-7xl px-4 pt-14">
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-bold md:text-4xl">New from the workshops</h2>
          <Link to="/shop" className="text-sm font-semibold text-terracotta">View all →</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {isLoading && [0, 1, 2, 3].map((i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-muted" />)}
          {products?.slice(0, 8).map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>
    </div>
  );
}
