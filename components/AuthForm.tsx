"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "../lib/supabase/browser";
import { nextFromParams } from "../lib/auth/redirect";
import { strength } from "../lib/auth/password";
import { rememberNext } from "../lib/auth/next-cookie";

type Provider = "google" | "azure";
const REMEMBER_KEY = "aurafinds_remember_email";
const LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];
const COLORS = ["bg-[var(--border)]", "bg-[var(--danger)]", "bg-[var(--warning)]", "bg-[var(--electric)]", "bg-[var(--success)]"];

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
    const n = params.get("notice");
    if (n) { setSuccess(n); setShowEmail(true); }
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved && !isSignup) { setEmail(saved); setShowEmail(true); }
    } catch {}
  }, [params, isSignup]);

  const callback = () => {
    rememberNext(next);
    return `${window.location.origin}/auth/callback`;
  };
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
        try { if (remember) localStorage.setItem(REMEMBER_KEY, email); else localStorage.removeItem(REMEMBER_KEY); } catch {}
        window.location.assign(next);
        return;
      }
    } catch (e) {
      setError(friendly(e instanceof Error ? e.message : "Authentication failed."));
    }
    setBusy(null);
  }

  const btn = "btn btn-glass w-full !justify-center";
  const input = "glass-input";
  const q = next !== "/account" ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <main className="grid min-h-screen text-ink lg:grid-cols-2">
      <aside className="brand-hero relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <Link href="/" className="t-section relative">🐾 AuraFinds</Link>
        <div className="relative space-y-8">
          <h2 className="t-hero">Shop smarter with curated finds.</h2>
          <ul className="space-y-5">
            {[["✨", "AI Shopping", "Ask our concierge for exactly what you need."], ["🔎", "Intelligent Product Discovery", "Find the right item faster, with context."], ["✅", "Verified Suppliers", "Every product is vetted before it reaches the shop."], ["🎯", "Smart Recommendations", "Picks tuned to what you love."]].map(([i, t, d]) => (
              <li key={t} className="flex gap-4"><span className="text-2xl" aria-hidden>{i}</span><span><strong className="block">{t}</strong><span className="t-caption !text-white/80">{d}</span></span></li>
            ))}
          </ul>
        </div>
        <div className="relative flex flex-wrap gap-2 text-xs font-semibold">
          {["SSL encrypted", "Stripe secure checkout", "Verified suppliers"].map((b) => <span key={b} className="glass rounded-full px-3 py-2 text-white">{b}</span>)}
        </div>
      </aside>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link href="/" className="t-section mb-6 block lg:hidden">🐾 AuraFinds</Link>
          <div role="tablist" aria-label="Authentication" className="mb-6 grid grid-cols-2 gap-1 rounded-[var(--r-md)] bg-surface p-1">
            <Link role="tab" aria-selected={!isSignup} href={`/login${q}`} className={`t-button min-h-10 rounded-[var(--r-sm)] py-3 text-center ${!isSignup ? "glass text-ink" : "text-muted"}`}>Sign in</Link>
            <Link role="tab" aria-selected={isSignup} href={`/signup${q}`} className={`t-button min-h-10 rounded-[var(--r-sm)] py-3 text-center ${isSignup ? "glass text-ink" : "text-muted"}`}>Create account</Link>
          </div>
          <h1 className="t-page">{isSignup ? "Create your account" : "Welcome back"}</h1>
          <p className="mb-6 mt-1 text-sm text-muted">{isSignup ? "Save favorites, track orders and check out faster." : "Sign in to your AuraFinds account."}</p>

          {error && <p role="alert" className="alert alert-danger mb-4">{error}</p>}
          {success && <p role="status" className="alert alert-success mb-4">{success}</p>}

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
              <div className="text-center"><span className="t-label">or with email</span></div>
              {isSignup && (
                <label className="block t-body font-medium"><span className="mb-1 block">Full name</span>
                  <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} required /></label>
              )}
              <label className="block t-body font-medium"><span className="mb-1 block">Email</span>
                <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={254} required /></label>
              <label className="block t-body font-medium"><span className="mb-1 block">Password</span>
                <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isSignup ? "new-password" : "current-password"} minLength={8} required /></label>
              {isSignup && password && (
                <div aria-live="polite">
                  <div className="h-1.5 overflow-hidden rounded bg-surface"><div className={`h-full transition-all ${COLORS[score]}`} style={{ width: `${(score / 4) * 100}%` }} /></div>
                  <p className="mt-1 text-xs text-muted">Strength: {LABELS[score]}</p>
                </div>
              )}
              {!isSignup && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 t-body"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember my email</label>
                  <Link href="/forgot-password" className="font-semibold text-brand hover:underline">Forgot password?</Link>
                </div>
              )}
              <button disabled={busy !== null} className="btn btn-primary w-full">
                {busy === "email" ? "Please wait..." : isSignup ? "Create account" : "Sign in"}
              </button>
            </form>
          )}
          <p className="mt-6 text-center text-xs text-muted">🔒 Encrypted connection · We never store your card details</p>
        </div>
      </section>
    </main>
  );
}
