import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "artisan" | "customer";
type Profile = { id: string; full_name: string; bio: string | null; location: string | null; phone: string | null; is_suspended: boolean };
type AuthState = { user: User | null; roles: Role[]; profile: Profile | null; loading: boolean; refresh: () => Promise<void>; signOut: () => Promise<void> };

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();
  const router = useRouter();

  async function load(u: User | null) {
    setUser(u);
    if (!u) { setRoles([]); setProfile(null); setLoading(false); return; }
    const [r, p] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", u.id),
      supabase.from("profiles").select("*").eq("id", u.id).maybeSingle(),
    ]);
    setRoles((r.data ?? []).map((x) => x.role as Role));
    setProfile((p.data as Profile) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => load(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setTimeout(() => load(session?.user ?? null), 0);
      router.invalidate();
      if (event !== "SIGNED_OUT") qc.invalidateQueries();
      else qc.clear();
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Ctx.Provider value={{ user, roles, profile, loading, refresh: () => load(user), signOut: async () => { await supabase.auth.signOut(); } }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
