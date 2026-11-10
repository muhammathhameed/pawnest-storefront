import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').toLowerCase().trim();

  const catalog = [
    { id: 'prod-1', name: 'Viral Smart Beauty & Toning Device', category: 'Beauty & Skincare', price: '$39.99', description: 'Advanced ultrasonic facial rejuvenation and microcurrent toning device for professional at-home skincare.' },
    { id: 'prod-2', name: 'Ambient Warm LED Desk Lamp & Qi Wireless Charger', category: 'Smart Tech & Gadgets', price: '$49.99', description: 'Sleek aluminum desk companion featuring wireless fast-charging pad and adjustable color temperature.' },
    { id: 'prod-3', name: 'Aesthetic Organic Linen Throw Pillow Set', category: 'Lifestyle & Home', price: '$29.99', description: 'Hand-woven textured organic linen cushion cover designed to elevate living room comfort.' },
    { id: 'prod-4', name: 'Ergonomic Posture Correction Harness', category: 'Wellness & Fitness', price: '$34.99', description: 'Lightweight, breathable posture trainer designed to relieve back strain and align spine.' }
  ];

  if (!q) {
    return Response.json({ recommendations: catalog });
  }

  // Tokenize query words
  const searchTerms = q.split(/\s+/).filter(term => term.length > 1);

  // Score and filter products strictly by keyword overlap
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

  // Sort by highest score descending
  scoredMatches.sort((a, b) => b.score - a.score);

  const matchedProducts = scoredMatches.map(item => item.product);

  return Response.json({ 
    recommendations: matchedProducts.length > 0 ? matchedProducts : [] 
  });
}
