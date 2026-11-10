import { createClient } from '@/lib/supabase/browser';

export async function searchStoreProducts(query: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(10);

  if (error || !data || data.length === 0) {
    // Fallback static catalog match if DB is empty/unreachable
    const staticProducts = [
      { id: 'prod-1', name: 'Viral Smart Beauty & Toning Device', category: 'Beauty & Skincare', price: 39.99, description: 'Advanced ultrasonic facial rejuvenation and microcurrent toning device.' },
      { id: 'prod-2', name: 'Ambient Warm LED Desk Lamp & Qi Wireless Charger', category: 'Smart Tech & Gadgets', price: 49.99, description: 'Sleek aluminum desk companion featuring wireless fast-charging pad.' },
      { id: 'prod-3', name: 'Aesthetic Organic Linen Throw Pillow Set', category: 'Lifestyle & Home', price: 29.99, description: 'Hand-woven textured organic linen cushion cover.' },
      { id: 'prod-4', name: 'Ergonomic Posture Correction Harness', category: 'Wellness & Fitness', price: 34.99, description: 'Lightweight, breathable posture trainer designed to relieve back strain.' }
    ];
    return staticProducts.filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase()) || 
      p.category.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase())
    );
  }
  return data;
}
