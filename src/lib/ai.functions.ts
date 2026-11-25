import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiText, catalogText, getCatalog, parseIds } from "./ai.server";

export const smartSearch = createServerFn({ method: "POST" })
  .inputValidator((d: { query: string }) => ({ query: String(d.query ?? "").slice(0, 300) }))
  .handler(async ({ data }) => {
    const catalog = await getCatalog();
    const text = await aiText(
      "You are a shopping search engine for an Indian handloom & handicraft marketplace. Given a natural-language query and a catalog, return ONLY a JSON array of matching product ids, best match first (max 12). Consider budget (₹), occasion, recipient, colour, material, region. Return [] if nothing fits.",
      [{ role: "user", content: `Query: ${data.query}\n\nCatalog:\n${catalogText(catalog)}` }],
    );
    return { ids: parseIds(text, new Set(catalog.map((p) => p.id))) };
  });

export const getRecommendations = createServerFn({ method: "POST" })
  .inputValidator((d: { viewedIds: string[]; purchasedIds?: string[] }) => ({
    viewedIds: (d.viewedIds ?? []).slice(0, 12).map(String),
    purchasedIds: (d.purchasedIds ?? []).slice(0, 12).map(String),
  }))
  .handler(async ({ data }) => {
    const catalog = await getCatalog();
    const byId = new Map(catalog.map((p) => [p.id, p]));
    const viewed = data.viewedIds.map((id) => byId.get(id)?.name).filter(Boolean);
    const bought = data.purchasedIds.map((id) => byId.get(id)?.name).filter(Boolean);
    if (!viewed.length && !bought.length) return { ids: [] as string[], reason: "" };
    const text = await aiText(
      "You recommend handmade Indian products. Based on the customer's browsing and purchase history, pick 4-6 products from the catalog they would love — similar styles, complementary items, same regions or categories. Prefer items not already viewed/bought, in stock. Respond with a JSON object: {\"ids\": [..], \"reason\": \"one short friendly sentence\"}.",
      [{ role: "user", content: `Viewed: ${viewed.join("; ") || "none"}\nPurchased: ${bought.join("; ") || "none"}\n\nCatalog:\n${catalogText(catalog)}` }],
    );
    let reason = "";
    try { reason = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}").reason ?? ""; } catch { /* ignore */ }
    return { ids: parseIds(text.replace(/"reason"[\s\S]*$/, ""), new Set(catalog.map((p) => p.id))).slice(0, 6), reason };
  });

export const generateDescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; category: string; details: string }) => ({
    name: String(d.name ?? "").slice(0, 200),
    category: String(d.category ?? "").slice(0, 60),
    details: String(d.details ?? "").slice(0, 1000),
  }))
  .handler(async ({ data }) => {
    if (!data.name.trim()) throw new Error("Enter a product name first");
    const text = await aiText(
      "You write attractive, honest e-commerce product descriptions for handmade Indian handloom and handicraft products. Write 2 short paragraphs (70-110 words total): evoke the craft tradition and region, materials and technique, and how to use or gift it. No markdown, no headings, no invented certifications.",
      [{ role: "user", content: `Product: ${data.name}\nCategory: ${data.category}\nDetails from artisan: ${data.details || "(none)"}` }],
    );
    return { description: text.trim() };
  });

export const chatAssistant = createServerFn({ method: "POST" })
  .inputValidator((d: { messages: { role: "user" | "assistant"; content: string }[]; orderSummary?: string }) => ({
    messages: (d.messages ?? []).slice(-20).map((m) => ({ role: m.role === "assistant" ? "assistant" as const : "user" as const, content: String(m.content).slice(0, 2000) })),
    orderSummary: String(d.orderSummary ?? "").slice(0, 3000),
  }))
  .handler(async ({ data }) => {
    const catalog = await getCatalog();
    const reply = await aiText(
      `You are "Kala", the friendly assistant of WeaveHeritage, an online marketplace for traditional Indian handloom and handicraft products made by local artisans.
Help with products, categories, prices, artisans, orders and how the site works. Be warm and concise; use markdown lists when helpful. Prices are in INR.
Site facts: categories are Traditional Sarees, Wooden Crafts, Pottery, Paintings, Jewellery, Lamps, Bamboo Crafts. Customers register, browse/search (Shop page, with AI Smart Search), add to cart or Buy Now, checkout with shipping details (payment: Cash on Delivery), and see orders under "My Orders". Order statuses: Pending, Processing, Shipped, Delivered, Cancelled — updated by the artisan. Artisans register as "Artisan" to list products from the Artisan Dashboard.
When recommending products, mention their exact names and prices from the catalog and link them as [Name](/product/ID).
${data.orderSummary ? `The signed-in customer's recent orders:\n${data.orderSummary}` : "The user is not signed in or has no orders; ask them to sign in to discuss specific orders."}

Catalog:
${catalogText(catalog)}`,
      data.messages,
    );
    return { reply };
  });
