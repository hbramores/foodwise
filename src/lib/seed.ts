import {
  DATA_VERSION,
  DEFAULT_SETTINGS,
  type AppData,
  type ClosingLineItem,
  type ClosingRecord,
  type Ingredient,
  type InventoryMovement,
  type MenuCategory,
  type MenuProduct,
  type OperatingDay,
  type POSTransaction,
  type PaymentMethod,
  type PreparationBatch,
  type RecipeItem,
  type Unit,
} from "../types";
import { addDaysISO, lastNDates, manilaToday } from "./date";
import { convertQty, round3 } from "./units";
import { uid } from "./id";
import { PRODUCT_IMAGES } from "./images";

/* ------------------------------------------------------------- ingredients */

interface IngredientSeed {
  id: string;
  name: string;
  category: Ingredient["category"];
  unit: Unit;
  stock: number;
  lowThreshold: number;
}

/** PRD v2.1 §8 — 29 seeded ingredients with initial stock and thresholds. */
export const INGREDIENT_SEED: IngredientSeed[] = [
  { id: "ing-squid", name: "Fresh squid", category: "Meat & Seafood", unit: "kg", stock: 15, lowThreshold: 3 },
  { id: "ing-chicken", name: "Chicken pieces", category: "Meat & Seafood", unit: "kg", stock: 30, lowThreshold: 5 },
  { id: "ing-bacon", name: "Bacon", category: "Meat & Seafood", unit: "kg", stock: 5, lowThreshold: 1 },
  { id: "ing-mushrooms", name: "Fresh mushrooms", category: "Produce", unit: "kg", stock: 8, lowThreshold: 2 },
  { id: "ing-garlic", name: "Garlic", category: "Produce", unit: "kg", stock: 3, lowThreshold: 0.5 },
  { id: "ing-onion", name: "Onion", category: "Produce", unit: "kg", stock: 8, lowThreshold: 2 },
  { id: "ing-potatoes", name: "Potatoes", category: "Produce", unit: "kg", stock: 20, lowThreshold: 4 },
  { id: "ing-parsley", name: "Parsley", category: "Produce", unit: "kg", stock: 1, lowThreshold: 0.2 },
  { id: "ing-lemon", name: "Lemon", category: "Produce", unit: "pcs", stock: 40, lowThreshold: 10 },
  { id: "ing-watermelon", name: "Fresh watermelon", category: "Produce", unit: "kg", stock: 25, lowThreshold: 5 },
  { id: "ing-butter", name: "Butter", category: "Dairy & Eggs", unit: "kg", stock: 5, lowThreshold: 1 },
  { id: "ing-milk", name: "Fresh milk", category: "Dairy & Eggs", unit: "L", stock: 15, lowThreshold: 3 },
  { id: "ing-cream", name: "All-purpose cream", category: "Dairy & Eggs", unit: "L", stock: 10, lowThreshold: 2 },
  { id: "ing-icecream", name: "Vanilla ice cream", category: "Dairy & Eggs", unit: "L", stock: 15, lowThreshold: 3 },
  { id: "ing-eggs", name: "Eggs", category: "Dairy & Eggs", unit: "pcs", stock: 120, lowThreshold: 24 },
  { id: "ing-flour", name: "All-purpose flour", category: "Dry Goods", unit: "kg", stock: 20, lowThreshold: 4 },
  { id: "ing-cornstarch", name: "Cornstarch", category: "Dry Goods", unit: "kg", stock: 10, lowThreshold: 2 },
  { id: "ing-breadcrumbs", name: "Breadcrumbs", category: "Dry Goods", unit: "kg", stock: 8, lowThreshold: 2 },
  { id: "ing-sugar", name: "Sugar", category: "Dry Goods", unit: "kg", stock: 10, lowThreshold: 2 },
  { id: "ing-gravy", name: "Gravy mix", category: "Dry Goods", unit: "kg", stock: 3, lowThreshold: 0.5 },
  { id: "ing-saltpepper", name: "Salt & pepper", category: "Herbs & Spices", unit: "kg", stock: 3, lowThreshold: 0.5 },
  { id: "ing-garlicpowder", name: "Garlic powder", category: "Herbs & Spices", unit: "kg", stock: 2, lowThreshold: 0.3 },
  { id: "ing-spicydip", name: "Spicy dip", category: "Condiments", unit: "L", stock: 5, lowThreshold: 1 },
  { id: "ing-vinegar", name: "Vinegar", category: "Condiments", unit: "L", stock: 5, lowThreshold: 1 },
  { id: "ing-mustard", name: "Mustard", category: "Condiments", unit: "kg", stock: 3, lowThreshold: 0.5 },
  { id: "ing-oil", name: "Cooking oil", category: "Oils & Liquids", unit: "L", stock: 20, lowThreshold: 4 },
  { id: "ing-stock", name: "Chicken stock", category: "Oils & Liquids", unit: "L", stock: 12, lowThreshold: 3 },
  { id: "ing-espresso", name: "Espresso", category: "Oils & Liquids", unit: "L", stock: 5, lowThreshold: 1 },
  { id: "ing-ice", name: "Ice", category: "Frozen", unit: "kg", stock: 20, lowThreshold: 4 },
];

