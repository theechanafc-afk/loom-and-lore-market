import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { formatINR } from "@/lib/constants";

type S = { buy?: string; qty?: number };
export const Route = createFileRoute("/_authenticated/checkout")({
  validateSearch: (s: Record<string, unknown>): S => ({
    ...(typeof s["buy"] === "string" ? { buy: s["buy"] } : {}),
    ...(s["qty"] ? { qty: Math.max(1, Number(s["qty"]) || 1) } : {}),
  }),
  head: () => ({ meta: [{ title: "Checkout – WeaveHeritage" }, { name: "description", content: "Enter shipping details and place your order." }, { property: "og:title", content: "Checkout – WeaveHeritage" }, { property: "og:description", content: "Place your order." }] }),
  component: Checkout,
});

function Checkout() {
  const { buy, qty } = Route.useSearch();
  const { profile } = useAuth();
  const { data: cart } = useCart();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: single } = useQuery({
    queryKey: ["product", buy],
    enabled: !!buy,
    queryFn: async () => (await supabase.from("products").select("*").eq("id", buy!).maybeSingle()).data,
  });
  const items = buy
    ? single ? [{ product_id: single.id, quantity: qty ?? 1, name: single.name, price: Number(single.price), image: single.image_url }] : []
    : (cart ?? []).filter((c) => c.products).map((c) => ({ product_id: c.product_id, quantity: c.quantity, name: c.products!.name, price: Number(c.products!.price), image: c.products!.image_url }));
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const [name, setName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  async function place(e: React.FormEvent) {
    e.preventDefault();
    if (!items.length) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("place_order", { _items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })), _name: name, _address: address, _phone: phone });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries();
    toast.success("Order placed! Thank you for supporting artisans.");
    nav({ to: "/orders", search: { placed: data as string } });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-4xl font-bold">Checkout</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
        <form onSubmit={place} className="space-y-4 rounded-lg border bg-card p-5">
          <h2 className="text-2xl font-semibold">Shipping details</h2>
          <div><Label htmlFor="n">Full name</Label><Input id="n" required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label htmlFor="p">Phone</Label><Input id="p" required pattern="[0-9+ -]{8,15}" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label htmlFor="a">Address</Label><Textarea id="a" required rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House, street, city, state, PIN" /></div>
          <div className="rounded-md bg-secondary p-3 text-sm"><b>Payment:</b> Cash on Delivery</div>
          <Button type="submit" className="w-full" size="lg" disabled={busy || !items.length}>{busy ? "Placing order…" : `Place order · ${formatINR(total)}`}</Button>
        </form>
        <div className="h-fit space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-xl font-semibold">Order summary</h2>
          {items.length === 0 && <p className="text-sm text-muted-foreground">No items.</p>}
          {items.map((i) => (
            <div key={i.product_id} className="flex items-center gap-2 text-sm">
              {i.image && <img src={i.image} alt="" className="h-12 w-12 rounded object-cover" />}
              <span className="flex-1">{i.name} × {i.quantity}</span><span>{formatINR(i.price * i.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 font-bold"><span>Total</span><span>{formatINR(total)}</span></div>
        </div>
      </div>
    </div>
  );
}
