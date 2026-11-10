'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ShoppingBag, User, Sparkles, X, ShieldCheck, Truck, Lock, Star, CheckCircle2, ArrowRight } from 'lucide-react';

const HERO_SLIDES = [
  {
    id: 1,
    title: "The 2026 Curated Standard for Smart Living",
    subtitle: "Experience next-gen smart gadgets and viral essentials curated with uncompromising quality, 30-day risk-free guarantees, and lightning-fast fulfillment.",
    badge: "✨ Apple-Grade Curation",
    tag: "Verified 4.9/5 Rating across 1,400+ Orders",
    image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80",
    productName: "Viral Smart Beauty & Toning Device",
    price: "$39.99"
  },
  {
    id: 2,
    title: "Meet Your AI Shopping Concierge",
    subtitle: "Type any need in our Spotlight bar below—whether it's WFH desk upgrades, organic skincare, or smart home tech—and get instant bespoke recommendations.",
    badge: "🚀 Powered by Gemini AI",
    tag: "Instant Semantic Product Matching",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80",
    productName: "Ambient Warm LED Desk Lamp",
    price: "$49.99"
  },
  {
    id: 3,
    title: "Zero-Friction Global Checkout & Delivery",
    subtitle: "Enjoy fully encrypted Apple Pay & Stripe checkout with live courier tracking updates on all 21 premier catalog items.",
    badge: "🔒 Secure & Guaranteed",
    tag: "256-Bit SSL Encrypted Transactions",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    productName: "Aesthetic Organic Linen Set",
    price: "$29.99"
  }
];

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
        if (data && data.recommendations) {
          setAllProducts(data.recommendations);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

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
                onChange={(e) => handleAiSearch(e.target.value)}
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

            {/* AI Suggestions Dropdown */}
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
                  ) : aiSuggestions.length > 0 ? aiSuggestions.map((item, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => { setQuickViewProduct(item); setAiSuggestions(null); setSearchQuery(''); }}
                      className="p-3 rounded-xl hover:bg-slate-50 border border-slate-100 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="pr-4">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">{item.name || item.title}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{item.description || item.reason}</p>
                      </div>
                      <span className="text-xs font-extrabold text-indigo-600 shrink-0">
                        {typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : item.price}
                      </span>
                    </div>
                  )) : (
                    <div className="text-center py-6 text-xs text-slate-500">No matching products found. Try asking our AI concierge differently!</div>
                  )}
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

      {/* Apple-Grade Blended Product-Hero Banner Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 relative z-0">
        <div className="relative overflow-hidden bg-slate-900 rounded-[32px] text-white py-20 sm:py-28 px-6 sm:px-14 shadow-2xl min-h-[520px] flex flex-col justify-between">
          
          {/* Active Blended Slide Background Image with Soft Vignette & Gradients */}
          {HERO_SLIDES.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentSlide ? 'opacity-40 scale-105' : 'opacity-0 scale-100 pointer-events-none'
              }`}
              style={{
                backgroundImage: `url(${slide.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transition: 'transform 7s ease-out, opacity 1s ease-in-out'
              }}
            >
              {/* Multi-stop gradient blend overlay for seamless text readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-900/40"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/60"></div>
            </div>
          ))}

          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

          {/* Carousel Slide Content */}
          <div className="relative z-10 max-w-3xl my-auto">
            {HERO_SLIDES.map((slide, index) => (
              <div
                key={slide.id}
                className={`transition-all duration-700 ease-in-out ${
                  index === currentSlide ? 'opacity-100 translate-y-0 relative' : 'opacity-0 absolute inset-0 pointer-events-none translate-y-4'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2.5 mb-5">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-white/15 backdrop-blur-md text-indigo-200 border border-white/20 shadow-sm">
                    {slide.badge}
                  </span>
                  <span className="text-xs text-slate-200 font-medium bg-white/10 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
                    ⭐ {slide.tag}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 text-white leading-tight drop-shadow-md">
                  {slide.title}
                </h1>
                <p className="text-base sm:text-lg text-slate-200 mb-8 font-normal leading-relaxed max-w-2xl drop-shadow">
                  {slide.subtitle}
                </p>

                {/* Featured Product Highlight Pill */}
                <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 mb-8 shadow-lg">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/20 shrink-0">
                    <img src={slide.image} alt={slide.productName} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-indigo-300 font-bold block">Featured in this slide</span>
                    <span className="text-xs font-bold text-white">{slide.productName} • <span className="text-indigo-300">{slide.price}</span></span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <a
                    href="#catalog"
                    className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-full shadow-xl transition-all duration-200 hover:scale-105 flex items-center gap-2"
                  >
                    Explore 21 Curated Items <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href="/signup"
                    className="px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-full backdrop-blur-md border border-white/20 transition-all duration-200"
                  >
                    Create Account
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive AI Prompt Chips & Slide Indicators Bottom Bar */}
          <div className="relative z-10 pt-12 mt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Clickable AI Prompt Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mr-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Try Asking AI:
              </span>
              {SUGGESTED_PROMPTS.map((promptText, i) => (
                <button
                  key={i}
                  onClick={() => handleAiSearch(promptText.replace(/^[^\s]+\s/, ''))}
                  className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs text-slate-200 font-medium transition-all border border-white/10 hover:border-white/30 backdrop-blur-sm"
                >
                  {promptText}
                </button>
              ))}
            </div>

            {/* Slide Navigation Dots */}
            <div className="flex gap-2">
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
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Showing {filteredProducts.length} live Supabase products with instant Apple Pay and AR preview.</p>
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
        {loadingProducts ? (
          <div className="text-center py-20 text-slate-500 animate-pulse text-sm">Loading your Supabase inventory...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 space-y-2">
            <h3 className="text-lg font-bold text-slate-900">No products found in this category</h3>
            <p className="text-xs text-slate-500">Try selecting "All" or searching with our AI concierge.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => setQuickViewProduct(product)}
                className="group bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden cursor-pointer hover:-translate-y-1.5"
              >
                {/* Card Top Banner with Product Image (Fixed aspect ratio with object-contain and white background container) */}
                <div className="relative h-48 bg-white overflow-hidden flex items-center justify-center p-4 border-b border-slate-100">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                      {product.name.charAt(0)}
                    </div>
                  )}
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-indigo-600 uppercase tracking-wider border border-slate-200/60 shadow-sm">
                    {product.category || 'General'}
                  </span>
                  <span className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-0.5 rounded-full text-[10px] font-medium">
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
                      <span className="text-xs font-bold text-slate-700">{product.rating || 4.8}</span>
                      <span className="text-xs text-slate-400">({product.reviewsCount || 120})</span>
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
                      <span className="text-base font-extrabold text-slate-900">
                        {typeof product.price === 'number' ? `$${product.price.toFixed(2)}` : product.price}
                      </span>
                      {product.originalPrice && (
                        <span className="text-xs text-slate-400 line-through ml-2">${product.originalPrice.toFixed(2)}</span>
                      )}
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
        )}
      </main>

      {/* iOS Quick View Modal Sheet */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">{quickViewProduct.category || 'General'}</span>
              <button 
                onClick={() => setQuickViewProduct(null)}
                className="p-1 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {quickViewProduct.image && (
              <div className="mt-4 h-56 rounded-2xl overflow-hidden bg-white flex items-center justify-center p-4 border border-slate-100">
                <img src={quickViewProduct.image} alt={quickViewProduct.name} className="w-full h-full object-contain" />
              </div>
            )}
            <div className="py-6 space-y-4">
              <h3 className="text-xl font-extrabold text-slate-900">{quickViewProduct.name || quickViewProduct.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{quickViewProduct.description || quickViewProduct.reason}</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-slate-900">
                  {typeof quickViewProduct.price === 'number' ? `$${quickViewProduct.price.toFixed(2)}` : quickViewProduct.price}
                </span>
                {quickViewProduct.originalPrice && (
                  <span className="text-sm text-slate-400 line-through">${quickViewProduct.originalPrice.toFixed(2)}</span>
                )}
                <span className="ml-auto px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                  In Stock ({quickViewProduct.available || 100})
                </span>
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
