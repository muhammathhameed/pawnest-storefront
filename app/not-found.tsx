import Link from "next/link";
import SiteHeader from "../components/SiteHeader";

export default function NotFound() {
  return (
    <main className="store-shell">
      <SiteHeader />
      <section className="not-found-page">
        <span aria-hidden="true">🐾</span>
        <p className="eyebrow">A LITTLE OFF THE TRAIL</p>
        <h1>We can&apos;t find that page.</h1>
        <p>The page may have moved, or the link may have had a small wobble.</p>
        <Link className="primary-button result-link" href="/">
          Back to the shop
        </Link>
      </section>
    </main>
  );
}
