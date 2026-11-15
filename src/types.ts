export type DishCategory =
  | "Main Dishes"
  | "Pasta & Noodles"
  | "Snacks"
  | "Desserts"
  | "Other";

export const DISH_CATEGORIES: DishCategory[] = [
  "Main Dishes",
  "Pasta & Noodles",
  "Snacks",
  "Desserts",
  "Other",
];

export type ServingUnit = "serving" | "portion" | "piece" | "plate" | "bowl";

export const SERVING_UNITS: ServingUnit[] = [
  "serving",
  "portion",
  "piece",
  "plate",
  "bowl",
];

export type RestaurantType =
  | "Carinderia"
  | "Casual Dining"
  | "Fast Food"
  | "Café"
  | "Other";

export const RESTAURANT_TYPES: RestaurantType[] = [
  "Carinderia",
  "Casual Dining",
  "Fast Food",
  "Café",
  "Other",
];

export type DishStatus = "active" | "archived";

export interface Restaurant {
  id: string;
  name: string;
  type: RestaurantType | "";
  createdAt: string;
}

export interface Dish {
  id: string;
  name: string;
  category: DishCategory;
  /** data URL for uploaded images, or a path/URL for bundled images */
  image: string | null;
  servingUnit: ServingUnit;
  costPerServing: number | null;
  sellingPrice: number | null;
  status: DishStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DailyRecord {
  id: string;
  dishId: string;
  /** local calendar date, YYYY-MM-DD */
  date: string;
  prepared: number;
  sold: number;
  discarded: number;
  /** false = the dish was not offered that day and is excluded from averages */
  wasOffered: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type HistoricalPeriod = 3 | 7 | 14 | 30;

export const HISTORICAL_PERIODS: HistoricalPeriod[] = [3, 7, 14, 30];

export interface ForecastSettings {
  historicalPeriod: HistoricalPeriod;
  /** 0 – 0.2 (0% – 20%) */
  safetyAllowance: number;
}

export interface AppData {
  version: number;
  restaurant: Restaurant | null;
  dishes: Dish[];
  records: DailyRecord[];
  settings: ForecastSettings;
}

export const DEFAULT_SETTINGS: ForecastSettings = {
  historicalPeriod: 7,
  safetyAllowance: 0.1,
};

export const DATA_VERSION = 1;

/** Minimum eligible recorded days required before a recommendation is shown. */
export const MIN_ELIGIBLE_DAYS = 3;
