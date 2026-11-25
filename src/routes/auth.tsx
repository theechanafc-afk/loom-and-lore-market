import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";

type S = { mode?: "login" | "register"; redirect?: string };
export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): S => ({
    ...(s["mode"] === "register" ? { mode: "register" as const } : {}),
    ...(typeof s["redirect"] === "string" && s["redirect"].startsWith("/") && !s["redirect"].startsWith("//") ? { redirect: s["redirect"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Sign in or Register – WeaveHeritage" },
      { name: "description", content: "Sign in or create a customer or artisan account on WeaveHeritage." },
      { property: "og:title", content: "Sign in or Register – WeaveHeritage" },
      { property: "og:description", content: "Join WeaveHeritage as a customer or artisan." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initial, redirect } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "register">(initial ?? "login");
  const [role, setRole] = useState<"customer" | "artisan">("customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { user } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (user) nav({ to: redirect ?? "/" }); }, [user, redirect, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { full_name: name, role } } });
        if (error) throw error;
        if (!data.session) setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); } finally { setBusy(false); }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message);
  }

  if (sent) return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">Check your email</h1>
      <p className="mt-3 text-muted-foreground">We sent a confirmation link to <b>{email}</b>. Click it to activate your account, then sign in.</p>
      <Button className="mt-6" variant="outline" onClick={() => { setSent(false); setMode("login"); }}>Back to sign in</Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-xl border bg-card p-6 shadow-card">
        <h1 className="text-center text-3xl font-bold">{mode === "login" ? "Welcome back" : "Join WeaveHeritage"}</h1>
        <div className="mt-5 grid grid-cols-2 rounded-md bg-muted p-1 text-sm font-medium">
          <button className={`rounded py-1.5 ${mode === "login" ? "bg-card shadow" : ""}`} onClick={() => setMode("login")}>Sign in</button>
          <button className={`rounded py-1.5 ${mode === "register" ? "bg-card shadow" : ""}`} onClick={() => setMode("register")}>Register</button>
        </div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          {mode === "register" && (
            <>
              <div>
                <Label>I want to</Label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {(["customer", "artisan"] as const).map((r) => (
                    <button type="button" key={r} onClick={() => setRole(r)} className={`rounded-md border p-3 text-left text-sm ${role === r ? "border-terracotta bg-accent" : ""}`}>
                      <b>{r === "customer" ? "Shop" : "Sell"}</b><br /><span className="text-xs text-muted-foreground">{r === "customer" ? "Customer account" : "Artisan / Seller"}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div><Label htmlFor="name">Full name</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
            </>
          )}
          <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label htmlFor="password">Password</Label><Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</Button>
        </form>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" /></div>
        <Button type="button" variant="outline" className="w-full" onClick={google}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
          Continue with Google
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">Google sign-in creates a customer account.</p>
      </div>
    </div>
  );
}
