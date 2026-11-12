"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    getSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => setHasSession(!!data.user))
      .catch(() => setHasSession(false));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setMsg("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    setMsg("");
    const { error } = await getSupabaseBrowserClient().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg("Password updated. Redirecting...");
    window.location.assign("/account");
  }

  return (
    <main className="auth-page min-h-screen grid place-items-center">
      <section className="auth-card">
        <h1>Choose a new password</h1>
        {hasSession === false ? (
          <p className="auth-message">
            This reset link is invalid or expired. <Link href="/forgot-password">Request a new one</Link>.
          </p>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <label>
              New password
              <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <button className="primary-button auth-submit" disabled={busy || hasSession === null}>
              {busy ? "Please wait..." : "Update password"}
            </button>
          </form>
        )}
        {msg && <p className="auth-message" role="status">{msg}</p>}
      </section>
    </main>
  );
}