/* ------------------------------------------------------------------ products */

interface ProductSeed {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  image: string;
  description: string;
}

/** Seeded photographs come from the shared `src/images/menu` catalogue. */
function seedImage(id: string): string {
  return PRODUCT_IMAGES[id] ?? "";
}

export const PRODUCT_SEED: ProductSeed[] = [
  {
    id: "p-calamares",
    name: "Calamares",
    category: "Appetizer",
    price: 149,
    image: seedImage("p-calamares"),
    description: "Crisp battered squid rings with a spicy dip and a squeeze of lemon.",
  },
  {
    id: "p-fried-chicken",
    name: "Fried Chicken",
    category: "Main Course",
    price: 129,
    image: seedImage("p-fried-chicken"),
    description: "Buttermilk-brined chicken fried golden, served with gravy.",
  },
  {
    id: "p-mushroom-soup",
    name: "Creamy Mushroom Soup",
    category: "Soup",
    price: 89,
    image: seedImage("p-mushroom-soup"),
    description: "Velvety mushroom soup finished with cream and fresh herbs.",
  },
  {
    id: "p-potato-salad",
    name: "German Potato Salad",
    category: "Salad",
    price: 99,
    image: seedImage("p-potato-salad"),
    description: "Warm potato salad with bacon, onion and a tangy mustard dressing.",
  },
  {
    id: "p-affogato",
    name: "Affogato",
    category: "Dessert",
    price: 119,
    image: seedImage("p-affogato"),
    description: "Vanilla ice cream drowned in a shot of hot espresso.",
  },
  {
    id: "p-watermelon-smoothie",
    name: "Watermelon Smoothie",
    category: "Beverage",
    price: 79,
    image: seedImage("p-watermelon-smoothie"),
    description: "Fresh watermelon blended with milk, sugar and ice.",
  },
];

