'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AccountDropdown from './account/AccountDropdown';
import CartButton from './CartButton';

type Suggestion = { id?: string; title: string; price?: string; reason?: string; [k: string]: any };

const NAV = [
  { href: '/#catalog', label: 'Shop' },
  { href: '/account/orders', label: 'Orders' },
  { href: 'mailto:support@aurafinds.com', label: 'Support' },
];

const Icon = ({ d, label }: { d: string; label: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" role="img" aria-label={label}><path d={d} /></svg>
);

/** The single storefront header (glass navigation). Used by every page. */
export default function SiteHeader({ onSelectSuggestion }: { onSelectSuggestion?: (item: Suggestion) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Suggestion[] | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setResults(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setResults(null); setMenuOpen(false); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, []);

  function onChange(q: string) {
    setQuery(q);
    clearTimeout(timer.current);
    if (q.trim().length < 3) { setResults(null); return; }
    setLoading(true);
    // Debounced so we do not hit the concierge on every keystroke.
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/concierge?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        setResults(Array.isArray(data.recommendations) ? data.recommendations : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function pick(item: Suggestion) {
    setResults(null);
    setQuery('');
    if (onSelectSuggestion) onSelectSuggestion(item);
    else if (item.id) router.push(`/products/${item.id}`);
  }

  const iconLink = 'btn btn-icon btn-glass';

  const search = (
    <div className="relative w-full" ref={box}>
      <div className="glass-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-muted"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          type="search"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ask the AI concierge or search products…"
          aria-label="Search products with AI"
          aria-expanded={results !== null}
          autoComplete="off"
        />
        {loading && <span className="t-caption" role="status">Searching…</span>}
      </div>
      {results && (
        <div className="glass-menu absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto p-2" role="listbox" aria-label="Search suggestions">
          <p className="t-label px-3 py-2">AI recommendations</p>
          {results.length === 0 ? (
            <p className="t-caption px-3 py-4">No matches yet. Try describing what you need.</p>
          ) : (
            results.map((r, i) => (
              <button key={r.id ?? i} type="button" role="option" aria-selected="false" onClick={() => pick(r)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]">
                <span className="min-w-0"><span className="t-card block truncate">{r.title}</span>{r.reason && <span className="t-caption block truncate">{r.reason}</span>}</span>
                {r.price && <span className="t-card text-brand">{r.price}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );

  return (
    <header className="glass-nav">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="AuraFinds home">
          <span className="flex h-9 w-9 items-center justify-center rounded-[var(--r-md)] bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] text-base font-extrabold text-[var(--on-primary)] shadow-[var(--shadow-sm)]">A</span>
          <span className="t-section hidden sm:block">AuraFinds</span>
        </Link>

        <nav aria-label="Primary" className="ml-2 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.label} href={n.href} className="rounded-full px-4 py-2 t-button text-muted transition hover:bg-[color-mix(in_srgb,var(--text)_7%,transparent)] hover:text-ink">{n.label}</Link>
          ))}
        </nav>

        <div className="mx-auto hidden w-full max-w-xl md:block">{search}</div>
        <div className="ml-auto md:hidden" />

        <div className="flex shrink-0 items-center gap-2">
          <Link href="/account/wishlist" className={`${iconLink} hidden sm:inline-flex`} aria-label="Wishlist"><Icon label="Wishlist" d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 22l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" /></Link>
          <Link href="/account/notifications" className={`${iconLink} hidden sm:inline-flex`} aria-label="Notification settings"><Icon label="Notifications" d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></Link>
          <CartButton />
          <AccountDropdown />
          <button type="button" className={`${iconLink} lg:hidden`} aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
            <Icon label="Menu" d={menuOpen ? 'M6 6l12 12M18 6 6 18' : 'M4 7h16M4 12h16M4 17h16'} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="slide-up border-t border-line px-4 pb-4 pt-3 lg:hidden">
          <div className="mb-3 md:hidden">{search}</div>
          <nav aria-label="Mobile" className="grid gap-1">
            {[...NAV, { href: '/account/wishlist', label: 'Wishlist' }, { href: '/account/notifications', label: 'Notifications' }].map((n) => (
              <Link key={n.label} href={n.href} className="rounded-xl px-4 py-3 t-body hover:bg-[color-mix(in_srgb,var(--text)_7%,transparent)]">{n.label}</Link>
            ))}
          </nav>
        </div>
      )}
      <div className="px-4 pb-3 md:hidden">{!menuOpen && search}</div>
    </header>
  );
}
