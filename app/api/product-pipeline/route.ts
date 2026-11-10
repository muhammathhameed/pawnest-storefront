import { NextResponse } from "next/server";
import { processSupplierProduct } from "@/lib/product-pipeline/sync";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await processSupplierProduct(body);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Product pipeline sync error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "Product pipeline API is active" }, { status: 200 });
}
