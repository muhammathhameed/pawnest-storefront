import { redirect } from "next/navigation";

// The product catalog lives on the homepage (#catalog). /shop is the canonical entry link.
export default function ShopPage() {
  redirect("/#catalog");
}
