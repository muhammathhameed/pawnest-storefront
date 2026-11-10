'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ShoppingBag, User, Sparkles, X, ShieldCheck, Truck, Lock, Star, CheckCircle2 } from 'lucide-react';

const HERO_SLIDES = [
  {
    id: 1,
    title: "Designed for Modern Living",
    subtitle: "Experience next-gen smart gadgets and viral essentials curated with uncompromising quality.",
    badge: "✨ Apple-Grade Curation",
    bg: "from-slate-900 via-indigo-950 to-slate-900"
  },
  {
    id: 2,
    title: "AI Concierge Search Active",
    subtitle: "Type anything in the Spotlight bar below to find bespoke problem-solving products instantly.",
    badge: "🚀 Powered by Gemini AI",
    bg: "from-indigo-950 via-purple-950 to-slate-900"
  },
  {
    id: 3,
    title: "Zero Friction Global Checkout",
    subtitle: "Fast Apple Pay & Stripe integration with express tracked shipping on all orders.",
    badge: "🔒 Secure & Guaranteed",
    bg: "from-blue-950 via-slate-900 to-indigo-950"
  }
];

const CURATED_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Viral Smart Beauty & Toning Device',
    category: 'Beauty & Skincare',
    price: 39.99,
    originalPrice: 59.99,
    rating: 4.9,
    reviewsCount: 142,
    description: 'Advanced ultrasonic facial rejuvenation and microcurrent toning device for professional at-home skincare.',
    available: 120
  },
  {
    id: 'prod-2',
    name: 'Ambient Warm LED Desk Lamp & Qi Wireless Charger',
    category: 'Smart Tech & Gadgets',
    price: 49.99,
    originalPrice: 69.99,
    rating: 4.8,
    reviewsCount: 98,
    description: 'Sleek aluminum desk companion featuring wireless fast-charging pad, adjustable color temperature, and touch dimming.',
    available: 85
  },
  {
    id: 'prod-3',
    name: 'Aesthetic Organic Linen Throw Pillow Set',
    category: 'Lifestyle & Home',
    price: 29.99,
    originalPrice: 45.00,
    rating: 5.0,
    reviewsCount: 215,
    description: 'Hand-woven textured organic linen cushion cover designed to elevate living room comfort and interior aesthetics.',
    available: 200
  },
  {
    id: 'prod-4',
    name: 'Ergonomic Posture Correction Harness',
    category: 'Wellness & Fitness',
    price: 34.99,
    originalPrice: 50.00,
    rating: 4.7,
    reviewsCount: 76,
    description: 'Lightweight, breathable posture trainer designed to relieve back strain and align spine during long work sessions.',
    available: 64
  }
];

