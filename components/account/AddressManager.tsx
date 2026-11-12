"use client";

import { useState, useTransition } from "react";
import { AddressForm, type Addr } from "./Forms";
import { Card, Empty, btnGhost, btnPrimary } from "./ui";
import { deleteAddress, setDefaultAddress } from "../../app/account/actions";

export default function AddressManager({ addresses }: { addresses: Addr[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      {editing === "new" ? (
        <Card title="Add address"><AddressForm onDone={() => setEditing(null)} /><button className={`${btnGhost} mt-3`} onClick={() => setEditing(null)}>Cancel</button></Card>
      ) : (
        <button className={btnPrimary} onClick={() => setEditing("new")}>+ Add address</button>
      )}
      {addresses.length === 0 && editing !== "new" && <Empty text="No saved addresses yet." />}
      <div className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) =>
          editing === a.id ? (
            <Card key={a.id} title="Edit address"><AddressForm addr={a} onDone={() => setEditing(null)} /><button className={`${btnGhost} mt-3`} onClick={() => setEditing(null)}>Cancel</button></Card>
          ) : (
            <Card key={a.id}>
              <div className="mb-1 flex items-center gap-2">
                <span className="font-bold">{a.label}</span>
                {a.is_default && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">Default</span>}
              </div>
              <address className="text-sm not-italic leading-relaxed text-slate-600 dark:text-slate-300">
                {a.full_name}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.region} {a.postal_code}<br />{a.country}{a.phone ? ` · ${a.phone}` : ""}
              </address>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className={btnGhost} onClick={() => setEditing(a.id)}>Edit</button>
                {!a.is_default && <button className={btnGhost} disabled={pending} onClick={() => start(() => setDefaultAddress(a.id))}>Set default</button>}
                <button className={btnGhost} disabled={pending} onClick={() => { if (confirm("Delete this address?")) start(() => deleteAddress(a.id)); }}>Delete</button>
              </div>
            </Card>
          ),
        )}
      </div>
    </div>
  );
}
