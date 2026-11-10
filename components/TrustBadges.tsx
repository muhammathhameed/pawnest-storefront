// components/TrustBadges.tsx
import React from 'react';

export default function TrustBadges() {
  return (
    <div className="grid grid-cols-2 gap-4 my-6 pt-6 border-t border-neutral-200">
      <div className="flex items-center space-x-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
        <span className="text-xl">🛡️</span>
        <div>
          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">30-Day Risk-Free</h4>
          <p className="text-[11px] text-neutral-500">100% money-back guarantee</p>
        </div>
      </div>
      <div className="flex items-center space-x-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
        <span className="text-xl">⚡</span>
        <div>
          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Fast & Tracked</h4>
          <p className="text-[11px] text-neutral-500">Live courier tracking updates</p>
        </div>
      </div>
      <div className="flex items-center space-x-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
        <span className="text-xl">🔒</span>
        <div>
          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Secure Checkout</h4>
          <p className="text-[11px] text-neutral-500">Encrypted 256-bit SSL</p>
        </div>
      </div>
      <div className="flex items-center space-x-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
        <span className="text-xl">✨</span>
        <div>
          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Curated Quality</h4>
          <p className="text-[11px] text-neutral-500">Rigorously inspected items</p>
        </div>
      </div>
    </div>
  );
}