export default function MasterStorefrontPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cartCount, setCartCount] = useState(2);
  const [addedItems, setAddedItems] = useState<{ [key: string]: boolean }>({});
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleAiSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);

    if (q.trim().length > 0) {
      setIsAiLoading(true);
      try {
        const res = await fetch(`/api/concierge?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setAiSuggestions(data.recommendations || CURATED_PRODUCTS);
      } catch (err) {
        const filtered = CURATED_PRODUCTS.filter(p => 
          p.name.toLowerCase().includes(q.toLowerCase()) || 
          p.category.toLowerCase().includes(q.toLowerCase()) ||
          p.description.toLowerCase().includes(q.toLowerCase())
        );
        setAiSuggestions(filtered.length > 0 ? filtered : CURATED_PRODUCTS);
      } finally {
        setIsAiLoading(false);
      }
    } else {
      setAiSuggestions(null);
    }
  };

  const handleAddToCart = (product: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCartCount(prev => prev + 1);
    setAddedItems(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [product.id]: false }));
    }, 2000);
  };

  const categories = ['All', 'Beauty & Skincare', 'Smart Tech & Gadgets', 'Lifestyle & Home', 'Wellness & Fitness'];

  const filteredProducts = selectedCategory === 'All'
    ? CURATED_PRODUCTS
    : CURATED_PRODUCTS.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* iOS Floating Frosted Glass Header */}
      <header className="sticky top-4 z-50 mx-4 sm:mx-8">
        <div className="max-w-7xl mx-auto backdrop-blur-2xl bg-white/90 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 transition-all duration-300">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform">
              A
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 leading-none">AuraFinds</span>
              <span className="text-[10px] uppercase tracking-widest text-indigo-600 font-semibold mt-0.5">Storefront</span>
            </div>
          </Link>

          {/* Spotlight AI Search Bar */}
          <div className="flex-1 max-w-lg relative hidden md:block">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleAiSearch}
                placeholder="✨ Spotlight AI Concierge: Search products or ask for advice..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-100/90 border border-slate-200/80 rounded-full text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner"
              />
              {searchQuery && (
                <button 
                  onClick={() => { setSearchQuery(''); setAiSuggestions(null); }}
                  className="absolute right-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* AI Suggestions Dropdown with Text visibility fix */}
            {aiSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2.5 bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-80 overflow-y-auto">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> AI Spotlight Recommendations
                  </span>
                  <span className="text-[10px] text-slate-400">{aiSuggestions.length} found</span>
                </div>
                <div className="space-y-2">
                  {isAiLoading ? (
                    <div className="text-center py-4 text-xs text-slate-500 animate-pulse">Analyzing query...</div>
                  ) : aiSuggestions.map((item, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => { setQuickViewProduct(item); setAiSuggestions(null); setSearchQuery(''); }}
                      className="p-3 rounded-xl hover:bg-slate-50 border border-slate-100 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="pr-4">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">{item.name || item.title}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{item.description || item.reason}</p>
                      </div>
                      <span className="text-xs font-extrabold text-indigo-600 shrink-0">{item.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Links & Cart */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-indigo-600 transition-colors"
            >
              <User className="w-3.5 h-3.5" /> Sign In
            </Link>
            <Link
              href="/signup"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all hover:scale-105"
            >
              Get Started
            </Link>
            <Link
              href="/cart"
              className="relative p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all flex items-center justify-center hover:scale-105"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow">
                {cartCount}
              </span>
            </Link>
          </div>

        </div>
      </header>

      {/* Hero Apple-Grade Slideshow Carousel with generous height and z-index isolation */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 relative z-0">
        <div className="relative overflow-hidden bg-slate-900 rounded-3xl text-white py-20 sm:py-24 px-6 sm:px-12 shadow-2xl min-h-[420px] flex flex-col justify-center items-center text-center">
          {HERO_SLIDES.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 ease-in-out px-6 sm:px-16 ${
                index === currentSlide ? 'opacity-100 pointer-events-auto scale-100' : 'opacity-0 pointer-events-none scale-95'
              }`}
            >
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 mb-6 text-xs font-semibold uppercase tracking-wider rounded-full bg-white/15 backdrop-blur-md text-indigo-200 border border-white/20 shadow-sm">
                {slide.badge}
              </span>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 text-white max-w-4xl leading-tight">
                {slide.title}
              </h1>
              <p className="max-w-2xl text-base sm:text-lg text-slate-300 mb-8 font-normal leading-relaxed">
                {slide.subtitle}
              </p>
              <a
                href="#catalog"
                className="px-8 py-3.5 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs sm:text-sm rounded-full shadow-xl transition-all duration-200 hover:scale-105"
              >
                Explore Collection &rarr;
              </a>
            </div>
          ))}

          {/* Indicators */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
            {HERO_SLIDES.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'w-8 bg-indigo-400' : 'w-2 bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges Bento Row */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600"><ShieldCheck className="w-5 h-5" /></div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">30-Day Risk-Free</h4>
              <p className="text-[11px] text-slate-500">100% money-back guarantee</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><Truck className="w-5 h-5" /></div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Fast & Tracked</h4>
              <p className="text-[11px] text-slate-500">Live courier tracking updates</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><Lock className="w-5 h-5" /></div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Secure Checkout</h4>
              <p className="text-[11px] text-slate-500">Encrypted 256-bit SSL</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600"><Star className="w-5 h-5" /></div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Curated Quality</h4>
              <p className="text-[11px] text-slate-500">Rigorously inspected items</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Section */}
      <main id="catalog" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">Shop the Collection</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Hand-picked viral essentials with instant Apple Pay and AR preview.</p>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all shadow-sm ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-slate-900 text-white shadow-md scale-105'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Bento Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => setQuickViewProduct(product)}
              className="group bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden cursor-pointer hover:-translate-y-1.5"
            >
              {/* Card Top Banner */}
              <div className="p-6 pb-3 bg-gradient-to-tr from-slate-50 to-indigo-50/50 flex items-center justify-between">
                <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-indigo-600 uppercase tracking-wider border border-slate-200/60 shadow-sm">
                  {product.category}
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  {product.available} left
                </span>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-current" />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-700">{product.rating}</span>
                    <span className="text-xs text-slate-400">({product.reviewsCount})</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-base font-extrabold text-slate-900">${product.price.toFixed(2)}</span>
                    <span className="text-xs text-slate-400 line-through ml-2">${product.originalPrice.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={(e) => handleAddToCart(product, e)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md ${
                      addedItems[product.id]
                        ? 'bg-emerald-600 text-white scale-95'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105'
                    }`}
                  >
                    {addedItems[product.id] ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Added
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-3.5 h-3.5" /> Add
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* iOS Quick View Modal Sheet */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">{quickViewProduct.category}</span>
              <button 
                onClick={() => setQuickViewProduct(null)}
                className="p-1 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-6 space-y-4">
              <h3 className="text-xl font-extrabold text-slate-900">{quickViewProduct.name || quickViewProduct.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{quickViewProduct.description || quickViewProduct.reason}</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-slate-900">{typeof quickViewProduct.price === 'number' ? `$${quickViewProduct.price.toFixed(2)}` : quickViewProduct.price}</span>
                {quickViewProduct.originalPrice && (
                  <span className="text-sm text-slate-400 line-through">${quickViewProduct.originalPrice.toFixed(2)}</span>
                )}
                <span className="ml-auto px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">In Stock</span>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => { handleAddToCart(quickViewProduct); setQuickViewProduct(null); }}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-2xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" /> Add to Cart & Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-12 px-4 sm:px-8 mt-12 text-center text-xs text-slate-500">
        <p>© 2026 AuraFinds Storefront. Powered by Next.js & Google Generative AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
