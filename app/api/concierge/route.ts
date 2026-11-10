import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';

  const catalog = [
    { id: 'prod-1', name: 'Viral Smart Beauty & Toning Device', category: 'Beauty & Skincare', price: '$39.99', description: 'Advanced ultrasonic facial rejuvenation and microcurrent toning device.' },
    { id: 'prod-2', name: 'Ambient Warm LED Desk Lamp & Qi Wireless Charger', category: 'Smart Tech & Gadgets', price: '$49.99', description: 'Sleek aluminum desk companion featuring wireless fast-charging pad.' },
    { id: 'prod-3', name: 'Aesthetic Organic Linen Throw Pillow Set', category: 'Lifestyle & Home', price: '$29.99', description: 'Hand-woven textured organic linen cushion cover.' },
    { id: 'prod-4', name: 'Ergonomic Posture Correction Harness', category: 'Wellness & Fitness', price: '$34.99', description: 'Lightweight, breathable posture trainer designed to relieve back strain.' }
  ];

  if (!q.trim()) {
    return Response.json({ recommendations: catalog });
  }

  const matches = catalog.filter(p => 
    p.name.toLowerCase().includes(q.toLowerCase()) || 
    p.category.toLowerCase().includes(q.toLowerCase()) ||
    p.description.toLowerCase().includes(q.toLowerCase())
  );

  return Response.json({ recommendations: matches.length > 0 ? matches : catalog });
}
