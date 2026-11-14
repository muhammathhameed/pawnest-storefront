/**
 * Customer-facing stock labels. Exact inventory counts are never shown to shoppers;
 * only these tiers are. Thresholds are deliberately conservative.
 */
export type StockTone = "success" | "warning" | "danger" | "muted";

export function stockLabel(stock: number | null | undefined): { label: string; tone: StockTone; purchasable: boolean } {
  const n = Number(stock);
  if (!Number.isFinite(n) || n <= 0) return { label: "Sold out", tone: "danger", purchasable: false };
  if (n <= 5) return { label: "Almost gone", tone: "warning", purchasable: true };
  if (n <= 15) return { label: "Limited availability", tone: "warning", purchasable: true };
  return { label: "In stock", tone: "success", purchasable: true };
}
