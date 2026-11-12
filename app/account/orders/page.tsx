import Link from "next/link";
import { requireCustomer, money } from "../../../lib/account/user";
import { Card, Empty, PageTitle } from "../../../components/account/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order history | AuraFinds" };

type Order = { id: string; status: string | null; total_amount: number | null; created_at: string };
type Item = { id: string; order_id: string; product_name?: string | null; product_id?: string | null; quantity?: number | null; price?: number | null };

export default async function OrdersPage() {
  const { supabase, user } = await requireCustomer("/account/orders");
  const { data, error } = await supabase
    .from("orders")
    .select("id,status,total_amount,created_at")
    .eq("customer_user_id", user.id)
    .order("created_at", { ascending: false });
  const orders = (data ?? []) as Order[];
  const ids = orders.map((o) => String(o.id));
  const { data: itemData } = ids.length
    ? await supabase.from("order_items").select("*").in("order_id", ids)
    : { data: [] };
  const items = (itemData ?? []) as Item[];

  return (
    <>
      <PageTitle title="Order history" subtitle="Track and review your AuraFinds purchases." />
      {error && <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">Could not load orders: {error.message}</p>}
      {orders.length === 0 ? (
        <Empty text="You haven't placed any orders yet." href="/" cta="Explore the storefront" />
      ) : (
        orders.map((o) => (
          <Card key={o.id}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <p className="font-mono text-xs text-indigo-600">Order #{String(o.id).slice(0, 8)}</p>
                <p className="text-xs text-slate-500">Placed {new Date(o.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize dark:bg-slate-800">{o.status ?? "processing"}</span>
                <span className="font-bold">{money(o.total_amount)}</span>
              </div>
            </div>
            <ul className="mt-3 space-y-2">
              {items.filter((i) => String(i.order_id) === String(o.id)).map((i) => (
                <li key={i.id} className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-950/60">
                  <span>{i.product_name || `Product ${String(i.product_id ?? "").slice(0, 8)}`} <span className="text-slate-500">× {i.quantity ?? 1}</span></span>
                  {i.price != null && <span className="font-semibold">{money(Number(i.price))}</span>}
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
      <Link href="/" className="text-sm font-semibold text-indigo-600 hover:underline">Continue shopping →</Link>
    </>
  );
}
