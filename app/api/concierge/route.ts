import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY });

// Mock catalog data for fallback / hybrid retrieval
const CATALOG = [
  { id: '1', name: 'Minimalist Oak Desk Organizer', price: 34.99, category: 'decor', tags: ['minimalist', 'desk', 'office', 'wood'] },
  { id: '2', name: 'Ambient Warm LED Desk Lamp', price: 42.00, category: 'lighting', tags: ['minimalist', 'lighting', 'desk'] },
  { id: '3', name: 'Ergonomic Walnut Monitor Stand', price: 59.99, category: 'workspace', tags: ['ergonomic', 'desk', 'wood'] },
  { id: '4', name: 'Aesthetic Linen Throw Pillow', price: 28.50, category: 'decor', tags: ['minimalist', 'living room', 'comfort'] },
];

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      // Fallback keyword matcher if API key is not configured
      const filtered = CATALOG.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.tags.some(t => query.toLowerCase().includes(t))
      );
      return NextResponse.json({
        recommendations: filtered.length > 0 ? filtered : CATALOG.slice(0, 2),
        justification: "Curated based on keyword match with your catalog items."
      });
    }

    // Use Google Generative AI to parse user intent and select items from catalog
    const prompt = `You are an AI e-commerce concierge for Pawnest Storefront. 
User query: "${query}"

Here is our product catalog JSON:
${JSON.stringify(CATALOG)}

Select the most relevant products from the catalog matching the user's intent. Return ONLY a valid JSON object with format:
{
  "recommendations": [/* array of matching product objects from catalog */],
  "justification": "Short, friendly explanation why these fit the user's request."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const responseText = response.text || '';
    // Clean potential markdown wrappers
    const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJson);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Concierge API Error:', error);
    // Graceful fallback on AI failure
    return NextResponse.json({
      recommendations: CATALOG.slice(0, 2),
      justification: "Here are some top-rated items tailored for your space."
    });
  }
}
