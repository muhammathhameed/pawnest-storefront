"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase/browser";

type Provider = "google" | "azure";

export default function OAuthButtons({
  next,
  onError,
}: {
  next: string;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState<Provider | null>(null);

  async function start(provider: Provider) {
    setBusy(provider);
    try {
      const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          // Microsoft only returns an email claim when "email" is requested.
          scopes: provider === "azure" ? "openid profile email" : undefined,
          queryParams: provider === "google" ? { access_type: "offline", prompt: "select_account" } : undefined,
        },
      });
      if (error) throw error;
      // On success the browser is navigating to the provider.
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not start sign-in.");
      setBusy(null);
    }
  }

  return (
    <div className="auth-oauth" style={{ display: "grid", gap: 8 }}>
      <button className="secondary-button auth-submit" type="button" disabled={busy !== null} onClick={() => start("google")}>
        {busy === "google" ? "Redirecting..." : "Continue with Google"}
      </button>
      <button className="secondary-button auth-submit" type="button" disabled={busy !== null} onClick={() => start("azure")}>
        {busy === "azure" ? "Redirecting..." : "Continue with Microsoft"}
      </button>
    </div>
  );
}
