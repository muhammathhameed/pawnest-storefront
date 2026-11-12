"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "../lib/supabase/browser";
import { nextFromParams } from "../lib/auth/redirect";
import { strength } from "../lib/auth/password";

type Provider = "google" | "azure";
const REMEMBER_KEY = "aurafinds_remember_email";
const LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];
const COLORS = ["bg-slate-300", "bg-rose-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500"];

function friendly(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Incorrect email or password.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. Check your inbox for the link.";
  if (m.includes("already registered")) return "An account with this email already exists. Try signing in.";
  if (m.includes("rate limit")) return "Too many attempts. Please wait a few minutes and try again.";
  return message;
}

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  const params = useSearchParams();
  const next = nextFromParams(new URLSearchParams(params.toString()));
  const [showEmail, setShowEmail] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const e = params.get("error");
    if (e) setError(friendly(e));
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved && !isSignup) { setEmail(saved); setShowEmail(true); }
    } catch {}
  }, [params, isSignup]);

  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const score = strength(password);

  async function oauth(provider: Provider) {
    setBusy(provider); setError("");
    try {
      const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callback(),
          scopes: provider === "azure" ? "openid profile email" : undefined,
          queryParams: provider === "google" ? { access_type: "offline", prompt: "select_account" } : undefined,
        },
      });
      if (error) throw error;
    } catch (e) {
      setError(friendly(e instanceof Error ? e.message : "Could not start sign-in."));
      setBusy(null);
    }
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setError(""); setSuccess("");
    if (isSignup && name.trim().length < 2) return setError("Please enter your name.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (isSignup && score < 2) return setError("Choose a stronger password (mix letters, numbers or symbols).");
    setBusy("email");
    try {
      const sb = getSupabaseBrowserClient();
      if (isSignup) {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: callback(), data: { full_name: name.trim() } } });
        if (error) throw error;
        if (data.session) { window.location.assign(next); return; }
        // Supabase returns an empty identities list for an already-registered email.
        if (data.user && data.user.identities?.length === 0) throw new Error("already registered");
        setSuccess("Account created! Check your email to confirm your address, then sign in.");
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        try { remember ? localStorage.setItem(REMEMBER_KEY, email) : localStorage.removeItem(REMEMBER_KEY); } catch {}
        window.location.assign(next);
        return;
      }
    } catch (e) {
      setError(friendly(e instanceof Error ? e.message : "Authentication failed."));
    }
    setBusy(null);
  }

  const btn = "flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800";
  const input = "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
  const q = next !== "/account" ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <main className="grid min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <Link href="/" className="relative text-2xl font-black tracking-tight">🐾 AuraFinds</Link>
        <div className="relative space-y-8">
          <h2 className="text-4xl font-black leading-tight">Shop smarter with curated finds.</h2>
          <ul className="space-y-5">
            {[["✨", "AI Powered Shopping", "Ask our concierge for exactly what you need."], ["🎯", "Smart Recommendations", "Picks tuned to what you love."], ["🔒", "Secure Shopping", "Payments handled by Stripe. Your data stays yours."]].map(([i, t, d]) => (
              <li key={t} className="flex gap-4"><span className="text-2xl" aria-hidden>{i}</span><span><strong className="block">{t}</strong><span className="text-sm text-white/75">{d}</span></span></li>
            ))}
          </ul>
        </div>
        <div className="relative flex flex-wrap gap-2 text-xs font-semibold">
          {["SSL encrypted", "Stripe secure checkout", "Easy returns"].map((b) => <span key={b} className="rounded-full bg-white/15 px-3 py-1.5">{b}</span>)}
        </div>
      </aside>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-6 block text-xl font-black lg:hidden">🐾 AuraFinds</Link>
          <div role="tablist" aria-label="Authentication" className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold dark:bg-slate-900">
            <Link role="tab" aria-selected={!isSignup} href={`/login${q}`} className={`rounded-lg py-2 text-center ${!isSignup ? "bg-white shadow dark:bg-slate-800" : "text-slate-500"}`}>Sign in</Link>
            <Link role="tab" aria-selected={isSignup} href={`/signup${q}`} className={`rounded-lg py-2 text-center ${isSignup ? "bg-white shadow dark:bg-slate-800" : "text-slate-500"}`}>Create account</Link>
          </div>
          <h1 className="text-2xl font-black tracking-tight">{isSignup ? "Create your account" : "Welcome back"}</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">{isSignup ? "Save favorites, track orders and check out faster." : "Sign in to your AuraFinds account."}</p>

          {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
          {success && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{success}</p>}

          <div className="space-y-3">
            <button type="button" className={btn} disabled={busy !== null} onClick={() => oauth("google")}>
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M23.7 12.3c0-.7-.1-1.4-.2-2.1H12v4.5h6.6a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.6-5.2 3.6-9.1z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.8-2.1-6.7-5H1.2v3.1C3.2 21.3 7.3 24 12 24z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.2a12 12 0 0 0 0 10.8l4.1-3.1z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.2 2.7 1.2 6.6l4.1 3.1c.9-2.9 3.6-4.9 6.7-4.9z"/></svg>
              {busy === "google" ? "Redirecting to Google..." : "Continue with Google"}
            </button>
            <button type="button" className={btn} disabled={busy !== null} onClick={() => oauth("azure")}>
              <svg className="h-5 w-5" viewBox="0 0 23 23" aria-hidden><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
              {busy === "azure" ? "Redirecting to Microsoft..." : "Continue with Microsoft"}
            </button>
            {!showEmail && <button type="button" className={btn} onClick={() => setShowEmail(true)}>✉️ Continue with Email</button>}
          </div>

          {showEmail && (
            <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
              <div className="relative text-center text-xs uppercase tracking-wide text-slate-400"><span className="bg-white px-2 dark:bg-slate-950">or with email</span></div>
              {isSignup && (
                <label className="block text-sm font-medium"><span className="mb-1 block">Full name</span>
                  <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} required /></label>
              )}
              <label className="block text-sm font-medium"><span className="mb-1 block">Email</span>
                <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={254} required /></label>
              <label className="block text-sm font-medium"><span className="mb-1 block">Password</span>
                <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isSignup ? "new-password" : "current-password"} minLength={8} required /></label>
              {isSignup && password && (
                <div aria-live="polite">
                  <div className="h-1.5 overflow-hidden rounded bg-slate-200 dark:bg-slate-800"><div className={`h-full transition-all ${COLORS[score]}`} style={{ width: `${(score / 4) * 100}%` }} /></div>
                  <p className="mt-1 text-xs text-slate-500">Strength: {LABELS[score]}</p>
                </div>
              )}
              {!isSignup && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember my email</label>
                  <Link href="/forgot-password" className="font-semibold text-indigo-600 hover:underline">Forgot password?</Link>
                </div>
              )}
              <button disabled={busy !== null} className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60">
                {busy === "email" ? "Please wait..." : isSignup ? "Create account" : "Sign in"}
              </button>
            </form>
          )}
          <p className="mt-6 text-center text-xs text-slate-500">🔒 Encrypted connection · We never store your card details</p>
        </div>
      </section>
    </main>
  );
}
