import { createClient } from '@/lib/supabase/browser';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').toLowerCase().trim();

  let dbProducts: any[] = [];

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(100);
    if (!error && data && data.length > 0) {
      dbProducts = data.map((p: any) => {
        const rawPrice = typeof p.price === 'number' ? p.price : parseFloat(p.price) || 29.99;
        return {
          id: p.id,
          name: p.name || 'Curated Product',
          category: p.category || 'General',
          price: rawPrice,
          originalPrice: rawPrice * 1.3,
          rating: 4.8,
          reviewsCount: 120,
          description: p.description || 'Hand-picked viral essential curated for modern living.',
          available: Number.isFinite(Number(p.stock_quantity)) ? Number(p.stock_quantity) : 0,
          image: p.image_url || ''
        };
      });
    }
  } catch (err) {
    // fallback if supabase query fails
  }

  const fallbackCatalog = [
    { id: 'prod-1', name: 'Viral Smart Beauty & Toning Device', category: 'Beauty & Skincare', price: 39.99, originalPrice: 59.99, rating: 4.9, reviewsCount: 142, description: 'Advanced ultrasonic facial rejuvenation and microcurrent toning device for professional at-home skincare.', available: 120 },
    { id: 'prod-2', name: 'Ambient Warm LED Desk Lamp & Qi Wireless Charger', category: 'Smart Tech & Gadgets', price: 49.99, originalPrice: 69.99, rating: 4.8, reviewsCount: 98, description: 'Sleek aluminum desk companion featuring wireless fast-charging pad and adjustable color temperature.', available: 85 },
    { id: 'prod-3', name: 'Aesthetic Organic Linen Throw Pillow Set', category: 'Lifestyle & Home', price: 29.99, originalPrice: 45.00, rating: 5.0, reviewsCount: 215, description: 'Hand-woven textured organic linen cushion cover designed to elevate living room comfort.', available: 200 },
    { id: 'prod-4', name: 'Ergonomic Posture Correction Harness', category: 'Wellness & Fitness', price: 34.99, originalPrice: 50.00, rating: 4.7, reviewsCount: 76, description: 'Lightweight, breathable posture trainer designed to relieve back strain and align spine.', available: 64 }
  ];

  const catalog = dbProducts.length > 0 ? dbProducts : fallbackCatalog;

  if (!q) {
    return Response.json({ recommendations: catalog });
  }

  const searchTerms = q.split(/\s+/).filter(term => term.length > 1);

  const scoredMatches = catalog.map(product => {
    const text = `${product.name} ${product.category} ${product.description}`.toLowerCase();
    let score = 0;
    for (const term of searchTerms) {
      if (text.includes(term)) {
        score += 1;
      }
    }
    return { product, score };
  }).filter(item => item.score > 0);

  scoredMatches.sort((a, b) => b.score - a.score);

  const matchedProducts = scoredMatches.map(item => item.product);

  return Response.json({ 
    recommendations: matchedProducts.length > 0 ? matchedProducts : catalog 
  });
}
