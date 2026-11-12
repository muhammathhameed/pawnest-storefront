"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  ["/account", "Overview"],
  ["/account/orders", "Orders"],
  ["/account/wishlist", "Wishlist"],
  ["/account/addresses", "Addresses"],
  ["/account/profile", "Profile"],
  ["/account/notifications", "Notifications"],
  ["/account/security", "Security"],
] as const;

export default function AccountNav() {
  const path = usePathname();
  return (
    <nav aria-label="Account" className="glass-sidebar flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {NAV.map(([href, label]) => {
        const active = href === "/account" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`t-button whitespace-nowrap rounded-[var(--r-md)] px-4 py-3 transition ${active ? "btn-primary text-[var(--on-primary)] shadow" : "text-muted hover:bg-[color-mix(in_srgb,var(--text)_7%,transparent)] hover:text-ink"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
