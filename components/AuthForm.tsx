"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "../lib/supabase/browser";
import { nextFromParams } from "../lib/auth/redirect";
import OAuthButtons from "./OAuthButtons";

interface AuthFormProps {
  mode: "login" | "signup";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();
  const redirectPath = nextFromParams(new URLSearchParams(searchParams.toString()));

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setMessage(err);
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`;

      const { data, error } = isSignup
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo,
              data: { full_name: name.trim() },
            },
          })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      if (isSignup && data && "session" in data && data.session) {
        // Email confirmation disabled in Supabase: user is already signed in.
        window.location.assign(redirectPath);
        return;
      }

      if (isSignup) {
        const confirmationMessage =
          "Account created. Check your email to confirm your address.";
        setMessage(confirmationMessage);
        toast.success(confirmationMessage);
        return;
      }

      toast.success("Welcome back!");
      window.location.assign(redirectPath);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Authentication failed.";
      setMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMagicLink() {
    setMessage("");
    if (!email.trim()) {
      setMessage("Enter your email address first.");
      toast.error("Enter your email address first.");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
        },
      });
      if (error) throw error;

      const confirmationMessage = "Magic link sent. Check your inbox.";
      setMessage(confirmationMessage);
      toast.success(confirmationMessage);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Could not send magic link.";
      setMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page min-h-screen grid place-items-center">
      <section className="auth-card w-full rounded-2xl bg-white">
        <Link className="brand auth-brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            🐾
          </span>
          <span>
            <strong>AuraFinds</strong>
            <small>CURATED FINDS, EVERY DAY</small>
          </span>
        </Link>
        <p className="eyebrow">{isSignup ? "JOIN THE AURAFINDS COMMUNITY" : "WELCOME BACK"}</p>
        <h1>{isSignup ? "Create your account" : "Sign in to AuraFinds"}</h1>
        <p className="auth-intro">
          {isSignup
            ? "Save your favorites and keep track of every order."
            : "Your favorite finds and order history are waiting."}
        </p>

        <OAuthButtons next={redirectPath} onError={(m) => { setMessage(m); toast.error(m); }} />
        <div className="auth-divider"><span>or use email</span></div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignup && (
            <label>
              Name
              <input
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
              />
            </label>
          )}
          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {isSignup && (
              <span className="field-hint">Use at least 8 characters.</span>
            )}
          </label>
          {!isSignup && (
            <Link className="auth-switch" href="/forgot-password">
              Forgot your password?
            </Link>
          )}
          <button className="primary-button auth-submit" disabled={isLoading}>
            {isLoading
              ? "Please wait..."
              : isSignup
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>
        <button
          className="secondary-button auth-submit"
          type="button"
          disabled={isLoading}
          onClick={handleMagicLink}
        >
          Email me a magic link
        </button>
        {message && (
          <p className="auth-message" role="status">
            {message}
          </p>
        )}
        <p className="auth-switch">
          {isSignup ? "Already have an account?" : "New to AuraFinds?"}{" "}
          <Link href={`${isSignup ? "/login" : "/signup"}?next=${encodeURIComponent(redirectPath)}`}>
            {isSignup ? "Sign in" : "Create an account"}
          </Link>
        </p>
        <Link className="auth-back-link" href="/">
          Back to the shop
        </Link>
      </section>
    </main>
  );
}
