'use client';

import React, { useState, useEffect } from 'react';
import ProductCatalog from '@/components/ProductCatalog';
import ProductBundler from '@/components/ProductBundler';
import TrustBadges from '@/components/TrustBadges';

const HERO_SLIDES = [
  {
    id: 1,
    title: "Next-Gen WebAR & Smart Storefront",
    subtitle: "Experience products in augmented reality and get instant AI concierge recommendations.",
    badge: "🚀 Featured Innovation",
    bg: "from-indigo-900 via-purple-900 to-slate-900"
  },
  {
    id: 2,
    title: "Curated Viral Finds Across Every Category",
    subtitle: "Hand-picked high-demand gadgets, beauty essentials, and tech accessories with lightning-fast fulfillment.",
    badge: "🔥 Trending Now",
    bg: "from-blue-900 via-slate-900 to-indigo-950"
  },
  {
    id: 3,
    title: "AI-Powered Product Bundles & Savings",
    subtitle: "Unlock instant bundle discounts and seamless problem-to-solution product combinations.",
    badge: "✨ Special Offers",
    bg: "from-emerald-950 via-teal-900 to-slate-900"
  }
];

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero Product Slideshow Banner */}
      <section className="relative overflow-hidden bg-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8 shadow-xl">
        <div className="max-w-7xl mx-auto relative z-10 min-h-[260px] flex flex-col justify-center items-center text-center transition-all duration-700 ease-in-out">
          {HERO_SLIDES.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-1000 ease-in-out px-4 ${
                index === currentSlide ? 'opacity-100 pointer-events-auto scale-100' : 'opacity-0 pointer-events-none scale-95'
              }`}
            >
              <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold uppercase tracking-wider rounded-full bg-white/10 backdrop-blur-md text-indigo-300 border border-white/20">
                {slide.badge}
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-3 text-white">
                {slide.title}
              </h1>
              <p className="max-w-2xl text-base sm:text-lg text-slate-300 mb-6">
                {slide.subtitle}
              </p>
              <div className="flex gap-3">
                <a
                  href="#catalog"
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg transition-all duration-200 hover:scale-105"
                >
                  Explore Collection
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Slide Indicators */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
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
      </section>

      {/* Trust Badges Bar */}
      <TrustBadges />

      {/* Main Catalog & Bundler Section */}
      <main id="catalog" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <ProductBundler />
        <ProductCatalog products={[]} />
      </main>
    </div>
  );
}
