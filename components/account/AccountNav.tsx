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
    <nav aria-label="Account" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {NAV.map(([href, label]) => {
        const active = href === "/account" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
