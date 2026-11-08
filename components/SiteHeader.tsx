"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountMenu from "./AccountMenu";
import CartButton from "./CartButton";
import { catalogCategories } from "../lib/catalog";

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <div className="site-masthead">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="AuraFinds home">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>
            <strong>AuraFinds</strong>
            <small>CURATED VIRAL FINDS ACROSS EVERY CATEGORY</small>
          </span>
        </Link>
        <nav className="header-actions" aria-label="Main navigation">
          <AccountMenu />
          <Link className="header-cart-link" href="/cart">
            View cart
          </Link>
          <CartButton />
        </nav>
      </header>
      <nav className="category-nav" aria-label="Shop categories">
        <Link
          className={pathname === "/" ? "active" : undefined}
          href="/"
          aria-current={pathname === "/" ? "page" : undefined}
        >
          All finds
        </Link>
        {catalogCategories.map((category) => {
          const href = `/categories/${category.slug}`;
          const active = pathname === href;
          return (
            <Link
              key={category.slug}
              className={active ? "active" : undefined}
              href={href}
              aria-current={active ? "page" : undefined}
            >
              {category.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
