"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { strength } from "../../lib/auth/password";
import { btnDanger, btnGhost, btnPrimary, inputCls } from "./ui";
import {
  deleteAccount, saveAddress, saveAvatarUrl, saveNotifications, updateProfile, type Result,
} from "../../app/account/actions";

function Msg({ r }: { r: Result | null }) {
  if (!r) return null;
  return (
    <p role="status" className={`alert ${r.ok ? "alert-success" : "alert-danger"}`}>
      {r.message}
    </p>
  );
}
const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block text-sm font-medium text-ink">
    <span className="mb-1 block">{label}</span>
    {children}
  </label>
);

export function ProfileForm({ userId, name, email, phone, avatar }: { userId: string; name: string; email: string; phone: string; avatar: string | null }) {
  const [res, action, pending] = useActionState(updateProfile, null);
  const [photo, setPhoto] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(avatar);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setPhoto({ ok: false, message: "Use a JPG, PNG or WebP image." });
    if (file.size > 2 * 1024 * 1024) return setPhoto({ ok: false, message: "Image must be under 2 MB." });
    setBusy(true);
    try {
      const sb = getSupabaseBrowserClient();
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await sb.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data } = sb.storage.from("avatars").getPublicUrl(path);
      const r = await saveAvatarUrl(data.publicUrl);
      if (r.ok) setPreview(data.publicUrl);
      setPhoto(r);
    } catch (e) {
      setPhoto({ ok: false, message: e instanceof Error ? e.message : "Upload failed." });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Profile photo" className="h-20 w-20 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full badge-primary t-page">{(name || email).charAt(0).toUpperCase()}</span>
        )}
        <div className="space-y-2">
          <label className={`${btnGhost} cursor-pointer`}>
            {busy ? "Uploading..." : "Upload photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
          </label>
          <p className="text-xs text-muted">JPG, PNG or WebP, up to 2 MB.</p>
        </div>
      </div>
      <Msg r={photo} />
      <form action={action} className="space-y-4">
        <Field label="Full name"><input name="full_name" defaultValue={name} required maxLength={100} className={inputCls} autoComplete="name" /></Field>
        <Field label="Email"><input name="email" type="email" defaultValue={email} required className={inputCls} autoComplete="email" /></Field>
        <Field label="Phone"><input name="phone" type="tel" defaultValue={phone} className={inputCls} autoComplete="tel" /></Field>
        <Msg r={res} />
        <button className={btnPrimary} disabled={pending}>{pending ? "Saving..." : "Save changes"}</button>
      </form>
    </div>
  );
}

export type Addr = { id: string; label: string; full_name: string; line1: string; line2: string | null; city: string; region: string; postal_code: string; country: string; phone: string | null; is_default: boolean };

export function AddressForm({ addr, onDone }: { addr?: Addr; onDone?: () => void }) {
  const [res, action, pending] = useActionState(async (p: Result | null, f: FormData) => {
    const r = await saveAddress(p, f);
    if (r.ok) onDone?.();
    return r;
  }, null);
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2">
      {addr && <input type="hidden" name="id" value={addr.id} />}
      <Field label="Label"><input name="label" defaultValue={addr?.label ?? "Home"} className={inputCls} /></Field>
      <Field label="Full name *"><input name="full_name" defaultValue={addr?.full_name} required className={inputCls} autoComplete="name" /></Field>
      <div className="sm:col-span-2"><Field label="Address line 1 *"><input name="line1" defaultValue={addr?.line1} required className={inputCls} autoComplete="address-line1" /></Field></div>
      <div className="sm:col-span-2"><Field label="Address line 2"><input name="line2" defaultValue={addr?.line2 ?? ""} className={inputCls} autoComplete="address-line2" /></Field></div>
      <Field label="City *"><input name="city" defaultValue={addr?.city} required className={inputCls} autoComplete="address-level2" /></Field>
      <Field label="State / Region *"><input name="region" defaultValue={addr?.region} required className={inputCls} autoComplete="address-level1" /></Field>
      <Field label="Postal code *"><input name="postal_code" defaultValue={addr?.postal_code} required className={inputCls} autoComplete="postal-code" /></Field>
      <Field label="Country (2-letter)"><input name="country" defaultValue={addr?.country ?? "US"} maxLength={2} className={inputCls} autoComplete="country" /></Field>
      <Field label="Phone"><input name="phone" defaultValue={addr?.phone ?? ""} className={inputCls} autoComplete="tel" /></Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="is_default" defaultChecked={addr?.is_default} /> Set as default</label>
      <div className="sm:col-span-2 space-y-3"><Msg r={res} /><button className={btnPrimary} disabled={pending}>{pending ? "Saving..." : "Save address"}</button></div>
    </form>
  );
}

