"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "../../lib/supabase/server";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";

export type Result = { ok: boolean; message: string };
const fail = (message: string): Result => ({ ok: false, message });
const ok = (message: string): Result => ({ ok: true, message });

async function me() {
  const sb = getSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  return { sb, user };
}
const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);

export async function updateProfile(_: Result | null, f: FormData): Promise<Result> {
  const { sb, user } = await me();
  if (!user) return fail("Please sign in again.");
  const full_name = str(f, "full_name", 100);
  const phone = str(f, "phone", 30);
  if (!full_name) return fail("Name is required.");
  if (phone && !/^[+()\d\s.-]{6,30}$/.test(phone)) return fail("Enter a valid phone number.");
  const { error } = await sb.from("profiles").update({ full_name, phone: phone || null, updated_at: new Date().toISOString() }).eq("id", user.id);
  if (error) return fail(error.message);
  await sb.auth.updateUser({ data: { full_name } });
  const email = str(f, "email", 254).toLowerCase();
  if (email && email !== (user.email ?? "").toLowerCase()) {
    const { error: e2 } = await sb.auth.updateUser({ email });
    if (e2) return fail(e2.message);
    revalidatePath("/account", "layout");
    return ok("Saved. Confirm the change from the link we emailed to your new address.");
  }
  revalidatePath("/account", "layout");
  return ok("Profile updated.");
}

export async function saveAvatarUrl(url: string): Promise<Result> {
  const { sb, user } = await me();
  if (!user) return fail("Please sign in again.");
  // Only accept URLs inside this user's folder of the avatars bucket.
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!url.startsWith(`${base}/storage/v1/object/public/avatars/${user.id}/`)) return fail("Invalid avatar.");
  const { error } = await sb.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) return fail(error.message);
  await sb.auth.updateUser({ data: { avatar_url: url } });
  revalidatePath("/account", "layout");
  return ok("Photo updated.");
}

export async function saveAddress(_: Result | null, f: FormData): Promise<Result> {
  const { sb, user } = await me();
  if (!user) return fail("Please sign in again.");
  const row = {
    label: str(f, "label", 30) || "Home",
    full_name: str(f, "full_name", 100),
    line1: str(f, "line1"), line2: str(f, "line2") || null,
    city: str(f, "city", 100), region: str(f, "region", 100),
    postal_code: str(f, "postal_code", 20), country: str(f, "country", 2).toUpperCase() || "US",
    phone: str(f, "phone", 30) || null,
  };
  if (!row.full_name || !row.line1 || !row.city || !row.region || !row.postal_code) return fail("Fill in all required fields.");
  const wantDefault = f.get("is_default") === "on";
  const id = str(f, "id", 40);
  if (wantDefault) await sb.from("customer_addresses").update({ is_default: false }).eq("user_id", user.id);
  const { count } = await sb.from("customer_addresses").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  const is_default = wantDefault || (!id && (count ?? 0) === 0);
  const { error } = id
    ? await sb.from("customer_addresses").update({ ...row, is_default: wantDefault ? true : undefined }).eq("id", id).eq("user_id", user.id)
    : await sb.from("customer_addresses").insert({ ...row, is_default, user_id: user.id });
  if (error) return fail(error.message);
  revalidatePath("/account/addresses");
  return ok("Address saved.");
}

export async function deleteAddress(id: string) {
  const { sb, user } = await me();
  if (!user) return;
  await sb.from("customer_addresses").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/account/addresses");
}

export async function setDefaultAddress(id: string) {
  const { sb, user } = await me();
  if (!user) return;
  await sb.from("customer_addresses").update({ is_default: false }).eq("user_id", user.id);
  await sb.from("customer_addresses").update({ is_default: true }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/account/addresses");
}

export async function removeWishlist(productId: string) {
  const { sb, user } = await me();
  if (!user) return;
  await sb.from("wishlist_items").delete().eq("user_id", user.id).eq("product_id", productId);
  revalidatePath("/account/wishlist");
}

export async function saveNotifications(_: Result | null, f: FormData): Promise<Result> {
  const { sb, user } = await me();
  if (!user) return fail("Please sign in again.");
  const notification_prefs = {
    order_updates: f.get("order_updates") === "on",
    promotions: f.get("promotions") === "on",
    price_drops: f.get("price_drops") === "on",
  };
  const { error } = await sb.from("profiles").update({ notification_prefs }).eq("id", user.id);
  return error ? fail(error.message) : ok("Preferences saved.");
}

export async function deleteAccount(_: Result | null, f: FormData): Promise<Result> {
  const { sb, user } = await me();
  if (!user) return fail("Please sign in again.");
  if (str(f, "confirm", 10) !== "DELETE") return fail('Type DELETE to confirm.');
  const { error } = await getSupabaseAdmin().auth.admin.deleteUser(user.id);
  if (error) return fail(error.message);
  await sb.auth.signOut();
  return ok("Account deleted.");
}
