import type { AppData, DailyRecord, Dish, Restaurant } from "../types";
import { DATA_VERSION } from "../types";
import { uid } from "./id";
import { addDaysISO, todayISO } from "./date";

const KEY = "foodwise-ph:data:v1";

export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    restaurant: null,
    dishes: [],
    records: [],
    settings: { historicalPeriod: 7, safetyAllowance: 0.1 },
  };
}

function migrate(raw: unknown): AppData {
  const base = emptyData();
  if (!raw || typeof raw !== "object") return base;
  const data = raw as Partial<AppData>;
  return {
    version: DATA_VERSION,
    restaurant: data.restaurant ?? null,
    dishes: Array.isArray(data.dishes) ? data.dishes : [],
    records: Array.isArray(data.records) ? data.records : [],
    settings: {
      historicalPeriod: data.settings?.historicalPeriod ?? base.settings.historicalPeriod,
      safetyAllowance:
        typeof data.settings?.safetyAllowance === "number"
          ? data.settings.safetyAllowance
          : base.settings.safetyAllowance,
    },
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return buildDemoData();
    return migrate(JSON.parse(raw));
  } catch {
    return emptyData();
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage may be unavailable (private mode / quota) — the app still runs in memory */
  }
}

export function clearData(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function makeRestaurant(name: string, type: Restaurant["type"]): Restaurant {
  return {
    id: uid("rest"),
    name: name.trim(),
    type,
    createdAt: new Date().toISOString(),
  };
}

let demoCache: AppData | null = null;

/**
 * Realistic sample restaurant used by "Explore Demo" and the demo-data actions.
 * Historical period is 7 days so the visible recommendations match the sample
 * calculations in the product requirements.
 */
export function buildDemoData(): AppData {
  if (demoCache) return structuredCloneSafe(demoCache);

  const restaurant: Restaurant = {
    id: "rest_demo_kusina",
    name: "Kusina ni Maria",
    type: "Casual Dining",
    createdAt: new Date().toISOString(),
  };

  const specs: Array<{
    id: string;
    name: string;
    category: Dish["category"];
    image: string;
    servingUnit: Dish["servingUnit"];
    costPerServing: number;
    sellingPrice: number;
    soldRecent: number[]; // newest first: [T-1, T-2, T-3]
    prepRecent: number[]; // newest first
    soldBase: number;
    prepBase: number;
    discardRatio: number;
  }> = [
    {
      id: "dish_fried_chicken",
      name: "Fried Chicken",
      category: "Main Dishes",
      image: "dishes/fried-chicken.jpg",
      servingUnit: "serving",
      costPerServing: 55,
      sellingPrice: 95,
      soldRecent: [38, 45, 40],
      prepRecent: [68, 70, 72],
      soldBase: 41,
      prepBase: 70,
      discardRatio: 0.62,
    },
    {
      id: "dish_pork_adobo",
      name: "Pork Adobo",
      category: "Main Dishes",
      image: "dishes/pork-adobo.jpg",
      servingUnit: "serving",
      costPerServing: 48,
      sellingPrice: 85,
      soldRecent: [37, 36, 32],
      prepRecent: [46, 48, 50],
      soldBase: 35,
      prepBase: 48,
      discardRatio: 0.6,
    },
    {
      id: "dish_filipino_spaghetti",
      name: "Filipino Spaghetti",
      category: "Pasta & Noodles",
      image: "dishes/filipino-spaghetti.jpg",
      servingUnit: "plate",
      costPerServing: 35,
      sellingPrice: 70,
      soldRecent: [40, 42, 38],
      prepRecent: [48, 50, 52],
      soldBase: 40,
      prepBase: 50,
      discardRatio: 0.55,
    },
    {
      id: "dish_beef_caldereta",
      name: "Beef Caldereta",
      category: "Main Dishes",
      image: "dishes/beef-caldereta.jpg",
      servingUnit: "serving",
      costPerServing: 72,
      sellingPrice: 130,
      soldRecent: [22, 24, 20],
      prepRecent: [30, 32, 34],
      soldBase: 22,
      prepBase: 32,
      discardRatio: 0.58,
    },
    {
      id: "dish_pancit_canton",
      name: "Pancit Canton",
      category: "Pasta & Noodles",
      image: "dishes/pancit-canton.jpg",
      servingUnit: "plate",
      costPerServing: 30,
      sellingPrice: 60,
      soldRecent: [33, 30, 27],
      prepRecent: [40, 42, 44],
      soldBase: 30,
      prepBase: 42,
      discardRatio: 0.5,
    },
    {
      id: "dish_chicken_inasal",
      name: "Chicken Inasal",
      category: "Main Dishes",
      image: "dishes/chicken-inasal.jpg",
      servingUnit: "piece",
      costPerServing: 52,
      sellingPrice: 99,
      soldRecent: [35, 32, 29],
      prepRecent: [43, 45, 47],
      soldBase: 32,
      prepBase: 45,
      discardRatio: 0.54,
    },
  ];

  const today = todayISO();
  const dishes: Dish[] = [];
  const records: DailyRecord[] = [];
  const HISTORY_DAYS = 14;

  specs.forEach((spec, index) => {
    const created = new Date().toISOString();
    dishes.push({
      id: spec.id,
      name: spec.name,
      category: spec.category,
      image: spec.image,
      servingUnit: spec.servingUnit,
      costPerServing: spec.costPerServing,
      sellingPrice: spec.sellingPrice,
      status: "active",
      createdAt: created,
      updatedAt: created,
    });

    // deterministic pseudo-random so the demo is stable between loads
    let seed = (index + 1) * 9301 + 49297;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < HISTORY_DAYS; i += 1) {
      const date = addDaysISO(today, -(i + 1)); // T-1, T-2, ...
      let sold: number;
      let prepared: number;

      if (i < spec.soldRecent.length) {
        sold = spec.soldRecent[i];
        prepared = spec.prepRecent[i];
      } else if (i < 7) {
        sold = spec.soldBase;
        prepared = spec.prepBase;
      } else {
        const drift = i >= 7 ? -1 : 0;
        sold = Math.max(
          5,
          Math.round(spec.soldBase + drift + (rand() * 8 - 4))
        );
        prepared = Math.max(
          sold,
          Math.round(spec.prepBase + drift + (rand() * 8 - 4))
        );
      }

      const unsoldCount = Math.max(0, prepared - sold);
      const discarded = Math.min(
        unsoldCount,
        Math.round(unsoldCount * spec.discardRatio)
      );

      const stamp = new Date(`${date}T21:30:00`).toISOString();
      records.push({
        id: `rec_${spec.id}_${date}`,
        dishId: spec.id,
        date,
        prepared,
        sold,
        discarded,
        wasOffered: true,
        notes: noteFor(index, i),
        createdAt: stamp,
        updatedAt: stamp,
      });
    }
  });

  demoCache = {
    version: DATA_VERSION,
    restaurant,
    dishes,
    records,
    settings: { historicalPeriod: 7, safetyAllowance: 0.1 },
  };
  return structuredCloneSafe(demoCache);
}

function noteFor(dishIndex: number, dayIndex: number): string {
  if (dayIndex === 0 && dishIndex === 0) return "Friday night crowd, ran low near closing.";
  if (dayIndex === 1) return "Market day — steady lunch rush.";
  if (dayIndex === 3 && dishIndex % 2 === 0) return "Quiet weekday, prepared the usual batch.";
  if (dayIndex === 6 && dishIndex === 2) return "Weekend — kid orders up.";
  return "";
}

function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}