/** PRD v2.1 §7.4 — recipe quantities per single serving. */
const RECIPE_SEED: Record<string, Array<[string, number, Unit]>> = {
  "p-calamares": [
    ["ing-squid", 150, "g"],
    ["ing-flour", 30, "g"],
    ["ing-cornstarch", 20, "g"],
    ["ing-eggs", 0.25, "pcs"],
    ["ing-breadcrumbs", 30, "g"],
    ["ing-saltpepper", 2, "g"],
    ["ing-garlicpowder", 1, "g"],
    ["ing-oil", 20, "mL"],
    ["ing-spicydip", 30, "mL"],
    ["ing-lemon", 0.25, "pcs"],
  ],
  "p-fried-chicken": [
    ["ing-chicken", 200, "g"],
    ["ing-flour", 40, "g"],
    ["ing-cornstarch", 20, "g"],
    ["ing-eggs", 0.25, "pcs"],
    ["ing-saltpepper", 3, "g"],
    ["ing-garlicpowder", 2, "g"],
    ["ing-oil", 30, "mL"],
    ["ing-gravy", 15, "g"],
  ],
  "p-mushroom-soup": [
    ["ing-mushrooms", 100, "g"],
    ["ing-butter", 15, "g"],
    ["ing-garlic", 5, "g"],
    ["ing-onion", 30, "g"],
    ["ing-flour", 15, "g"],
    ["ing-milk", 150, "mL"],
    ["ing-cream", 50, "mL"],
    ["ing-stock", 150, "mL"],
    ["ing-saltpepper", 2, "g"],
  ],
  "p-potato-salad": [
    ["ing-potatoes", 200, "g"],
    ["ing-bacon", 40, "g"],
    ["ing-onion", 30, "g"],
    ["ing-vinegar", 15, "mL"],
    ["ing-mustard", 10, "g"],
    ["ing-oil", 10, "mL"],
    ["ing-saltpepper", 2, "g"],
    ["ing-parsley", 5, "g"],
  ],
  "p-affogato": [
    ["ing-icecream", 120, "mL"],
    ["ing-espresso", 30, "mL"],
  ],
  "p-watermelon-smoothie": [
    ["ing-watermelon", 250, "g"],
    ["ing-ice", 100, "g"],
    ["ing-sugar", 15, "g"],
    ["ing-milk", 100, "mL"],
  ],
};

/* -------------------------------------------------------- five days of sales */

/** PRD v2.1 §5.3 — the seeded rolling history, oldest day first. */
const SEED_SALES: Record<string, number[]> = {
  "p-calamares": [12, 8, 10, 11, 9],
  "p-fried-chicken": [41, 47, 36, 44, 42],
  "p-mushroom-soup": [18, 22, 11, 16, 18],
  "p-potato-salad": [23, 18, 28, 21, 25],
  "p-affogato": [21, 16, 11, 18, 14],
  "p-watermelon-smoothie": [16, 18, 16, 20, 15],
};

/** Extra servings prepared beyond demand so the waste figures are real. */
const SEED_EXTRA: Record<string, Record<number, number>> = {
  "p-fried-chicken": { 2: 4 },
  "p-potato-salad": { 1: 3 },
  "p-mushroom-soup": { 4: 2 },
  "p-calamares": { 3: 1 },
};

const PAYMENTS: PaymentMethod[] = ["Cash", "Cash", "GCash", "Cash", "Card"];

/* ------------------------------------------------------------------ builder */

