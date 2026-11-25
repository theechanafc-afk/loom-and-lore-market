import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "@tanstack/react-router";
import { MessageCircle, Send, X, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { chatAssistant } from "@/lib/ai.functions";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "Namaste! I'm **Kala**, your WeaveHeritage guide. Ask me about sarees, gifts under a budget, your orders, or how to shop here." }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const chat = useServerFn(chatAssistant);
  const { user } = useAuth();
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next); setInput(""); setBusy(true); setErr("");
    try {
      let orderSummary = "";
      if (user) {
        const { data } = await supabase.from("orders").select("id, created_at, total, order_items(product_name, quantity, status)").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(5);
        orderSummary = (data ?? []).map((o) => `Order #${o.id.slice(0, 8)} on ${new Date(o.created_at).toDateString()}, total ₹${o.total}: ${o.order_items.map((i) => `${i.product_name} x${i.quantity} [${i.status}]`).join(", ")}`).join("\n");
      }
      const res = await chat({ data: { messages: next.slice(1), orderSummary } });
      setMsgs([...next, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally { setBusy(false); }
  }

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-card" aria-label="Open assistant">
          <MessageCircle className="h-5 w-5" /> Ask Kala
        </button>
      )}
      {open && (
        <div className="fixed inset-x-3 bottom-3 z-50 flex h-[75vh] flex-col overflow-hidden rounded-xl border bg-card shadow-card sm:inset-x-auto sm:right-5 sm:w-96 sm:h-[560px]">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gold font-display text-lg font-bold text-espresso">क</span>
              <div><p className="font-semibold leading-none">Kala</p><p className="text-xs opacity-80">AI shopping assistant</p></div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {msgs.map((m, i) => m.role === "user" ? (
              <div key={i} className="ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-primary-foreground">{m.content}</div>
            ) : (
              <div key={i} className="prose prose-sm max-w-none text-foreground [&_a]:text-terracotta [&_a]:underline [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                <ReactMarkdown components={{ a: ({ href, children }) => href?.startsWith("/") ? <Link to={href} onClick={() => setOpen(false)}>{children}</Link> : <a href={href} target="_blank" rel="noreferrer">{children}</a> }}>{m.content}</ReactMarkdown>
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Kala is thinking…</div>}
            {err && <div className="rounded-md bg-destructive/10 p-2 text-destructive">{err}</div>}
            <div ref={endRef} />
          </div>
          <div className="flex gap-2 border-t p-3">
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder="Ask anything…" className="min-h-10 resize-none" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <Button size="icon" className="h-10 w-10 shrink-0" onClick={send} disabled={busy || !input.trim()} aria-label="Send"><Send /></Button>
          </div>
        </div>
      )}
    </>
  );
}
