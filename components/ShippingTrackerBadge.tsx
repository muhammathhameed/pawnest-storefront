'use client';

import React from 'react';

interface ShippingTrackerBadgeProps {
  fulfillmentSpeed?: 'standard' | 'express';
  originHub?: string;
}

export default function ShippingTrackerBadge({
  fulfillmentSpeed = 'standard',
  originHub = 'Global Fulfillment Hub #4',
}: ShippingTrackerBadgeProps) {
  const steps = [
    { title: 'Order Processed', desc: 'Item verified & packaged' },
    { title: 'Leaves Fulfillment Hub', desc: originHub },
    { title: 'Customs & Transit', desc: 'In-flight / regional sorting' },
    { title: 'Delivered to Door', desc: fulfillmentSpeed === 'express' ? '2-3 Business Days' : '4-6 Business Days' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl my-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
          </svg>
          Live Supply Chain & Fulfillment Estimate
        </h3>
        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
          In Stock & Ready
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {steps.map((step, idx) => (
          <div key={idx} className="relative bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
            <div className="text-xs font-semibold text-indigo-400 mb-1">Step {idx + 1}</div>
            <div className="text-xs font-bold text-slate-100">{step.title}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{step.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