export function buildSeedData(): AppData {
  const today = manilaToday();
  const days = lastNDates(today, 6); // 5 closed operating days + today
  const historyDays = days.slice(0, 5);

  const now = new Date().toISOString();

  const products: MenuProduct[] = PRODUCT_SEED.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    image: p.image,
    description: p.description,
    status: "active",
    createdAt: now,
    updatedAt: now,
  }));

  const ingredients: Ingredient[] = INGREDIENT_SEED.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    unit: i.unit,
    stock: i.stock,
    lowThreshold: i.lowThreshold,
    status: "active",
    createdAt: now,
    updatedAt: now,
  }));

  const recipes: RecipeItem[] = [];
  for (const [productId, lines] of Object.entries(RECIPE_SEED)) {
    for (const [ingredientId, qty, unit] of lines) {
      recipes.push({ id: uid("rcp"), productId, ingredientId, qty, unit });
    }
  }

  const batches: PreparationBatch[] = [];
  const transactions: POSTransaction[] = [];
  const closings: ClosingRecord[] = [];
  const operatingDays: OperatingDay[] = [];

  let receipt = 0;
  historyDays.forEach((date, dayIndex) => {
    operatingDays.push({ id: uid("day"), date, status: "closed", closedAt: `${date}T12:00:00.000Z` });

    const lines: ClosingLineItem[] = [];
    for (const product of products) {
      const sold = SEED_SALES[product.id]?.[dayIndex] ?? 0;
      const extra = SEED_EXTRA[product.id]?.[dayIndex] ?? 0;
      const prepared = sold + extra;

      if (prepared > 0) {
        batches.push({
          id: uid("batch"),
          productId: product.id,
          date,
          servings: prepared,
          override: false,
          createdAt: `${date}T01:00:00.000Z`,
        });
      }

      if (sold > 0) {
        receipt += 1;
        const paidCash = receipt % 2 === 1;
        const total = sold * product.price;
        const received = paidCash ? Math.ceil(total / 100) * 100 : total;
        transactions.push({
          id: uid("txn"),
          code: `FW-${String(receipt).padStart(4, "0")}`,
          date,
          at: `${date}T11:00:00.000Z`,
          items: [
            {
              productId: product.id,
              name: product.name,
              category: product.category,
              price: product.price,
              qty: sold,
            },
          ],
          total,
          payment: PAYMENTS[dayIndex % PAYMENTS.length],
          received,
          change: received - total,
          status: "completed",
          note: "",
        });
      }

      lines.push({
        productId: product.id,
        opening: 0,
        prepared,
        sold,
        remaining: prepared - sold,
        discarded: extra,
        carriedOver: 0,
        other: 0,
      });
    }

    closings.push({ id: uid("close"), date, lines, closedAt: `${date}T12:00:00.000Z` });
  });

  operatingDays.push({ id: uid("day"), date: today, status: "open", closedAt: null });

  /* Inventory: opening balance covers the demo history, then the history is
     consumed — so today opens at exactly the PRD's initial stock levels. */
  const consumed = new Map<string, number>();
  for (const batch of batches) {
    for (const recipe of recipes.filter((r) => r.productId === batch.productId)) {
      const ingredient = ingredients.find((i) => i.id === recipe.ingredientId);
      if (!ingredient) continue;
      const inStockUnit = convertQty(recipe.qty * batch.servings, recipe.unit, ingredient.unit);
      if (inStockUnit === null) continue;
      consumed.set(ingredient.id, round3((consumed.get(ingredient.id) ?? 0) + inStockUnit));
    }
  }

  const movements: InventoryMovement[] = [];
  const firstDay = historyDays[0] ?? today;
  for (const ingredient of ingredients) {
    const used = round3(consumed.get(ingredient.id) ?? 0);
    const opening = round3(ingredient.stock + used);
    movements.push({
      id: uid("mov"),
      ingredientId: ingredient.id,
      date: firstDay,
      kind: "seed",
      qty: opening,
      balanceAfter: opening,
      ref: null,
      note: "Opening stock",
      createdAt: `${firstDay}T00:30:00.000Z`,
    });
    if (used > 0) {
      movements.push({
        id: uid("mov"),
        ingredientId: ingredient.id,
        date: historyDays[historyDays.length - 1] ?? today,
        kind: "prep",
        qty: -used,
        balanceAfter: round3(opening - used),
        ref: null,
        note: "Consumed by demo preparation history",
        createdAt: `${firstDay}T00:40:00.000Z`,
      });
    }
  }

  return {
    version: DATA_VERSION,
    products,
    ingredients,
    recipes,
    batches,
    movements,
    transactions,
    days: operatingDays,
    closings,
    settings: { ...DEFAULT_SETTINGS },
  };
}

/** Dates the demo history covers — used by tests and copy. */
export const SEED_HISTORY_LENGTH = 5;

export function seedHistoryDates(today = manilaToday()): string[] {
  return lastNDates(addDaysISO(today, -1), SEED_HISTORY_LENGTH);
}
