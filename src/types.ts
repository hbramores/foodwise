/* =====================================================================
   FoodWise PH — shared data model (PRD v2.1 §9.3)

   One record set is shared by every module. Nothing is duplicated per
   page: Dashboard, POS, Forecasting, Inventory and Menu & Recipes all
   read and write these entities.
   ===================================================================== */

export const MENU_CATEGORIES = [
  "Appetizer",
  "Main Course",
  "Soup",
  "Salad",
  "Dessert",
  "Beverage",
] as const;
export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export const INGREDIENT_CATEGORIES = [
  "Meat & Seafood",
  "Produce",
  "Dairy & Eggs",
  "Dry Goods",
  "Herbs & Spices",
  "Condiments",
  "Oils & Liquids",
  "Frozen",
] as const;
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export const UNITS = ["kg", "g", "L", "mL", "pcs"] as const;
export type Unit = (typeof UNITS)[number];

export const PAYMENT_METHODS = ["Cash", "GCash", "Card"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type RecordStatus = "active" | "archived";
export type TxnStatus = "completed" | "voided" | "refunded";
export type DayStatus = "open" | "closed";

/* ------------------------------------------------------------------ records */

export interface MenuProduct {
  id: string;
  name: string;
  category: MenuCategory;
  /** selling price in PHP */
  price: number;
  /** bundled image path or data URL */
  image: string | null;
  description: string;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  unit: Unit;
  /** current available quantity */
  stock: number;
  /** low-stock threshold (never shown on the Dashboard) */
  lowThreshold: number;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeItem {
  id: string;
  productId: string;
  ingredientId: string;
  /** quantity per single serving */
  qty: number;
  unit: Unit;
}

export interface PreparationBatch {
  id: string;
  productId: string;
  /** Asia/Manila operating date, YYYY-MM-DD */
  date: string;
  servings: number;
  /** true when confirmed despite insufficient stock */
  override: boolean;
  /**
   * Batches confirmed in the same preparation session share a group id, so one
   * "Add Prepared Food" submission is stored and reported as a single batch.
   */
  groupId?: string;
  createdAt: string;
}

export type MovementKind = "prep" | "restock" | "adjust" | "loss" | "seed";

export interface InventoryMovement {
  id: string;
  ingredientId: string;
  date: string;
  kind: MovementKind;
  /** signed change applied to stock (negative = consumed) */
  qty: number;
  balanceAfter: number;
  /** batch id / product id this movement belongs to */
  ref: string | null;
  note: string;
  createdAt: string;
}

/** Price and name are snapshots so history never changes retroactively. */
export interface POSLineItem {
  productId: string;
  name: string;
  category: MenuCategory;
  price: number;
  qty: number;
}

export interface POSTransaction {
  id: string;
  /** receipt number shown to staff */
  code: string;
  date: string;
  at: string;
  items: POSLineItem[];
  total: number;
  payment: PaymentMethod;
  received: number;
  change: number;
  status: TxnStatus;
  note: string;
}

export interface OperatingDay {
  id: string;
  date: string;
  status: DayStatus;
  closedAt: string | null;
}

export interface ClosingLineItem {
  productId: string;
  opening: number;
  prepared: number;
  sold: number;
  remaining: number;
  discarded: number;
  carriedOver: number;
  other: number;
}

export interface ClosingRecord {
  id: string;
  date: string;
  lines: ClosingLineItem[];
  closedAt: string;
}

export interface AppSettings {
  restaurantName: string;
  restaurantType: string;
  /** interface preference kept in LocalStorage, mirrored here for completeness */
  sidebarCollapsed: boolean;
}

export interface AppData {
  version: number;
  products: MenuProduct[];
  ingredients: Ingredient[];
  recipes: RecipeItem[];
  batches: PreparationBatch[];
  movements: InventoryMovement[];
  transactions: POSTransaction[];
  days: OperatingDay[];
  closings: ClosingRecord[];
  settings: AppSettings;
}

export const DATA_VERSION = 3;

export const DEFAULT_SETTINGS: AppSettings = {
  restaurantName: "Kusina ni Maria",
  restaurantType: "Casual Dining",
  sidebarCollapsed: false,
};

/** Number of operating days used by the rolling forecast (PRD v2.1 §5.2). */
export const FORECAST_WINDOW = 5;

export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    products: [],
    ingredients: [],
    recipes: [],
    batches: [],
    movements: [],
    transactions: [],
    days: [],
    closings: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}