export function NotificationForm({ prefs }: { prefs: { order_updates: boolean; promotions: boolean; price_drops: boolean } }) {
  const [res, action, pending] = useActionState(saveNotifications, null);
  const rows: [keyof typeof prefs, string, string][] = [
    ["order_updates", "Order updates", "Shipping and delivery notifications."],
    ["promotions", "Promotions", "Deals and new arrivals."],
    ["price_drops", "Price drops", "When saved items go on sale."],
  ];
  return (
    <form action={action} className="space-y-4">
      {rows.map(([k, t, d]) => (
        <label key={k} className="flex items-start gap-3">
          <input type="checkbox" name={k} defaultChecked={prefs[k]} className="mt-1 h-4 w-4" />
          <span><span className="block text-sm font-semibold">{t}</span><span className="text-xs text-muted">{d}</span></span>
        </label>
      ))}
      <Msg r={res} />
      <button className={btnPrimary} disabled={pending}>{pending ? "Saving..." : "Save preferences"}</button>
    </form>
  );
}

export function SecurityForms() {
  const [pw, setPw] = useState("");
  const [pwRes, setPwRes] = useState<Result | null>(null);
  const [sessRes, setSessRes] = useState<Result | null>(null);
  const [del, delAction, delPending] = useActionState(deleteAccount, null);

  async function change(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setPwRes({ ok: false, message: "Use at least 8 characters." });
    const { error } = await getSupabaseBrowserClient().auth.updateUser({ password: pw });
    setPwRes(error ? { ok: false, message: error.message } : { ok: true, message: "Password changed." });
    if (!error) setPw("");
  }
  async function others() {
    const { error } = await getSupabaseBrowserClient().auth.signOut({ scope: "others" });
    setSessRes(error ? { ok: false, message: error.message } : { ok: true, message: "Signed out of all other devices." });
  }
  if (del?.ok) { if (typeof window !== "undefined") window.location.assign("/"); }

  return (
    <div className="space-y-6">
      <form onSubmit={change} className="space-y-3">
        <Field label="New password"><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" className={inputCls} /></Field>
        <div className="h-1.5 rounded bg-surface"><div className={`h-full rounded transition-all ${["w-0","w-1/4 bg-[var(--danger)]","w-2/4 bg-[var(--warning)]","w-3/4 bg-[var(--electric)]","w-full bg-[var(--success)]"][strength(pw)]}`} /></div>
        <Msg r={pwRes} />
        <button className={btnPrimary}>Change password</button>
      </form>
      <div className="space-y-3 border-t border-line pt-6">
        <p className="text-sm text-muted">Sign out everywhere except this device.</p>
        <Msg r={sessRes} />
        <button type="button" onClick={others} className={btnGhost}>Sign out other sessions</button>
      </div>
      <form action={delAction} className="space-y-3 border-t border-line pt-6">
        <p className="t-card text-[var(--danger)]">Delete account</p>
        <p className="text-xs text-muted">Permanently removes your login, profile, addresses and wishlist. Past orders are kept for our records without a link to you. This cannot be undone.</p>
        <input name="confirm" placeholder="Type DELETE" className={inputCls} autoComplete="off" />
        <Msg r={del} />
        <button className={btnDanger} disabled={delPending}>{delPending ? "Deleting..." : "Delete my account"}</button>
      </form>
    </div>
  );
}
