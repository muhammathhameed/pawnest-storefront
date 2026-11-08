import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import { getSupabaseServerClient } from "../../lib/supabase/server";

export default async function AccountPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=%2Faccount");

  const name = user.user_metadata.full_name ?? user.email ?? "friend";

  return (
    <main className="store-shell">
      <SiteHeader />
      <section className="account-page">
        <p className="eyebrow">YOUR AURAFINDS</p>
        <h1>Welcome, {name}</h1>
        <p>Manage your account and keep all your pet essentials in one place.</p>
        <div className="account-links">
          <Link className="account-link-card" href="/account/orders">
            <span aria-hidden="true">📦</span>
            <span>
              <strong>Order history</strong>
              <small>Track your AuraFinds purchases</small>
            </span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
          <Link className="account-link-card" href="/cart">
            <span aria-hidden="true">🛍️</span>
            <span>
              <strong>Your cart</strong>
              <small>Pick up where you left off</small>
            </span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
