import Link from "next/link";
import AccountMenu from "./AccountMenu";
import CartButton from "./CartButton";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="PawNest Store home">
        <span className="brand-mark" aria-hidden="true">
          🐾
        </span>
        <span>
          <strong>PawNest</strong>
          <small>HAPPY PETS, HAPPY HOMES</small>
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
  );
}
