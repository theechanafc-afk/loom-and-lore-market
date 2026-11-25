export const CATEGORIES = [
  "Traditional Sarees",
  "Wooden Crafts",
  "Pottery",
  "Paintings",
  "Jewellery",
  "Lamps",
  "Bamboo Crafts",
] as const;
export type Category = (typeof CATEGORIES)[number];
export const ORDER_STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"] as const;

export const CATEGORY_IMAGES: Record<Category, string> = {
  "Traditional Sarees": "/images/saree-kanjivaram.jpg",
  "Wooden Crafts": "/images/wood-elephant.jpg",
  Pottery: "/images/pottery-blue.jpg",
  Paintings: "/images/painting-madhubani.jpg",
  Jewellery: "/images/jewel-jhumka.jpg",
  Lamps: "/images/lamp-diya.jpg",
  "Bamboo Crafts": "/images/bamboo-basket.jpg",
};

export function formatINR(n: number | string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n));
}

const VIEW_KEY = "wh_recent_views";
export function getRecentViews(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(VIEW_KEY) || "[]"); } catch { return []; }
}
export function pushRecentView(id: string) {
  const list = [id, ...getRecentViews().filter((x) => x !== id)].slice(0, 12);
  localStorage.setItem(VIEW_KEY, JSON.stringify(list));
}
