import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { ProductPipelineConfigurationError } from "./errors";

const productCopySchema = z.object({
  title: z.string().describe("Optimized, SEO-friendly product title"),
  description: z.string().describe("Compelling marketing description highlighting key features and benefits"),
  features: z.array(z.string()).describe("List of 3-5 key product features or bullet points"),
  tags: z.array(z.string()).describe("Relevant tags or categories for storefront navigation"),
});

export type EnrichedProductCopy = z.infer<typeof productCopySchema>;

interface EnrichOptions {
  rawProductData: {
    title?: string;
    description?: string;
    category?: string;
    attributes?: Record<string, any>;
  };
  modelId?: string;
  apiKey?: string;
}

export async function enrichProductData({
  rawProductData,
  modelId = "gemini-2.5-flash",
  apiKey,
}: EnrichOptions): Promise<EnrichedProductCopy> {
  const resolvedApiKey = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

  if (!resolvedApiKey) {
    throw new ProductPipelineConfigurationError(
      "Missing Google Generative AI API key. Please configure GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY."
    );
  }

  const cleanModelId = modelId.replace(/^google\//, "");

  const { object } = await generateObject({
    model: google(cleanModelId),
    schema: productCopySchema,
    system:
      "You are an expert e-commerce copywriter and product enrichment specialist. Transform raw supplier product data into polished, high-converting, SEO-optimized product listings.",
    prompt: `Please enrich the following raw product data:\n${JSON.stringify(rawProductData, null, 2)}`,
  });

  return object;
}
