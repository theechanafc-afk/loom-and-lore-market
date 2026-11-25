import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MapPin, Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, pushRecentView } from "@/lib/constants";
import { useAddToCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { ProductCard } from "@/components/site/ProductCard";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "Handmade product – WeaveHeritage" },
      { name: "description", content: "View this handmade product, its story and the artisan who made it." },
      { property: "og:title", content: "Handmade product – WeaveHeritage" },
      { property: "og:description", content: "Authentic Indian handloom and handicraft from WeaveHeritage artisans." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const add = useAddToCart();
  const [qty, setQty] = useState(1);
  const { data: p, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: artisan } = useQuery({
    queryKey: ["artisan", p?.artisan_id],
    enabled: !!p?.artisan_id,
    queryFn: async () => (await supabase.from("profiles").select("full_name, bio, location").eq("id", p!.artisan_id!).maybeSingle()).data,
  });
  const { data: related } = useQuery({
    queryKey: ["related", p?.category, id],
    enabled: !!p,
    queryFn: async () => (await supabase.from("products").select("*").eq("category", p!.category).eq("is_active", true).neq("id", id).limit(4)).data ?? [],
  });

  useEffect(() => {
    pushRecentView(id);
    if (user) supabase.from("product_views").insert({ product_id: id, user_id: user.id }).then(() => {});
  }, [id, user]);

  if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-10"><div className="h-96 animate-pulse rounded-lg bg-muted" /></div>;
  if (!p) return <div className="py-20 text-center">Product not found. <Link to="/shop" className="underline">Back to shop</Link></div>;

  const requireUser = () => { if (!user) { nav({ to: "/auth" }); return false; } return true; };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/shop" search={{ category: p.category }} className="text-sm text-muted-foreground hover:text-terracotta">← {p.category}</Link>
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl border bg-card shadow-card">
          {p.image_url && <img src={p.image_url} alt={p.name} width={1024} height={1024} className="aspect-square w-full object-cover" />}
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">{p.name}</h1>
          <p className="mt-3 text-3xl font-bold text-primary">{formatINR(p.price)}</p>
          <p className={`mt-1 text-sm ${p.stock > 0 ? "text-muted-foreground" : "text-destructive"}`}>{p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}</p>
          <p className="mt-5 whitespace-pre-line leading-relaxed">{p.description}</p>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center rounded-md border">
              <Button variant="ghost" size="icon" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease"><Minus /></Button>
              <span className="w-8 text-center font-semibold">{qty}</span>
              <Button variant="ghost" size="icon" onClick={() => setQty(Math.min(p.stock, qty + 1))} aria-label="Increase"><Plus /></Button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button size="lg" variant="outline" disabled={p.stock < 1 || add.isPending} onClick={() => requireUser() && add.mutate({ productId: p.id, qty })}><ShoppingBag /> Add to cart</Button>
            <Button size="lg" disabled={p.stock < 1} onClick={() => requireUser() && nav({ to: "/checkout", search: { buy: p.id, qty } })}><Zap /> Buy now</Button>
          </div>
          <div className="mt-8 rounded-lg border bg-secondary/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-terracotta">Meet the artisan</p>
            <p className="mt-1 font-display text-xl font-semibold">{artisan?.full_name || p.artisan_name}</p>
            {(artisan?.location || p.artisan_location) && <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{artisan?.location || p.artisan_location}</p>}
            {artisan?.bio && <p className="mt-2 text-sm">{artisan.bio}</p>}
          </div>
        </div>
      </div>
      {related && related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-3xl font-bold">More {p.category}</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
    </div>
  );
}
