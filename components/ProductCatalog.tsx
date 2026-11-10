'use client';

import React, { useState } from 'react';
import { ShoppingBag, Star, CheckCircle2 } from 'lucide-react';

const FEATURED_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Viral Smart Beauty Gadget',
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
    name: 'Ambient Warm LED Desk Lamp & Qi Charger',
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
    name: 'Aesthetic Linen Throw Pillow & Comfort Set',
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

export default function ProductCatalog() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [addedItems, setAddedItems] = useState<{ [key: string]: boolean }>({});

  const categories = ['All', 'Beauty & Skincare', 'Smart Tech & Gadgets', 'Lifestyle & Home', 'Wellness & Fitness'];

  const filteredProducts = selectedCategory === 'All' 
    ? FEATURED_PRODUCTS 
    : FEATURED_PRODUCTS.filter(p => p.category === selectedCategory);

  const handleAddToCart = (product: any) => {
    setAddedItems(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [product.id]: false }));
    }, 2000);
  };

  return (
    <div className="space-y-8">
      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all shadow-sm ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white shadow-indigo-200 scale-105'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1"
          >
            {/* Product Badge Box */}
            <div className="relative p-6 pb-2 bg-gradient-to-tr from-indigo-50 to-purple-50 flex items-center justify-between">
              <span className="bg-white px-2.5 py-1 rounded-full text-[10px] font-bold text-indigo-700 uppercase tracking-wider border border-indigo-100 shadow-sm">
                {product.category}
              </span>
              <span className="text-xs font-medium text-slate-500">
                {product.available} left
              </span>
            </div>

            {/* Product Details */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-700">{product.rating}</span>
                  <span className="text-xs text-slate-400">({product.reviewsCount})</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {product.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                  {product.description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-lg font-extrabold text-slate-900">${product.price.toFixed(2)}</span>
                  <span className="text-xs text-slate-400 line-through ml-2">${product.originalPrice.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => handleAddToCart(product)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md ${
                    addedItems[product.id]
                      ? 'bg-emerald-600 text-white scale-95'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105'
                  }`}
                >
                  {addedItems[product.id] ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Added!
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" /> Add to Cart
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
