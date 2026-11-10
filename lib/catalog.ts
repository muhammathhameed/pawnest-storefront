export const catalogCategories = [
  {
    slug: "pet-care",
    name: "Pet Care",
    description: "Thoughtful everyday essentials for your favorite companions.",
    terms: ["pet", "collar", "leash", "bed", "toy", "bowl", "groom", "cat", "dog"],
  },
  {
    slug: "beauty-skincare",
    name: "Beauty & Skincare",
    description: "Feel-good beauty finds for your daily care ritual.",
    terms: ["beauty", "skincare", "skin care", "serum", "makeup", "cosmetic"],
  },
  {
    slug: "smart-tech-gadgets",
    name: "Smart Tech & Gadgets",
    description: "Clever tech and useful gadgets that make life easier.",
    terms: ["smart", "tech", "gadget", "charger", "led", "wireless", "device"],
  },
] as const;

export function getCatalogCategory(slug: string) {
  return catalogCategories.find((category) => category.slug === slug);
}

export function productMatchesCategory(
  product: { name: string; category?: string | null; tags?: string[] | null },
  slug: string,
) {
  const category = getCatalogCategory(slug);
  if (!category) return false;
  const searchable = [
    product.name,
    product.category ?? "",
    ...(product.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return category.terms.some((term) => searchable.includes(term));
}
