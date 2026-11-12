import SiteHeader from "../../components/SiteHeader";
import AccountNav from "../../components/account/AccountNav";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-ink">
      <SiteHeader />
      <div className="container-page grid gap-5 lg:grid-cols-[232px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <AccountNav />
        </aside>
        <main className="min-w-0 space-y-6">{children}</main>
      </div>
    </div>
  );
}
