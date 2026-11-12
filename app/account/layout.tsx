import SiteHeader from "../../components/SiteHeader";
import AccountNav from "../../components/account/AccountNav";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <SiteHeader />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <AccountNav />
        </aside>
        <main className="min-w-0 space-y-6">{children}</main>
      </div>
    </div>
  );
}
