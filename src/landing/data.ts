/**
 * Static content used by the cinematic landing page. Values mirror the
 * FoodWise PH demo data exactly (see src/lib/demo.ts and scripts/verify.ts)
 * so the marketing story never disagrees with the working prototype.
 */

export interface LandingDish {
  id: string;
  name: string;
  category: string;
  image: string;
  ingredients: string[];
  /** Five most recent recorded sales days. */
  sales: number[];
}

export const LANDING_DISHES: LandingDish[] = [
  {
    id: "calamares",
    name: "Calamares",
    category: "Appetizer",
    image: "/dishes/calamares.jpg",
    sales: [12, 8, 10, 11, 9],
    ingredients: [
      "Fresh Squid",
      "All-purpose flour",
      "Cornstarch",
      "Eggs",
      "Breadcrumbs",
      "Salt & pepper",
      "Garlic powder",
      "Cooking oil",
      "Spicy dip",
      "Lemon",
    ],
  },
  {
    id: "fried-chicken",
    name: "Fried Chicken",
    category: "Main Course",
    image: "/dishes/fried-chicken.jpg",
    sales: [41, 47, 36, 44, 42],
    ingredients: [
      "Chicken pieces",
      "All-purpose flour",
      "Cornstarch",
      "Eggs",
      "Salt & pepper",
      "Garlic powder",
      "Cooking oil",
      "Gravy mix",
    ],
  },
  {
    id: "mushroom-soup",
    name: "Creamy Mushroom Soup",
    category: "Soup",
    image: "/dishes/mushroom-soup.jpg",
    sales: [18, 22, 11, 16, 18],
    ingredients: [
      "Fresh mushrooms",
      "Butter",
      "Garlic",
      "Onion",
      "All-purpose flour",
      "Fresh milk",
      "All-purpose cream",
      "Chicken stock",
      "Salt & pepper",
    ],
  },
  {
    id: "potato-salad",
    name: "German Potato Salad",
    category: "Salad",
    image: "/dishes/potato-salad.jpg",
    sales: [23, 18, 28, 21, 25],
    ingredients: [
      "Potatoes",
      "Bacon",
      "Onion",
      "Vinegar",
      "Mustard",
      "Cooking oil",
      "Salt & pepper",
      "Parsley",
    ],
  },
  {
    id: "affogato",
    name: "Affogato",
    category: "Dessert",
    image: "/dishes/affogato.jpg",
    sales: [21, 16, 11, 18, 14],
    ingredients: ["Vanilla ice cream", "Espresso"],
  },
  {
    id: "watermelon-smoothie",
    name: "Watermelon Smoothie",
    category: "Beverage",
    image: "/dishes/watermelon-smoothie.jpg",
    sales: [16, 18, 16, 20, 15],
    ingredients: ["Fresh watermelon", "Ice", "Sugar", "Milk"],
  },
];

export const HERO_IMAGE = "/dishes/fried-chicken.jpg";

/** Illustrative overproduction numbers for the problem scene. */
export const PROBLEM = { prepared: 70, sold: 45, unsold: 25 };

export interface ForecastResult {
  values: (number | null)[];
  total: number;
  eligible: number;
  average: number | null;
  /** Same rounding behaviour as the prototype: Math.round(avg). */
  recommended: number | null;
}

/** Mirrors computeForecast() in src/lib/forecast.ts (recorded values only). */
export function forecastFrom(values: (number | null)[]): ForecastResult {
  const used = values.filter((v): v is number => v !== null && Number.isFinite(v));
  const total = used.reduce((sum, v) => sum + v, 0);
  const average = used.length ? total / used.length : null;
  return {
    values,
    total,
    eligible: used.length,
    average,
    recommended: average === null ? null : Math.round(average),
  };
}

export const FORECAST_EXAMPLE = {
  dish: "Fried Chicken",
  values: [41, 47, 36, 44, 42] as (number | null)[],
};
