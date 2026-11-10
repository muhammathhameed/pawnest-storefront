'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ShoppingBag, User, Sparkles, X, ShieldCheck, Truck, Lock, Star, CheckCircle2, ArrowRight } from 'lucide-react';

const SUGGESTED_PROMPTS = [
  "✨ Best skin care for glowing skin",
  "💡 Smart lighting & desk lamps",
  "🛋️ Aesthetic home comfort sets",
  "🧘 Ergonomic posture solutions"
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
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Fetch products from Supabase API / Concierge backend
  useEffect(() => {
    fetch('/api/concierge')
      .then(res => res.json())
      .then(data => {
        if (data && data.recommendations && data.recommendations.length > 0) {
          setAllProducts(data.recommendations);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  // Use top products from Supabase database for the hero slideshow
  const heroSlides = allProducts.length > 0 ? allProducts.slice(0, 3).map((p, idx) => ({
    id: p.id || idx,
    title: idx === 0 ? "The 2026 Curated Standard for Smart Living" : idx === 1 ? "Meet Your AI Shopping Concierge" : "Zero-Friction Global Checkout",
    subtitle: p.description || "Experience next-gen smart gadgets and viral essentials curated with uncompromising quality.",
    badge: idx === 0 ? "✨ Featured Product" : idx === 1 ? "🚀 AI Spotlight Pick" : "🔒 Verified Best Seller",
    tag: `⭐ 4.8/5 (${p.available || 100} in stock)`,
    image: p.image || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80",
    productName: p.name,
    price: typeof p.price === 'number' ? `$${p.price.toFixed(2)}` : p.price
  })) : [
    {
      id: 1,
      title: "The 2026 Curated Standard for Smart Living",
      subtitle: "Experience next-gen smart gadgets and viral essentials curated with uncompromising quality.",
      badge: "✨ Apple-Grade Curation",
      tag: "Verified 4.9/5 Rating",
      image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80",
      productName: "Curated Essential",
      price: "$39.99"
    }
  ];

  useEffect(() => {
    if (heroSlides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const handleAiSearch = async (qText: string) => {
    setSearchQuery(qText);
    if (qText.trim().length > 0) {
      setIsAiLoading(true);
      try {
        const res = await fetch(`/api/concierge?q=${encodeURIComponent(qText)}`);
        const data = await res.json();
        setAiSuggestions(data.recommendations || []);
      } catch (err) {
        setAiSuggestions([]);
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
    ? allProducts
    : allProducts.filter(p => (p.category || '').toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div className="min-h-screen bg-[#0D0F18] text-[#F3F4F6] flex flex-col font-sans selection:bg-pink-500 selection:text-white">
      
      {/* iOS Floating Frosted Glass Header with Cyber-Neon Aesthetic */}
      <header className="sticky top-4 z-50 mx-4 sm:mx-8">
        <div className="max-w-7xl mx-auto backdrop-blur-2xl bg-[#161B2E]/80 border border-indigo-500/30 shadow-[0_8px_30px_rgb(99,102,241,0.15)] rounded-2xl px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 transition-all duration-300">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-pink-500/30 group-hover:scale-105 transition-transform">
              A
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-white leading-none">AuraFinds</span>
              <span className="text-[10px] uppercase tracking-widest text-pink-400 font-semibold mt-0.5">Y2K Cyber Luxe</span>
            </div>
          </Link>

          {/* Spotlight AI Search Bar */}
          <div className="flex-1 max-w-lg relative hidden md:block">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-indigo-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleAiSearch(e.target.value)}
                placeholder="✨ Ask AI Concierge: 'Gen Z skincare', 'LED desk tech'..."
                className="w-full pl-10 pr-10 py-2.5 bg-[#0D0F18]/90 border border-indigo-500/30 rounded-full text-xs text-white placeholder-indigo-300/60 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-[#161B2E] transition-all shadow-inner"
              />
              {searchQuery && (
                <button 
                  onClick={() => { setSearchQuery(''); setAiSuggestions(null); }}
                  className="absolute right-3 text-indigo-300 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* AI Suggestions Dropdown */}
            {aiSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2.5 bg-[#161B2E] rounded-2xl shadow-2xl border border-indigo-500/30 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-80 overflow-y-auto">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-indigo-500/20">
                  <span className="text-[11px] font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> AI Spotlight Recommendations
                  </span>
                  <span className="text-[10px] text-indigo-300">{aiSuggestions.length} found</span>
                </div>
                <div className="space-y-2">
                  {isAiLoading ? (
                    <div className="text-center py-4 text-xs text-indigo-300 animate-pulse">Analyzing query...</div>
                  ) : aiSuggestions.length > 0 ? aiSuggestions.map((item, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => { setQuickViewProduct(item); setAiSuggestions(null); setSearchQuery(''); }}
                      className="p-3 rounded-xl hover:bg-indigo-950/50 border border-indigo-500/20 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="pr-4">
                        <h4 className="text-xs font-bold text-white group-hover:text-pink-400">{item.name || item.title}</h4>
                        <p className="text-[11px] text-indigo-300/80 line-clamp-1">{item.description || item.reason}</p>
                      </div>
                      <span className="text-xs font-extrabold text-pink-400 shrink-0">
                        {typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : item.price}
                      </span>
                    </div>
                  )) : (
                    <div className="text-center py-6 text-xs text-indigo-300">No matching products found. Try asking our AI concierge differently!</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Links & Cart */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-200 hover:text-white transition-colors"
            >
              <User className="w-3.5 h-3.5 text-pink-400" /> Sign In
            </Link>
            <Link
              href="/signup"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 rounded-xl shadow-lg shadow-pink-500/20 transition-all hover:scale-105"
            >
              Get Started
            </Link>
            <Link
              href="/cart"
              className="relative p-2.5 rounded-full bg-indigo-950/60 hover:bg-indigo-900 text-indigo-200 transition-all flex items-center justify-center hover:scale-105 border border-indigo-500/30"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-4 h-4 text-pink-400" />
              <span className="absolute -top-1 -right-1 bg-pink-500 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow">
                {cartCount}
              </span>
            </Link>
          </div>

        </div>
      </header>

      {/* Hero Banner Section with Cyber-Neon Luxury Gradient & Blended Imagery */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 relative z-0">
        <div className="relative overflow-hidden bg-[#121629] border border-indigo-500/20 rounded-[32px] text-white py-20 sm:py-28 px-6 sm:px-14 shadow-[0_20px_50px_rgba(99,102,241,0.1)] min-h-[520px] flex flex-col justify-between">
          
          {/* Active Blended Slide Background Image from Database */}
          {heroSlides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentSlide ? 'opacity-35 scale-105' : 'opacity-0 scale-100 pointer-events-none'
              }`}
              style={{
                backgroundImage: `url(${slide.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transition: 'transform 7s ease-out, opacity 1s ease-in-out'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#0D0F18] via-[#0D0F18]/90 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D0F18] via-transparent to-[#0D0F18]/80"></div>
            </div>
          ))}

          {/* Glowing Ambient Orbs */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-pink-500/15 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>

          {/* Carousel Slide Content */}
          <div className="relative z-10 max-w-3xl my-auto">
            {heroSlides.map((slide, index) => (
              <div
                key={slide.id}
                className={`transition-all duration-700 ease-in-out ${
                  index === currentSlide ? 'opacity-100 translate-y-0 relative' : 'opacity-0 absolute inset-0 pointer-events-none translate-y-4'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2.5 mb-5">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full bg-pink-500/10 backdrop-blur-md text-pink-400 border border-pink-500/30 shadow-sm">
                    {slide.badge}
                  </span>
                  <span className="text-xs text-indigo-200 font-medium bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-500/30 backdrop-blur-md">
                    {slide.tag}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 text-white leading-tight drop-shadow-md line-clamp-2 bg-gradient-to-r from-white via-indigo-100 to-pink-300 bg-clip-text text-transparent">
                  {slide.productName}
                </h1>
                <p className="text-base sm:text-lg text-indigo-200/90 mb-8 font-normal leading-relaxed max-w-2xl drop-shadow line-clamp-2">
                  {slide.subtitle}
                </p>

                {/* Featured Product Highlight Pill */}
                <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-indigo-950/60 backdrop-blur-xl border border-indigo-500/30 mb-8 shadow-xl">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-white shrink-0 flex items-center justify-center p-1">
                    <img src={slide.image} alt={slide.productName} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-pink-400 font-bold block">Featured Database Item</span>
                    <span className="text-xs font-bold text-white">{slide.productName} • <span className="text-pink-400">{slide.price}</span></span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <a
                    href="#catalog"
                    className="px-8 py-3.5 bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-full shadow-lg shadow-pink-500/25 transition-all duration-200 hover:scale-105 flex items-center gap-2"
                  >
                    Explore All {allProducts.length} Items <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href="/signup"
                    className="px-8 py-3.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 font-bold text-xs sm:text-sm rounded-full backdrop-blur-md border border-indigo-500/30 transition-all duration-200 hover:text-white"
                  >
                    Create Account
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive AI Prompt Chips & Slide Indicators Bottom Bar */}
          <div className="relative z-10 pt-12 mt-8 border-t border-indigo-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Clickable AI Prompt Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-pink-400 uppercase tracking-wider mr-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Try Asking AI:
              </span>
              {SUGGESTED_PROMPTS.map((promptText, i) => (
                <button
                  key={i}
                  onClick={() => handleAiSearch(promptText.replace(/^[^\s]+\s/, ''))}
                  className="px-3.5 py-1.5 rounded-full bg-indigo-950/60 hover:bg-indigo-900 text-xs text-indigo-200 font-medium transition-all border border-indigo-500/30 hover:border-pink-500/50 backdrop-blur-sm"
                >
                  {promptText}
                </button>
              ))}
            </div>

            {/* Slide Navigation Dots */}
            <div className="flex gap-2">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide ? 'w-8 bg-pink-500 shadow-sm shadow-pink-500/50' : 'w-2 bg-indigo-900 hover:bg-indigo-700'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

          </div>

        </div>
      </section>

      {/* Trust Badges Bento Row */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#161B2E] border border-indigo-500/20 p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400"><ShieldCheck className="w-5 h-5" /></div>
            <div>
              <h4 className="text-xs font-bold text-white">30-Day Risk-Free</h4>
              <p className="text-[11px] text-indigo-300/80">100% money-back guarantee</p>
            </div>
          </div>
          <div className="bg-[#161B2E] border border-indigo-500/20 p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400"><Truck className="w-5 h-5" /></div>
            <div>
              <h4 className="text-xs font-bold text-white">Fast & Tracked</h4>
              <p className="text-[11px] text-indigo-300/80">Live courier tracking updates</p>
            </div>
          </div>
          <div className="bg-[#161B2E] border border-indigo-500/20 p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400"><Lock className="w-5 h-5" /></div>
            <div>
              <h4 className="text-xs font-bold text-white">Secure Checkout</h4>
              <p className="text-[11px] text-indigo-300/80">Encrypted 256-bit SSL</p>
            </div>
          </div>
          <div className="bg-[#161B2E] border border-indigo-500/20 p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400"><Star className="w-5 h-5" /></div>
            <div>
              <h4 className="text-xs font-bold text-white">Curated Quality</h4>
              <p className="text-[11px] text-indigo-300/80">Rigorously inspected items</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Section */}
      <main id="catalog" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Shop the Collection</h2>
            <p className="text-xs sm:text-sm text-indigo-300/80 mt-1">Showing {filteredProducts.length} live Supabase products with instant Apple Pay and AR preview.</p>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all shadow-sm ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25 scale-105'
                    : 'bg-[#161B2E] text-indigo-200 hover:bg-indigo-900/60 border border-indigo-500/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Bento Product Grid */}
        {loadingProducts ? (
          <div className="text-center py-20 text-indigo-300 animate-pulse text-sm">Loading your Supabase inventory...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-[#161B2E] rounded-3xl border border-indigo-500/20 p-8 space-y-2">
            <h3 className="text-lg font-bold text-white">No products found in this category</h3>
            <p className="text-xs text-indigo-300/80">Try selecting "All" or searching with our AI concierge.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => setQuickViewProduct(product)}
                className="group bg-[#161B2E] rounded-3xl border border-indigo-500/20 shadow-sm hover:shadow-2xl hover:border-pink-500/40 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer hover:-translate-y-1.5"
              >
                {/* Card Top Banner with Product Image */}
                <div className="relative h-48 bg-[#0D0F18] overflow-hidden flex items-center justify-center p-4 border-b border-indigo-500/10">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-indigo-950 text-pink-400 flex items-center justify-center font-bold text-lg border border-indigo-500/20">
                      {product.name.charAt(0)}
                    </div>
                  )}
                  <span className="absolute top-3 left-3 bg-[#161B2E]/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-pink-400 uppercase tracking-wider border border-indigo-500/30 shadow-sm truncate max-w-[120px]">
                    {product.category || 'General'}
                  </span>
                  <span className="absolute top-3 right-3 bg-[#0D0F18]/90 backdrop-blur-md text-indigo-200 px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-indigo-500/20">
                    {product.available || 100} left
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
                      <span className="text-xs font-bold text-indigo-200">{product.rating || 4.8}</span>
                      <span className="text-xs text-indigo-400">({product.reviewsCount || 120})</span>
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-pink-400 transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-indigo-300/80 mt-2 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-indigo-500/10 flex items-center justify-between">
                    <div>
                      <span className="text-base font-black text-white">
                        {typeof product.price === 'number' ? `$${product.price.toFixed(2)}` : product.price}
                      </span>
                      {product.originalPrice && (
                        <span className="text-xs text-indigo-400/80 line-through ml-2">${product.originalPrice.toFixed(2)}</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleAddToCart(product, e)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md ${
                        addedItems[product.id]
                          ? 'bg-emerald-600 text-white scale-95'
                          : 'bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white hover:scale-105 shadow-pink-500/20'
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
        )}
      </main>

      {/* iOS Quick View Modal Sheet */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#161B2E] border border-indigo-500/30 w-full max-w-lg rounded-t-[32px] sm:rounded-3xl p-6 sm:p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 text-white">
            <div className="flex items-center justify-between pb-4 border-b border-indigo-500/20">
              <span className="text-xs font-bold uppercase tracking-wider text-pink-400">{quickViewProduct.category || 'General'}</span>
              <button 
                onClick={() => setQuickViewProduct(null)}
                className="p-1 rounded-full bg-indigo-950 text-indigo-300 hover:bg-indigo-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {quickViewProduct.image && (
              <div className="mt-4 h-56 rounded-2xl overflow-hidden bg-[#0D0F18] flex items-center justify-center p-4 border border-indigo-500/20">
                <img src={quickViewProduct.image} alt={quickViewProduct.name} className="w-full h-full object-contain" />
              </div>
            )}
            <div className="py-6 space-y-4">
              <h3 className="text-xl font-extrabold text-white">{quickViewProduct.name || quickViewProduct.title}</h3>
              <p className="text-sm text-indigo-200/90 leading-relaxed">{quickViewProduct.description || quickViewProduct.reason}</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-white">
                  {typeof quickViewProduct.price === 'number' ? `$${quickViewProduct.price.toFixed(2)}` : quickViewProduct.price}
                </span>
                {quickViewProduct.originalPrice && (
                  <span className="text-sm text-indigo-400/80 line-through">${quickViewProduct.originalPrice.toFixed(2)}</span>
                )}
                <span className="ml-auto px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                  In Stock ({quickViewProduct.available || 100})
                </span>
              </div>
            </div>
            <div className="pt-4 border-t border-indigo-500/20 flex gap-3">
              <button
                onClick={() => { handleAddToCart(quickViewProduct); setQuickViewProduct(null); }}
                className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-pink-500/25 transition-all text-sm flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" /> Add to Cart & Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#121629] border-t border-indigo-500/20 py-12 px-4 sm:px-8 mt-12 text-center text-xs text-indigo-300/65">
        <p>© 2026 AuraFinds Storefront. Y2K Cyber Luxe Edition. Powered by Next.js & Google Generative AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
