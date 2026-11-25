import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, Search, ShoppingCart, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { CATEGORIES } from "@/lib/constants";

export function Header() {
  const { user, roles, profile, signOut } = useAuth();
  const { data: cart } = useCart();
  const count = (cart ?? []).reduce((s, c) => s + c.quantity, 0);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const submit = (e: React.FormEvent) => { e.preventDefault(); nav({ to: "/shop", search: { q: q || undefined } }); setOpen(false); };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="border-motif" />
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
        <Link to="/" className="flex items-baseline gap-1">
          <span className="font-display text-2xl font-bold text-primary">Weave</span>
          <span className="font-display text-2xl font-bold italic text-terracotta">Heritage</span>
        </Link>
        <nav className="ml-6 hidden gap-5 text-sm font-medium md:flex">
          <Link to="/shop" className="hover:text-terracotta" activeProps={{ className: "text-terracotta" }}>Shop</Link>
          {user && <Link to="/orders" className="hover:text-terracotta">My Orders</Link>}
        </nav>
        <form onSubmit={submit} className="ml-auto hidden max-w-xs flex-1 items-center md:flex">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sarees, pottery…" className="pl-8" />
          </div>
        </form>
        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/cart" aria-label="Cart" className="relative">
              <ShoppingCart />
              {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-terracotta px-1 text-[10px] font-bold text-primary-foreground">{count}</span>}
            </Link>
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Account"><User /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{profile?.full_name || user.email}<div className="text-xs font-normal text-muted-foreground capitalize">{roles.join(", ")}</div></DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => nav({ to: "/orders" })}>My Orders</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); nav({ to: "/" }); }}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" asChild><Link to="/auth">Sign in</Link></Button>
          )}
        </div>
      </div>
      {open && (
        <div className="space-y-3 border-t px-4 py-3 md:hidden">
          <form onSubmit={submit}><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" /></form>
          <div className="flex flex-col gap-2 text-sm font-medium">
            <Link to="/shop" onClick={() => setOpen(false)}>Shop all</Link>
            {CATEGORIES.map((c) => <Link key={c} to="/shop" search={{ category: c }} onClick={() => setOpen(false)} className="pl-3 text-muted-foreground">{c}</Link>)}
            {user && <Link to="/orders" onClick={() => setOpen(false)}>My Orders</Link>}
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 bg-espresso text-cream">
      <div className="border-motif" />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl font-bold">WeaveHeritage</p>
          <p className="mt-2 text-sm opacity-80">Handmade by India's artisans — sarees, crafts and heirlooms straight from the loom and the kiln.</p>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-semibold">Categories</p>
          <div className="grid grid-cols-2 gap-1 opacity-80">
            {CATEGORIES.map((c) => <Link key={c} to="/shop" search={{ category: c }} className="hover:opacity-100">{c}</Link>)}
          </div>
        </div>
        <div className="text-sm opacity-80">
          <p className="mb-2 font-semibold opacity-100">Sell with us</p>
          <p>Are you an artisan? Register as a seller and reach customers across India.</p>
          <Link to="/auth" search={{ mode: "register" }} className="mt-2 inline-block underline">Become an artisan →</Link>
        </div>
      </div>
      <p className="pb-6 text-center text-xs opacity-60">© {new Date().getFullYear()} WeaveHeritage</p>
    </footer>
  );
}
