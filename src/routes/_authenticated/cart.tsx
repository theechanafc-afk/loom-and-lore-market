import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/cart")({
  head: () => ({ meta: [{ title: "Your Cart – WeaveHeritage" }, { name: "description", content: "Review the handmade items in your cart." }, { property: "og:title", content: "Your Cart – WeaveHeritage" }, { property: "og:description", content: "Review your cart." }] }),
  component: CartPage,
});

function CartPage() {
  const { data: cart, isLoading } = useCart();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["cart"] });
  const setQty = async (id: string, q: number) => { if (q < 1) await supabase.from("cart_items").delete().eq("id", id); else await supabase.from("cart_items").update({ quantity: q }).eq("id", id); refresh(); };
  const items = cart ?? [];
  const total = items.reduce((s, c) => s + Number(c.products?.price ?? 0) * c.quantity, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-4xl font-bold">Your cart</h1>
      {isLoading ? <div className="mt-6 h-40 animate-pulse rounded bg-muted" /> : items.length === 0 ? (
        <div className="mt-10 text-center"><p className="text-muted-foreground">Your cart is empty.</p><Button asChild className="mt-4"><Link to="/shop">Start shopping</Link></Button></div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_280px]">
          <div className="space-y-3">
            {items.map((c) => c.products && (
              <div key={c.id} className="flex gap-3 rounded-lg border bg-card p-3">
                {c.products.image_url && <img src={c.products.image_url} alt={c.products.name} className="h-20 w-20 rounded object-cover" />}
                <div className="flex-1">
                  <Link to="/product/$id" params={{ id: c.product_id }} className="font-display text-lg font-semibold">{c.products.name}</Link>
                  <p className="text-xs text-muted-foreground">by {c.products.artisan_name}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(c.id, c.quantity - 1)}><Minus /></Button>
                    <span className="w-6 text-center text-sm">{c.quantity}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" disabled={c.quantity >= c.products.stock} onClick={() => setQty(c.id, c.quantity + 1)}><Plus /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setQty(c.id, 0)} aria-label="Remove"><Trash2 /></Button>
                  </div>
                  {c.quantity > c.products.stock && <p className="mt-1 text-xs text-destructive">Only {c.products.stock} left</p>}
                </div>
                <p className="font-semibold">{formatINR(Number(c.products.price) * c.quantity)}</p>
              </div>
            ))}
          </div>
          <div className="h-fit rounded-lg border bg-card p-4">
            <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatINR(total)}</span></div>
            <p className="mt-1 text-xs text-muted-foreground">Free shipping · Cash on Delivery</p>
            <Button asChild className="mt-4 w-full"><Link to="/checkout">Checkout</Link></Button>
          </div>
        </div>
      )}
    </div>
  );
}
