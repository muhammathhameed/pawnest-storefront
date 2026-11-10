// app/api/concierge/route.ts
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const { data: products, error } = await supabase.from("products").select("*").limit(25);
    if (error || !products) {
      return NextResponse.json({ error: "Failed to fetch catalog" }, { status: 500 });
    }

    const catalogContext = JSON.stringify(products);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are AuraFinds' AI Shopping Concierge. 
      User Query: "${prompt}"
      Available Catalog: ${catalogContext}
      
      Task: Select up to 3 most relevant products from the catalog that match the user's intent. 
      Return ONLY a valid JSON array of objects with keys: id, name, price, and match_reason. No markdown formatting around the JSON, just the raw JSON array.`
    });

    let rawText = response.text || "[]";
    rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const recommendations = JSON.parse(rawText);

    return NextResponse.json({ recommendations });
  } catch (err: any) {
    console.error("Concierge API Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
