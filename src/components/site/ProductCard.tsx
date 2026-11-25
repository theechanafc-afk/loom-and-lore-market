import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/constants";
import { useAddToCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";

export type ProductLite = { id: string; name: string; price: number; image_url: string | null; category: string; artisan_name: string; artisan_location?: string | null; stock: number };

export function ProductCard({ p }: { p: ProductLite }) {
  const add = useAddToCart();
  const { user } = useAuth();
  const nav = useNavigate();
  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border bg-card shadow-card transition-transform hover:-translate-y-1">
      <Link to="/product/$id" params={{ id: p.id }} className="relative block aspect-square overflow-hidden bg-muted">
        {p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" width={1024} height={1024} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
        <span className="absolute left-2 top-2 rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-medium text-primary">{p.category}</span>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link to="/product/$id" params={{ id: p.id }} className="font-display text-lg font-semibold leading-tight hover:text-terracotta">{p.name}</Link>
        <p className="text-xs text-muted-foreground">by {p.artisan_name}{p.artisan_location ? ` · ${p.artisan_location}` : ""}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-bold text-primary">{formatINR(p.price)}</span>
          <Button size="sm" disabled={p.stock < 1 || add.isPending} onClick={() => (user ? add.mutate({ productId: p.id }) : nav({ to: "/auth" }))}>
            <ShoppingBag /> {p.stock < 1 ? "Sold out" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}
