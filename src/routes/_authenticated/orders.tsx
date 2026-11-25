import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatINR } from "@/lib/constants";
import { StatusBadge } from "@/components/site/StatusBadge";

export const Route = createFileRoute("/_authenticated/orders")({
  validateSearch: (s: Record<string, unknown>): { placed?: string } => (typeof s["placed"] === "string" ? { placed: s["placed"] } : {}),
  head: () => ({ meta: [{ title: "My Orders – WeaveHeritage" }, { name: "description", content: "Your order history and delivery status." }, { property: "og:title", content: "My Orders – WeaveHeritage" }, { property: "og:description", content: "Your order history." }] }),
  component: Orders,
});

function Orders() {
  const { user } = useAuth();
  const { placed } = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("orders").select("*, order_items(*)").eq("customer_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-4xl font-bold">My orders</h1>
      {placed && <div className="mt-4 rounded-md border border-terracotta bg-accent p-3 text-sm">🎉 Order <b>#{placed.slice(0, 8)}</b> placed successfully.</div>}
      {isLoading && <div className="mt-6 h-40 animate-pulse rounded bg-muted" />}
      {data?.length === 0 && <p className="mt-8 text-muted-foreground">No orders yet. <Link to="/shop" className="underline">Browse products</Link></p>}
      <div className="mt-6 space-y-4">
        {data?.map((o) => (
          <div key={o.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="font-semibold">Order #{o.id.slice(0, 8)}</span>
              <span className="text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN")}</span>
            </div>
            <div className="mt-3 space-y-2">
              {o.order_items.map((i) => (
                <div key={i.id} className="flex items-center gap-3 text-sm">
                  {i.image_url && <img src={i.image_url} alt="" className="h-12 w-12 rounded object-cover" />}
                  <span className="flex-1">{i.product_name} × {i.quantity}</span>
                  <StatusBadge status={i.status} />
                  <span className="w-20 text-right">{formatINR(Number(i.price) * i.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t pt-2 text-sm"><span className="text-muted-foreground">Ship to {o.shipping_name}, {o.shipping_address}</span><b>{formatINR(o.total)}</b></div>
          </div>
        ))}
      </div>
    </div>
  );
}
