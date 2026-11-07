"use client";

import { useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    toast.error("We hit a snag while loading this page.");
  }, []);

  return (
    <main className="checkout-result-shell">
      <section className="checkout-result-card">
        <span className="checkout-result-icon" aria-hidden="true">
          🐾
        </span>
        <p className="eyebrow">PAWNEST CHECKOUT</p>
        <h1>Something went wrong.</h1>
        <p>
          {process.env.NODE_ENV === "development"
            ? error.message
            : "Please try again, or head back to the shop."}
        </p>
        <button className="primary-button result-link" onClick={reset}>
          Try again
        </button>
        <Link className="auth-back-link" href="/">
          Back to the shop
        </Link>
      </section>
    </main>
  );
}
