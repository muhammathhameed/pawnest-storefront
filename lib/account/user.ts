import "server-only";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "../supabase/server";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: string;
  created_at: string;
  notification_prefs: { order_updates: boolean; promotions: boolean; price_drops: boolean } | null;
};

/** Returns the signed-in user + profile, or redirects to /login. Always validates the JWT via getUser(). */
export async function requireCustomer(next = "/account") {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const profile = (data as Profile | null) ?? null;
  const displayName =
    profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "there";
  return { supabase, user, profile, displayName: String(displayName) };
}

export function customerTier(orderCount: number) {
  if (orderCount >= 10) return "Platinum";
  if (orderCount >= 5) return "Gold";
  if (orderCount >= 2) return "Silver";
  return "Member";
}

export function money(cents: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents ?? 0) / 100);
}
