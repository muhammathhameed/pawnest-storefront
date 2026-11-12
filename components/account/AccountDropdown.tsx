"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";

type U = { name: string; email: string; avatar: string | null };

const ITEMS = [
  { href: "/account", label: "My Account" },
  { href: "/account/orders", label: "My Orders" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/notifications", label: "Notifications" },
  { href: "/account/security", label: "Security Settings" },
  { href: "/account/profile", label: "Profile Settings" },
  { href: "mailto:support@aurafinds.com", label: "Support" },
];

export default function AccountDropdown() {
  const [user, setUser] = useState<U | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const sb = getSupabaseBrowserClient();
      const map = (u: any): U | null =>
        u ? { name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "Account", email: u.email ?? "", avatar: u.user_metadata?.avatar_url || u.user_metadata?.picture || null } : null;
      sb.auth.getUser().then(({ data }) => { setUser(map(data.user)); setReady(true); }).catch(() => setReady(true));
      const { data } = sb.auth.onAuthStateChange((_e, s) => setUser(map(s?.user)));
      unsub = () => data.subscription.unsubscribe();
    } catch { setReady(true); }
    return () => unsub?.();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); root.current?.querySelector<HTMLElement>("button")?.focus(); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const els = Array.from(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
        const i = els.indexOf(document.activeElement as HTMLElement);
        els[(i + (e.key === "ArrowDown" ? 1 : -1) + els.length) % els.length]?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  async function logout() {
    try { await getSupabaseBrowserClient().auth.signOut(); } catch {}
    window.location.assign("/");
  }

  if (!ready) return <div className="h-9 w-28 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" aria-hidden />;

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="rounded-full px-3 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 dark:text-slate-200">Sign in</Link>
        <Link href="/signup" className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700">Get started</Link>
      </div>
    );
  }

  const initial = user.name.charAt(0).toUpperCase();
  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-indigo-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-xs font-bold text-white">{initial}</span>
        )}
        <span className="hidden max-w-[110px] truncate sm:block">{user.name}</span>
        <svg className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden><path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div role="menu" aria-label="Account menu" className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <div className="py-1">
            {ITEMS.map((i) => (
              <Link key={i.label} href={i.href} role="menuitem" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800">
                {i.label}
              </Link>
            ))}
          </div>
          <button type="button" role="menuitem" onClick={logout} className="block w-full border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 focus:bg-rose-50 focus:outline-none dark:border-slate-800 dark:hover:bg-rose-950/40">
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
