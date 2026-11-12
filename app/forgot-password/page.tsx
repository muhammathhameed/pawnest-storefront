"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) throw error;
      // Same message either way: do not reveal whether an account exists.
      setMsg("If an account exists for that email, a reset link is on its way.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page min-h-screen grid place-items-center">
      <section className="auth-card w-full rounded-2xl bg-white">
        <h1>Reset your password</h1>
        <form className="auth-form" onSubmit={submit}>
          <label>
            Email address
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="primary-button auth-submit" disabled={busy}>
            {busy ? "Please wait..." : "Send reset link"}
          </button>
        </form>
        {msg && <p className="auth-message" role="status">{msg}</p>}
        <Link className="auth-back-link" href="/login">Back to sign in</Link>
      </section>
    </main>
  );
}
