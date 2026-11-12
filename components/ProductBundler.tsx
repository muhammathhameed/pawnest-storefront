'use client';

import React, { useState } from 'react';

interface BundleItem {
  id: string;
  name: string;
  price: number;
}

interface BundleProblem {
  id: string;
  title: string;
  description: string;
  items: BundleItem[];
  discountPercent: number;
}

const PROBLEMS: BundleProblem[] = [
  {
    id: 'cluttered-desk',
    title: 'Cluttered & Uninspired Desk',
    description: 'Transform a messy workspace into a clean, ergonomic sanctuary.',
    discountPercent: 15,
    items: [
      { id: '1', name: 'Minimalist Oak Desk Organizer', price: 34.99 },
      { id: '2', name: 'Ambient Warm LED Desk Lamp', price: 42.00 },
      { id: '3', name: 'Ergonomic Walnut Monitor Stand', price: 59.99 },
    ],
  },
  {
    id: 'living-room-zen',
    title: 'Aesthetic Living Room Comfort',
    description: 'Add warmth and texture to your living area instantly.',
    discountPercent: 10,
    items: [
      { id: '4', name: 'Aesthetic Linen Throw Pillow', price: 28.50 },
      { id: '2', name: 'Ambient Warm LED Desk Lamp', price: 42.00 },
    ],
  },
];

export default function ProductBundler() {
  const [selectedProblem, setSelectedProblem] = useState<BundleProblem>(PROBLEMS[0]);

  const subtotal = selectedProblem.items.reduce((acc, item) => acc + item.price, 0);
  const discountAmount = (subtotal * selectedProblem.discountPercent) / 100;
  const finalPrice = subtotal - discountAmount;

  return (
    <div className="bg-card border border-line rounded-2xl p-6 shadow-2xl my-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-ink">Interactive Problem-to-Solution Bundler</h3>
        <p className="text-xs text-muted mt-1">Select your space challenge to instantly bundle complementary items with a dynamic discount.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {PROBLEMS.map((prob) => (
          <button
            key={prob.id}
            onClick={() => setSelectedProblem(prob)}
            className={`text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
              selectedProblem.id === prob.id
                ? 'bg-brand/10 border-brand/30 shadow-md'
                : 'bg-surface border-line hover:border-line'
            }`}
          >
            <div className="text-sm font-bold text-ink">{prob.title}</div>
            <div className="text-xs text-muted mt-1">{prob.description}</div>
            <div className="mt-3 inline-block text-xs font-semibold px-2 py-0.5 rounded bg-brand/10 text-brand border border-brand/30">
              Save {prob.discountPercent}% as a Bundle
            </div>
          </button>
        ))}
      </div>

      <div className="bg-surface rounded-xl p-5 border border-line">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Included Bundle Items</h4>
        <div className="space-y-2 mb-5">
          {selectedProblem.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b border-line last:border-0">
              <span className="text-ink font-medium">{item.name}</span>
              <span className="text-muted">${item.price.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-line">
          <div>
            <div className="text-xs text-muted">Bundle Total ({selectedProblem.discountPercent}% OFF applied)</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-ink">${finalPrice.toFixed(2)}</span>
              <span className="text-sm line-through text-muted">${subtotal.toFixed(2)}</span>
            </div>
          </div>
          <button className="w-full sm:w-auto bg-brand hover:opacity-90 text-[var(--on-primary)] font-medium px-6 py-3 rounded-xl shadow-lg transition-all duration-200 cursor-pointer">
            Add Complete Bundle to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
