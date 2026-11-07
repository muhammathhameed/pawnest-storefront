"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "../lib/supabase/browser";

interface AuthFormProps {
  mode: "login" | "signup";
}

function getRedirectPath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/account";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const redirectPath = getRedirectPath(
        new URLSearchParams(window.location.search).get("redirect"),
      );
      const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`;

      const { error } = isSignup
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
      const redirectPath = getRedirectPath(
        new URLSearchParams(window.location.search).get("redirect"),
      );
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
            <strong>PawNest</strong>
            <small>HAPPY PETS, HAPPY HOMES</small>
          </span>
        </Link>
        <p className="eyebrow">{isSignup ? "JOIN THE PAWNEST FAMILY" : "WELCOME BACK"}</p>
        <h1>{isSignup ? "Create your account" : "Sign in to PawNest"}</h1>
        <p className="auth-intro">
          {isSignup
            ? "Save your favorites and keep track of every order."
            : "Your favorite finds and order history are waiting."}
        </p>

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
          {isSignup ? "Already have an account?" : "New to PawNest?"}{" "}
          <Link href={isSignup ? "/login" : "/signup"}>
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
