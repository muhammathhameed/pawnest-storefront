import Link from "next/link";
import { requireCustomer, customerTier, money } from "../../lib/account/user";
import { Card, Empty } from "../../components/account/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Account | AuraFinds" };

const DONE = ["delivered", "fulfilled", "completed"];
const CANCELLED = ["cancelled", "canceled", "refunded"];

export default async function AccountPage() {
  const { supabase, user, profile, displayName } = await requireCustomer("/account");

  const [{ data: orders }, { data: wish }, { data: recs }] = await Promise.all([
    supabase.from("orders").select("id,status,total_amount,created_at").eq("customer_user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("wishlist_items").select("product_id").eq("user_id", user.id),
    supabase.from("products").select("id,name,price,image_url").eq("status", "active").order("rating", { ascending: false }).limit(4),
  ]);
  const list = (orders ?? []) as { id: string; status: string | null; total_amount: number | null; created_at: string }[];
  const st = (o: { status: string | null }) => (o.status ?? "pending").toLowerCase();
  const stats = [
    ["Total orders", list.length],
    ["Pending", list.filter((o) => !DONE.includes(st(o)) && !CANCELLED.includes(st(o))).length],
    ["Delivered", list.filter((o) => DONE.includes(st(o))).length],
    ["Cancelled", list.filter((o) => CANCELLED.includes(st(o))).length],
  ] as const;
  const since = new Date(profile?.created_at ?? user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const avatar = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture;

  return (
    <>
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-wrap items-center gap-5">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-20 w-20 rounded-full border-4 border-white/30 object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/30 bg-white/20 text-3xl font-black">{displayName.charAt(0).toUpperCase()}</span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-black sm:text-3xl">Welcome back, {displayName}</h1>
            <p className="mt-1 text-sm text-white/80">Manage your AuraFinds profile and orders</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white/20 px-3 py-1">Member since {since}</span>
              <span className="rounded-full bg-white/20 px-3 py-1">{customerTier(list.length)} tier</span>
              <span className="rounded-full bg-emerald-400/90 px-3 py-1 text-emerald-950">Account active</span>
            </div>
          </div>
          <Link href="/account/profile" className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow hover:bg-indigo-50">Edit profile</Link>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map(([label, n]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-3xl font-black text-slate-900 dark:text-white">{n}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <Card title="Recent orders" action={<Link href="/account/orders" className="text-sm font-semibold text-indigo-600 hover:underline">View all</Link>}>
        {list.length === 0 ? (
          <Empty text="You haven't placed any orders yet." href="/" cta="Start shopping" />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {list.slice(0, 3).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="font-mono text-xs text-slate-500">#{String(o.id).slice(0, 8)}</span>
                <span className="text-slate-500">{new Date(o.created_at).toLocaleDateString()}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold capitalize dark:bg-slate-800">{st(o)}</span>
                <span className="font-bold">{money(o.total_amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Saved for later" action={<Link href="/account/wishlist" className="text-sm font-semibold text-indigo-600 hover:underline">{(wish ?? []).length} saved</Link>}>
        <p className="text-sm text-slate-500">Items you save appear in your wishlist.</p>
      </Card>

      <Card title="Recommended for you">
        {(recs ?? []).length === 0 ? (
          <Empty text="Recommendations will appear as the catalog grows." />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {(recs as { id: string; name: string; price: number; image_url: string | null }[]).map((p) => (
              <Link key={p.id} href={`/products/${p.id}`} className="group block">
                <div className="aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" />}
                </div>
                <p className="mt-2 truncate text-sm font-medium">{p.name}</p>
                <p className="text-sm font-bold text-indigo-600">${Number(p.price).toFixed(2)}</p>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
