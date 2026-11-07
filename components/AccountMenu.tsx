"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "../lib/supabase/browser";

export default function AccountMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    let subscription: ReturnType<
      ReturnType<typeof getSupabaseBrowserClient>["auth"]["onAuthStateChange"]
    >["data"]["subscription"] | undefined;

    try {
      const supabase = getSupabaseBrowserClient();
      supabase.auth.getUser().then(({ data, error }) => {
        if (!active) return;
        if (error && error.name !== "AuthSessionMissingError") {
          toast.error("Could not load your account.");
        }
        setUser(data.user);
      }).catch((error: unknown) => {
        if (!active) return;
        console.error("Could not load Supabase account:", error);
        toast.error("Account features are temporarily unavailable.");
      });

      ({ data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(session?.user ?? null);
        },
      ));
    } catch (error) {
      console.error("Supabase account menu is not configured:", error);
      toast.error("Account features are temporarily unavailable.");
    }

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    try {
      const { error } = await getSupabaseBrowserClient().auth.signOut();
      if (error) {
        toast.error(error.message);
        return;
      }
    } catch (error) {
      console.error("Could not sign out from Supabase:", error);
      toast.error("Account features are temporarily unavailable.");
      return;
    }
    setIsOpen(false);
    toast.success("You have signed out.");
    window.location.assign("/");
  }

  return (
    <div className="account-menu">
      {user ? (
        <>
          <button
            className="account-avatar"
            type="button"
            aria-label="Open account menu"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
          >
            {(user.user_metadata.full_name ?? user.email ?? "P")
              .toString()
              .trim()
              .charAt(0)
              .toUpperCase()}
          </button>
          {isOpen && (
            <div className="account-dropdown">
              <p className="account-dropdown-email">{user.email}</p>
              <Link href="/account" onClick={() => setIsOpen(false)}>
                My account
              </Link>
              <Link href="/account/orders" onClick={() => setIsOpen(false)}>
                My orders
              </Link>
              <button type="button" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          )}
        </>
      ) : (
        <Link className="account-login-link" href="/login">
          Sign in
        </Link>
      )}
    </div>
  );
}
