'use client';

import { stockLabel } from '../lib/stock';

import React, { useState } from 'react';
import { ShoppingBag, Star, CheckCircle2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewsCount: number;
  description: string;
  available: number;
}

interface ProductCatalogProps {
  products?: any[];
  initialCategory?: string;
  reviewSummaries?: Record<string, any>;
  showCollectionHeading?: boolean;
}

const DEFAULT_PRODUCTS: Product[] = [
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

export default function ProductCatalog({
  products = DEFAULT_PRODUCTS,
  initialCategory = 'All',
  showCollectionHeading = true
}: ProductCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [addedItems, setAddedItems] = useState<{ [key: string]: boolean }>({});

  const categories = ['All', 'Beauty & Skincare', 'Smart Tech & Gadgets', 'Lifestyle & Home', 'Wellness & Fitness'];

  const displayProducts = products && products.length > 0 ? products : DEFAULT_PRODUCTS;

  const normalizedProducts: Product[] = displayProducts.map((p: any) => ({
    id: p.id || Math.random().toString(),
    name: p.name || 'Curated Product',
    category: p.category || 'General',
    price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 29.99,
    originalPrice: p.originalPrice || (typeof p.price === 'number' ? p.price * 1.3 : 39.99),
    rating: p.rating || 4.8,
    reviewsCount: p.reviewsCount || 100,
    description: p.description || p.summary || 'Curated to make everyday life a little more delightful.',
    available: p.available || 50
  }));

  const filteredProducts = selectedCategory === 'All' 
    ? normalizedProducts 
    : normalizedProducts.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase() || selectedCategory === 'All');

  const handleAddToCart = (product: Product) => {
    setAddedItems(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [product.id]: false }));
    }, 2000);
  };

  return (
    <div className="space-y-8">
      {showCollectionHeading && (
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">Shop the Collection</h2>
          <p className="text-sm text-muted max-w-xl mx-auto">Curated viral finds and smart essentials across every category.</p>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all shadow-sm ${
              selectedCategory.toLowerCase() === cat.toLowerCase()
                ? 'bg-brand text-[var(--on-primary)] shadow-indigo-200 scale-105'
                : 'bg-card text-ink hover:bg-surface border border-line'
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
            className="group bg-card rounded-2xl border border-line shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1"
          >
            {/* Product Badge Box */}
            <div className="relative p-6 pb-2 bg-gradient-to-tr from-brand/10 to-brand-2/10 flex items-center justify-between">
              <span className="bg-card px-2.5 py-1 rounded-full text-[10px] font-bold text-brand uppercase tracking-wider border border-line shadow-sm">
                {product.category}
              </span>
              <span className="text-xs font-medium text-muted">
                {stockLabel(product.available).label}
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
                  <span className="text-xs font-bold text-ink">{product.rating}</span>
                  <span className="text-xs text-muted">({product.reviewsCount})</span>
                </div>
                <h3 className="text-base font-bold text-ink group-hover:text-brand transition-colors line-clamp-1">
                  {product.name}
                </h3>
                <p className="text-xs text-muted mt-1.5 line-clamp-2">
                  {product.description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-line flex items-center justify-between">
                <div>
                  <span className="text-lg font-extrabold text-ink">${Number(product.price).toFixed(2)}</span>
                  <span className="text-xs text-muted line-through ml-2">${Number(product.originalPrice).toFixed(2)}</span>
                </div>
                <button
                  onClick={() => handleAddToCart(product)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md ${
                    addedItems[product.id]
                      ? 'bg-success text-[var(--on-primary)] scale-95'
                      : 'bg-brand hover:opacity-90 text-[var(--on-primary)] hover:scale-105'
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
