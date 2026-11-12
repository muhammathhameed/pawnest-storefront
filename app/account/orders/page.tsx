import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function OrdersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=%2Faccount%2Forders');
  }

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_user_id', user.id)
    .order('created_at', { ascending: false });

  // Explicitly type and cast orders array to resolve TypeScript 'never[]' inference error
  const typedOrders = (orders ?? []) as Array<{ id: string; [key: string]: any }>;
  const orderIds = typedOrders.map((order) => String(order.id));

  const { data: orderItems, error: itemError } =
    orderIds.length > 0
      ? await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds)
      : { data: [], error: null };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Order History</h1>
            <p className="text-sm text-slate-400 mt-1">Track and review your past storefront orders.</p>
          </div>
          <Link
            href="/account"
            className="text-xs font-medium px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-slate-300"
          >
            Back to Account
          </Link>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-500/40 text-red-300 p-4 rounded-xl text-sm mb-6">
            Failed to load orders: {error.message}
          </div>
        )}

        {typedOrders.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <div className="text-slate-400 text-sm mb-4">You haven't placed any orders yet.</div>
            <Link
              href="/"
              className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-xl text-sm shadow-lg transition-all"
            >
              Explore Storefront
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {typedOrders.map((order) => (
              <div key={order.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
                  <div>
                    <div className="text-xs font-mono text-indigo-400">Order ID: {order.id}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Placed on {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
                      {order.status || 'Processing'}
                    </span>
                    <span className="text-sm font-bold text-white">
                      ${Number(order.total_amount ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="pt-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Items</div>
                  <div className="space-y-2">
                    {(orderItems ?? [])
                      .filter((item: any) => String(item.order_id) === String(order.id))
                      .map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between text-sm bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                          <div>
                            <div className="font-medium text-slate-200">{item.product_name || `Product #${item.product_id}`}</div>
                            <div className="text-xs text-slate-400">Qty: {item.quantity}</div>
                          </div>
                          <div className="font-semibold text-slate-300">
                            ${Number(item.price ?? 0).toFixed(2)}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
