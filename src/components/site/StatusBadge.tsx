const styles: Record<string, string> = {
  Pending: "bg-secondary text-secondary-foreground",
  Processing: "bg-gold/25 text-primary",
  Shipped: "bg-accent text-accent-foreground",
  Delivered: "bg-primary text-primary-foreground",
  Cancelled: "bg-destructive/15 text-destructive",
};
export function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status] ?? styles["Pending"]}`}>{status}</span>;
}
