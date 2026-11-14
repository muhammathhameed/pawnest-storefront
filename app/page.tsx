'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import SiteHeader from '../components/SiteHeader';
import { getSupabaseBrowserClient } from '../lib/supabase/browser';
import { useCartStore } from '../store/cartStore';
import { toCartProduct } from '../lib/cart-product';
import { stockLabel } from '../lib/stock';
import { toast } from 'sonner';
import { Search, ShoppingBag, User, Sparkles, X, ShieldCheck, Truck, Lock, Star, CheckCircle2, ArrowRight, Camera, LogOut } from 'lucide-react';

const SUGGESTED_PROMPTS = [
  "✨ Best skin care for glowing skin",
  "💡 Smart lighting & desk lamps",
  "🛋️ Aesthetic home comfort sets",
  "🧘 Ergonomic posture solutions"
];

// 3D Tilt Card Component for Apple Liquid Glass (Fixed line clamping and hover text color matching)
function GlassTiltCard({ 
  product, 
  onSelect, 
  onAddToCart, 
  onArView,
  isAdded 
}: { 
  product: any; 
  onSelect: () => void; 
  onAddToCart: (p: any, e: React.MouseEvent) => void; 
  onArView: (p: any, e: React.MouseEvent) => void;
  isAdded: boolean 
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glareStyle, setGlareStyle] = useState({ opacity: 0, x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rX = -((y - centerY) / centerY) * 10;
    const rY = ((x - centerX) / centerX) * 10;

    setRotateX(rX);
    setRotateY(rY);
    setGlareStyle({
      opacity: 0.15,
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlareStyle({ opacity: 0, x: 50, y: 50 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onSelect}
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1, 1, 1)`,
        transition: 'transform 0.1s ease-out, box-shadow 0.3s ease',
      }}
      className="group backdrop-blur-xl bg-white/70 rounded-[32px] border border-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden cursor-pointer relative"
    >
      {/* Specular Glare Effect */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-20 rounded-[32px]"
        style={{
          opacity: glareStyle.opacity,
          background: `radial-gradient(circle at ${glareStyle.x}% ${glareStyle.y}%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 80%)`,
        }}
      />

      {/* Card Top Banner with Product Image */}
      <div className="relative h-48 bg-gradient-to-b from-white/40 to-transparent overflow-hidden flex items-center justify-center p-4 border-b border-slate-100/80">
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-contain object-center group-hover:scale-110 transition-transform duration-500 drop-shadow-md" 
          />
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-900 flex items-center justify-center font-bold text-lg shadow-inner">
            {product.name.charAt(0)}
          </div>
        )}
        <span className="absolute top-3 left-3 backdrop-blur-xl bg-white/85 px-3 py-1 rounded-full text-[10px] font-bold text-slate-900 uppercase tracking-wider border border-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] truncate max-w-[140px] z-10">
          {product.category || 'General'}
        </span>
        
        {/* Top Right AR Camera Action Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
          <button
            onClick={(e) => onArView(product, e)}
            className="backdrop-blur-xl bg-slate-900/90 hover:bg-slate-950 text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow flex items-center gap-1 transition-transform hover:scale-105 border border-white/20"
            title="Project in Room (AR Camera)"
          >
            <Camera className="w-3 h-3 text-slate-300" /> AR View
          </button>
        </div>
      </div>

      {/* Card Body with Fully Visible Product Name & Harmonized Hover Text Colors */}
      <div className="p-6 flex-1 flex flex-col justify-between z-10">
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
          <h3 className="text-base font-bold text-slate-900 group-hover:text-slate-950 transition-colors line-clamp-2 min-h-[44px]">
            {product.name}
          </h3>
          <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Fixed Bottom Action Row with Matching Palette Colors */}
        <div className="mt-6 pt-4 border-t border-slate-100/80 flex items-center justify-between gap-2">
          <div>
            <span className="text-base font-extrabold text-slate-900">
              {typeof product.price === 'number' ? `$${product.price.toFixed(2)}` : product.price}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-slate-400 line-through ml-1.5">${product.originalPrice.toFixed(2)}</span>
            )}
          </div>
          <button
            onClick={(e) => onAddToCart(product, e)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0 ${
              isAdded
                ? 'bg-emerald-600 text-white scale-95'
                : 'bg-slate-900 hover:bg-slate-800 text-white hover:scale-105 shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-white/10'
            }`}
          >
            {isAdded ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Added
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" /> Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MasterStorefrontPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [addedItems, setAddedItems] = useState<{ [key: string]: boolean }>({});
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);
  const [arModalProduct, setArModalProduct] = useState<any | null>(null);
  const [arScale, setArScale] = useState(1);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  // User Authentication State
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Real Supabase session (replaces the old fake localStorage user)
  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const supabase = getSupabaseBrowserClient();
      const toUser = (u: any) =>
        u ? { name: u.user_metadata?.full_name || u.user_metadata?.name || u.email, email: u.email } : null;
      supabase.auth.getUser().then(({ data }) => setCurrentUser(toUser(data.user))).catch(() => {});
      const { data } = supabase.auth.onAuthStateChange((_e, session) => setCurrentUser(toUser(session?.user)));
      unsub = () => data.subscription.unsubscribe();
    } catch {
      // Supabase not configured: render as signed-out.
    }
    return () => unsub?.();
  }, []);

  const handleSignOut = async () => {
    try {
      await getSupabaseBrowserClient().auth.signOut();
    } catch {}
    setCurrentUser(null);
    window.location.assign('/');
  };

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
    title: idx === 0 ? "The Liquid Glass Standard for Smart Living" : idx === 1 ? "Meet Your AI Shopping Concierge" : "Zero-Friction Global Checkout",
    subtitle: p.description || "Experience next-gen smart gadgets and viral essentials curated with uncompromising quality.",
    badge: idx === 0 ? "✨ Featured Product" : idx === 1 ? "🚀 AI Spotlight Pick" : "🔒 Verified Best Seller",
    tag: `⭐ 4.8/5 · ${stockLabel(p.available).label}`,
    image: p.image || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80",
    productName: p.name,
    price: typeof p.price === 'number' ? `$${p.price.toFixed(2)}` : p.price
  })) : [
    {
      id: 1,
      title: "The Liquid Glass Standard for Smart Living",
      subtitle: "Experience next-gen smart gadgets and viral essentials curated with uncompromising quality.",
      badge: "✨ Apple Liquid Glass Curation",
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

  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = (product: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const cartProduct = toCartProduct(product);
    if (!cartProduct) {
      toast.error('This item cannot be added to the cart right now.');
      return;
    }
    const qtyOf = () =>
      useCartStore.getState().items.find((i) => String(i.product.id) === String(cartProduct.id))?.quantity ?? 0;
    const before = qtyOf();
    addItem(cartProduct); // persisted to localStorage ("pawnest-cart") by the store
    if (qtyOf() === before) {
      toast.error(`No more stock available for ${cartProduct.name}.`);
      return;
    }
    toast.success(`${cartProduct.name} added to your cart.`);
    setAddedItems(prev => ({ ...prev, [cartProduct.id]: true }));
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [cartProduct.id]: false }));
    }, 2000);
  };

  const handleArView = (product: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setArScale(1);
    setArModalProduct(product);
  };


  const categories = ['All', 'Beauty & Skincare', 'Smart Tech & Gadgets', 'Lifestyle & Home', 'Wellness & Fitness'];

  const filteredProducts = selectedCategory === 'All'
    ? allProducts
    : allProducts.filter(p => (p.category || '').toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div data-theme="light" className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      
      <SiteHeader onSelectSuggestion={(item: any) => setQuickViewProduct(item)} />

      {/* Apple Liquid Glass Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 relative z-0">
        <div className="relative overflow-hidden bg-slate-900 rounded-[36px] text-white py-20 sm:py-28 px-6 sm:px-14 shadow-[0_30px_70px_rgba(0,0,0,0.25)] min-h-[520px] flex flex-col justify-between border border-white/10">
          
          {/* Active Blended Slide Background Image */}
          {heroSlides.map((slide, index) => (
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
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-900/40"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/60"></div>
            </div>
          ))}

          {/* Liquid Refraction Orbs */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-slate-800/40 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-slate-700/30 rounded-full blur-[100px] pointer-events-none"></div>

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
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-full backdrop-blur-xl bg-white/10 text-slate-200 border border-white/20 shadow-[0_8px_20px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.4)]">
                    {slide.badge}
                  </span>
                  <span className="text-xs text-slate-300 font-medium backdrop-blur-xl bg-white/5 px-3 py-1 rounded-full border border-white/10">
                    {slide.tag}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 text-white leading-tight drop-shadow-md line-clamp-2">
                  {slide.productName}
                </h1>
                <p className="text-base sm:text-lg text-slate-300 mb-8 font-normal leading-relaxed max-w-2xl drop-shadow line-clamp-2">
                  {slide.subtitle}
                </p>

                {/* Liquid Glass Featured Product Highlight Pill */}
                <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-3xl backdrop-blur-2xl bg-white/10 border border-white/20 mb-8 shadow-[0_12px_30px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.4)]">
                  <div className="w-10 h-10 rounded-2xl overflow-hidden bg-white shrink-0 flex items-center justify-center p-1 shadow">
                    <img src={slide.image} alt={slide.productName} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-300 font-bold block">Featured Database Item</span>
                    <span className="text-xs font-bold text-white">{slide.productName} • <span className="text-slate-300">{slide.price}</span></span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <a
                    href="#catalog"
                    className="px-8 py-3.5 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs sm:text-sm rounded-full shadow-[0_10px_30px_rgba(255,255,255,0.2)] transition-all duration-200 hover:scale-105 flex items-center gap-2"
                  >
                    Explore All {allProducts.length} Items <ArrowRight className="w-4 h-4" />
                  </a>
                  {!currentUser && (
                    <a
                      href="/signup"
                      className="px-8 py-3.5 backdrop-blur-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-full border border-white/20 transition-all duration-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]"
                    >
                      Create Account
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Interactive AI Prompt Chips & Slide Indicators Bottom Bar */}
          <div className="relative z-10 pt-12 mt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Clickable AI Prompt Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mr-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Try Asking AI:
              </span>
              {SUGGESTED_PROMPTS.map((promptText, i) => (
                <button
                  key={i}
                  onClick={() => handleAiSearch(promptText.replace(/^[^\s]+\s/, ''))}
                  className="px-3.5 py-1.5 rounded-full backdrop-blur-xl bg-white/10 hover:bg-white/20 text-xs text-slate-200 font-medium transition-all border border-white/15 hover:border-white/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
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
                    index === currentSlide ? 'w-8 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'w-2 bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

          </div>

        </div>
      </section>

      {/* Trust Badges Liquid Glass Bento Row */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="backdrop-blur-xl bg-white/80 border border-white/90 p-4 rounded-3xl shadow-[0_10px_30px_rgb(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.8)] flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-900 shadow-inner"><ShieldCheck className="w-5 h-5" /></div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">30-Day Risk-Free</h4>
              <p className="text-[11px] text-slate-500">100% money-back guarantee</p>
            </div>
          </div>
          <div className="backdrop-blur-xl bg-white/80 border border-white/90 p-4 rounded-3xl shadow-[0_10px_30px_rgb(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.8)] flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-900 shadow-inner"><Truck className="w-5 h-5" /></div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Fast & Tracked</h4>
              <p className="text-[11px] text-slate-500">Live courier tracking updates</p>
            </div>
          </div>
          <div className="backdrop-blur-xl bg-white/80 border border-white/90 p-4 rounded-3xl shadow-[0_10px_30px_rgb(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.8)] flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-900 shadow-inner"><Lock className="w-5 h-5" /></div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Secure Checkout</h4>
              <p className="text-[11px] text-slate-500">Encrypted 256-bit SSL</p>
            </div>
          </div>
          <div className="backdrop-blur-xl bg-white/80 border border-white/90 p-4 rounded-3xl shadow-[0_10px_30px_rgb(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.8)] flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-900 shadow-inner"><Star className="w-5 h-5" /></div>
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
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Showing {filteredProducts.length} live Supabase products with interactive 3D Liquid Glass tilt effects & AR room projection.</p>
          </div>

          {/* Liquid Glass Category Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all shadow-sm ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-slate-900 text-white shadow-[0_8px_20px_rgba(0,0,0,0.2)] scale-105'
                    : 'backdrop-blur-xl bg-white/80 text-slate-700 hover:bg-white border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Bento Product Grid with Interactive 3D Tilt Glass Cards */}
        {loadingProducts ? (
          <div className="text-center py-20 text-slate-500 animate-pulse text-sm">Loading your Supabase inventory...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 backdrop-blur-xl bg-white/80 rounded-3xl border border-white/90 p-8 space-y-2 shadow-[0_15px_40px_rgba(0,0,0,0.05)]">
            <h3 className="text-lg font-bold text-slate-900">No products found in this category</h3>
            <p className="text-xs text-slate-500">Try selecting "All" or searching with our AI concierge.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <GlassTiltCard
                key={product.id}
                product={product}
                onSelect={() => setQuickViewProduct(product)}
                onAddToCart={handleAddToCart}
                onArView={handleArView}
                isAdded={!!addedItems[String(product.id)]}
              />
            ))}
          </div>
        )}
      </main>

      {/* AR Camera Room Projection Modal */}
      {arModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="backdrop-blur-[50px] bg-slate-950/90 border border-white/20 w-full max-w-3xl rounded-[36px] p-6 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.7)] text-white relative animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/10 text-slate-200 border border-white/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" /> AR Room Projection Mode
                </span>
                <span className="text-xs text-slate-400">Live Camera Feed Simulated</span>
              </div>
              <button 
                onClick={() => setArModalProduct(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Live AR Camera Room View */}
            <div className="my-6 relative h-80 sm:h-[400px] rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-white/15 flex items-center justify-center p-6 shadow-inner group">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.1)_0,transparent_70%)]"></div>
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-900/80 to-transparent border-t border-white/10"></div>
              
              {/* Projected AR Product with Dynamic Scaling */}
              <div 
                className="relative z-10 transition-transform duration-200 flex items-center justify-center"
                style={{ transform: `scale(${arScale})` }}
              >
                {arModalProduct.image ? (
                  <img 
                    src={arModalProduct.image} 
                    alt={arModalProduct.name} 
                    className="max-h-60 max-w-xs object-contain drop-shadow-[0_25px_35px_rgba(0,0,0,0.9)] filter brightness-105" 
                  />
                ) : (
                  <div className="text-2xl font-bold">{arModalProduct.name}</div>
                )}
              </div>

              {/* AR Surface Detection Reticle */}
              <div className="absolute bottom-10 inset-x-0 flex flex-col items-center gap-2 z-20">
                <div className="px-4 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md text-[11px] font-bold text-white shadow-[0_4px_15px_rgba(0,0,0,0.4)] border border-white/20 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Surface Detected: Floor & Table Plane Locked
                </div>
                
                {/* Scale Control Slider */}
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 text-xs">
                  <span className="text-slate-400 font-medium">Scale:</span>
                  <input 
                    type="range" 
                    min="0.6" 
                    max="1.6" 
                    step="0.1" 
                    value={arScale}
                    onChange={(e) => setArScale(parseFloat(e.target.value))}
                    className="w-32 accent-slate-300 cursor-pointer"
                  />
                  <span className="font-bold text-slate-200">{Math.round(arScale * 100)}%</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-bold">{arModalProduct.name}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">Position this item directly into your physical room using your device's camera and LiDAR sensor.</p>
              
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xl font-extrabold text-white">
                    {typeof arModalProduct.price === 'number' ? `$${arModalProduct.price.toFixed(2)}` : arModalProduct.price}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { handleAddToCart(arModalProduct); setArModalProduct(null); }}
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-lg border border-white/10 transition-all flex items-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" /> Add to Cart & Buy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apple Liquid Glass Quick View Modal Sheet with Express Checkout */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="backdrop-blur-[40px] bg-white/90 w-full max-w-lg rounded-t-[36px] sm:rounded-[36px] p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.25)] border border-white animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900">{quickViewProduct.category || 'General'}</span>
              <button 
                onClick={() => setQuickViewProduct(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {quickViewProduct.image && (
              <div className="mt-4 h-56 rounded-3xl overflow-hidden bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4 border border-slate-100 shadow-inner">
                <img src={quickViewProduct.image} alt={quickViewProduct.name} className="w-full h-full object-contain drop-shadow-lg" />
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
                <span className="ml-auto px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200">
                  {stockLabel(quickViewProduct.available).label}
                </span>
              </div>
            </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => { handleAddToCart(quickViewProduct); setQuickViewProduct(null); }}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-all text-xs flex items-center justify-center gap-2 hover:scale-[1.01]"
              >
                <ShoppingBag className="w-4 h-4" /> Add to Standard Bag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="backdrop-blur-xl bg-white/60 border-t border-slate-200/80 py-12 px-4 sm:px-8 mt-12 text-center text-xs text-slate-500 shadow-inner">
        <p>© 2026 AuraFinds Storefront. Apple Liquid Glass 3D Edition. Powered by Next.js & Google Generative AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
