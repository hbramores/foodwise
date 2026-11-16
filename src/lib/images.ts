import calamares from "../images/menu/calamares.webp";
import friedChicken from "../images/menu/fried-chicken.webp";
import mushroomSoup from "../images/menu/creamy-mushroom-soup.webp";
import potatoSalad from "../images/menu/german-potato-salad.webp";
import affogato from "../images/menu/affogato.webp";
import watermelonSmoothie from "../images/menu/watermelon-smoothie.webp";

/**
 * One shared food-photography reference for the seeded menu, so POS, Menu &
 * Recipes, Forecasting and the Product Details panel all show the same photo.
 *
 * The images live in src/images/menu and are bundled by Vite (hashed + cached
 * in production). Products added by a user keep their own uploaded/catalogued
 * image, which `productImage()` falls back to.
 */
export const PRODUCT_IMAGES: Record<string, string> = {
  "p-calamares": calamares,
  "p-fried-chicken": friedChicken,
  "p-mushroom-soup": mushroomSoup,
  "p-potato-salad": potatoSalad,
  "p-affogato": affogato,
  "p-watermelon-smoothie": watermelonSmoothie,
};

/** Options offered by the product image picker. */
export const IMAGE_LIBRARY: Array<{ label: string; value: string }> = [
  { label: "Calamares", value: calamares },
  { label: "Fried Chicken", value: friedChicken },
  { label: "Creamy Mushroom Soup", value: mushroomSoup },
  { label: "German Potato Salad", value: potatoSalad },
  { label: "Affogato", value: affogato },
  { label: "Watermelon Smoothie", value: watermelonSmoothie },
];

/** Resolves the photograph for a product, preferring the shared catalogue. */
export function productImage(product: { id: string; image?: string | null }): string | null {
  return PRODUCT_IMAGES[product.id] ?? product.image ?? null;
}

/** Fallback mark shown when a product has no photograph at all. */
export function productInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}
