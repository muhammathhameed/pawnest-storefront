// components/AICoachWidget.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function AICoachWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query }),
      });
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-brand text-[var(--on-primary)] px-5 py-3.5 rounded-full shadow-2xl hover:opacity-90 transition-all font-medium text-sm group"
        >
          <span className="text-success group-hover:scale-110 transition-transform">✨</span>
          <span>Ask AI Concierge</span>
        </button>
      ) : (
        <div className="w-96 bg-card rounded-2xl shadow-2xl border border-line overflow-hidden flex flex-col max-h-[600px]">
          <div className="bg-brand text-[var(--on-primary)] px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-success">✨</span>
              <h3 className="font-semibold text-sm">AuraFinds AI Concierge</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-muted hover:text-ink text-sm">✕</button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-surface">
            <div className="bg-card p-3.5 rounded-xl border border-line text-xs text-ink shadow-xs">
              👋 Hi! Tell me what you're looking for (e.g., &quot;Minimalist desk organizer under $40&quot; or &quot;Gifts for dog lovers&quot;).
            </div>

            {recommendations.map((rec) => (
              <div key={rec.id} className="bg-card p-3.5 rounded-xl border border-line shadow-xs space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-ink text-xs">{rec.name}</h4>
                  <span className="font-bold text-ink text-xs">${rec.price}</span>
                </div>
                <p className="text-[11px] text-success bg-[var(--success-soft)] p-2 rounded-lg">{rec.match_reason}</p>
                <Link
                  href={`/products/${rec.id}`}
                  onClick={() => setIsOpen(false)}
                  className="block w-full text-center bg-brand text-[var(--on-primary)] py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-colors"
                >
                  View Product & AR →
                </Link>
              </div>
            ))}
          </div>

          <form onSubmit={handleSearch} className="p-3 bg-card border-t border-line flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What are you shopping for today?"
              className="flex-1 bg-surface border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-brand text-[var(--on-primary)] px-4 py-2 rounded-xl text-xs font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? '...' : 'Send'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
