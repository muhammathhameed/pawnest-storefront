import Link from "next/link";
import { requireCustomer } from "../../../lib/account/user";
import { Card, Empty, PageTitle, btnGhost } from "../../../components/account/ui";
import { removeWishlist } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wishlist | AuraFinds" };

type P = { id: string; name: string; price: number; image_url: string | null };

export default async function WishlistPage() {
  const { supabase, user } = await requireCustomer("/account/wishlist");
  const { data: rows } = await supabase.from("wishlist_items").select("product_id").eq("user_id", user.id);
  const ids = (rows ?? []).map((r: { product_id: string }) => r.product_id);
  const { data } = ids.length ? await supabase.from("products").select("id,name,price,image_url").in("id", ids) : { data: [] };
  const products = (data ?? []) as P[];
  return (
    <>
      <PageTitle title="Wishlist" subtitle="Products you saved for later." />
      {products.length === 0 ? (
        <Empty text="Nothing saved yet." href="/" cta="Browse products" />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id}>
              <Link href={`/products/${p.id}`}>
                <div className="aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}
                </div>
                <p className="mt-2 truncate text-sm font-medium">{p.name}</p>
                <p className="text-sm font-bold text-indigo-600">${Number(p.price).toFixed(2)}</p>
              </Link>
              <form action={removeWishlist.bind(null, p.id)} className="mt-3"><button className={btnGhost}>Remove</button></form>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
