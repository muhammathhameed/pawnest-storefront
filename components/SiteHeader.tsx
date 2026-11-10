'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ShoppingBag, User, Sparkles, X, ArrowRight, ShieldCheck, Truck, Headphones } from 'lucide-react';

export default function SiteHeader() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[] | null>(null);
  const [cartCount, setCartCount] = useState(2);

  const handleAiSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);

    if (q.trim().length > 2) {
      setIsAiLoading(true);
      try {
        const res = await fetch(`/api/concierge?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setAiSuggestions(data.recommendations || [
          { title: 'AI Curated Smart Gadget', price: '$29.99', reason: 'Matches your search for high efficiency.' },
          { title: 'Ergonomic Desk Companion', price: '$49.99', reason: 'Recommended for daily productivity.' }
        ]);
      } catch (err) {
        setAiSuggestions([
          { title: 'Smart Viral Find', price: '$24.99', reason: 'Top rated by our AI curation engine.' }
        ]);
      } finally {
        setIsAiLoading(false);
      }
    } else {
      setAiSuggestions(null);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      {/* Top Announcement Bar */}
      <div className="bg-slate-900 text-slate-100 text-xs py-2 px-4 text-center font-medium flex justify-center items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
        <span>⚡ Free Express Global Shipping on Orders Over $50 | AI Smart Search Active</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-105 transition-transform">
            A
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-slate-900">AuraFinds</span>
            <span className="text-[10px] uppercase tracking-widest text-indigo-600 font-semibold">Smart E-Commerce</span>
          </div>
        </Link>

        {/* AI Integrated Search Bar */}
        <div className="flex-1 max-w-xl relative hidden md:block">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleAiSearch}
              placeholder="✨ Ask AI Concierge or search viral products (e.g., 'desk setup under $50')..."
              className="w-full pl-11 pr-10 py-2.5 bg-slate-100/80 border border-slate-200 rounded-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setAiSuggestions(null); }}
                className="absolute right-3.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* AI Search Suggestions Dropdown */}
          {aiSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> AI Concierge Recommendations
                </span>
                <span className="text-[10px] text-slate-400">{aiSuggestions.length} items found</span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {isAiLoading ? (
                  <div className="text-center py-6 text-sm text-slate-500 animate-pulse">
                    AI is analyzing your request...
                  </div>
                ) : aiSuggestions.length > 0 ? (
                  aiSuggestions.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl hover:bg-slate-50 border border-slate-100 flex items-center justify-between transition-colors">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">{item.title}</h4>
                        <p className="text-xs text-slate-500">{item.reason}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-indigo-600 block">{item.price}</span>
                        <button className="text-[11px] font-medium text-slate-700 hover:text-indigo-600 underline mt-0.5">
                          View Details &rarr;
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-xs text-slate-500">No matching products found. Try a different query.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors"
          >
            <User className="w-4 h-4" />
            Sign In
          </Link>
          <Link
            href="/signup"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all hover:scale-105"
          >
            Get Started
          </Link>

          {/* Cart Trigger */}
          <Link
            href="/cart"
            className="relative p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-2"
            aria-label="Shopping Cart"
          >
            <ShoppingBag className="w-5 h-5 text-slate-800" />
            <span className="absolute -top-1 -right-1 bg-indigo-600 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow">
              {cartCount}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
