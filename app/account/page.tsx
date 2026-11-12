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

  const checks = [
    ["Add your name", !!(profile?.full_name || user.user_metadata?.full_name), "/account/profile"],
    ["Add a phone number", !!profile?.phone, "/account/profile"],
    ["Upload a photo", !!avatar, "/account/profile"],
    ["Confirm your email", !!user.email_confirmed_at, "/account/security"],
  ] as const;
  const done = checks.filter((c) => c[1]).length;
  const quick = [
    ["Track an order", "/account/orders"], ["Saved items", "/account/wishlist"],
    ["Manage addresses", "/account/addresses"], ["Security", "/account/security"],
  ] as const;

  return (
    <>
      <section className="glass-strong slide-up relative overflow-hidden rounded-[var(--r-xl)] p-6 sm:p-8" style={{ backgroundImage: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 26%, transparent), color-mix(in srgb, var(--primary-2) 20%, transparent))" }}>
        <div className="flex flex-wrap items-center gap-5">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-20 w-20 rounded-full border-4 border-[var(--highlight)] object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[var(--highlight)] bg-surface text-ink t-page">{displayName.charAt(0).toUpperCase()}</span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="t-page truncate">Welcome back, {displayName}</h1>
            <p className="t-body mt-1 text-muted">Manage your AuraFinds profile and orders</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="badge">Member since {since}</span>
              <span className="badge">{customerTier(list.length)} tier</span>
              <span className="badge badge-success">Account active</span>
            </div>
          </div>
          <Link href="/account/profile" className="btn btn-primary">Edit profile</Link>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map(([label, n]) => (
          <div key={label} className="glass-card">
            <p className="t-page">{n}</p>
            <p className="t-label mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Quick actions">
          <div className="grid grid-cols-2 gap-3">
            {quick.map(([label, href]) => <Link key={label} href={href} className="btn btn-glass">{label}</Link>)}
          </div>
        </Card>
        <Card title={`Profile completion · ${Math.round((done / checks.length) * 100)}%`}>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={checks.length} aria-label="Profile completion">
            <div className="h-full rounded-full bg-gradient-to-r from-[var(--electric)] to-[var(--primary-2)]" style={{ width: `${(done / checks.length) * 100}%` }} />
          </div>
          <ul className="grid gap-1">
            {checks.filter((c) => !c[1]).map((c) => <li key={c[0]}><Link href={c[2]} className="t-body text-brand hover:underline">{c[0]} →</Link></li>)}
            {done === checks.length && <li className="t-body text-[var(--success)]">Your profile is complete.</li>}
          </ul>
        </Card>
      </div>

      <Card title="Recent orders" action={<Link href="/account/orders" className="text-sm font-semibold text-brand hover:underline">View all</Link>}>
        {list.length === 0 ? (
          <Empty text="You haven't placed any orders yet." href="/" cta="Start shopping" />
        ) : (
          <ul className="divide-y divide-line">
            {list.slice(0, 3).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="font-mono text-xs text-muted">#{String(o.id).slice(0, 8)}</span>
                <span className="text-muted">{new Date(o.created_at).toLocaleDateString()}</span>
                <span className="badge capitalize">{st(o)}</span>
                <span className="font-bold">{money(o.total_amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Saved for later" action={<Link href="/account/wishlist" className="text-sm font-semibold text-brand hover:underline">{(wish ?? []).length} saved</Link>}>
        <p className="text-sm text-muted">Items you save appear in your wishlist.</p>
      </Card>

      <Card title="Recommended for you">
        {(recs ?? []).length === 0 ? (
          <Empty text="Recommendations will appear as the catalog grows." />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {(recs as { id: string; name: string; price: number; image_url: string | null }[]).map((p) => (
              <Link key={p.id} href={`/products/${p.id}`} className="group block">
                <div className="aspect-square overflow-hidden rounded-xl bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" />}
                </div>
                <p className="mt-2 truncate text-sm font-medium">{p.name}</p>
                <p className="text-sm font-bold text-brand">${Number(p.price).toFixed(2)}</p>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
