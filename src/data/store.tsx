import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AppData,
  DailyRecord,
  Dish,
  DishStatus,
  ForecastSettings,
  RestaurantType,
} from "../types";
import { buildDemoData, clearData, emptyData, loadData, makeRestaurant, saveData } from "../lib/demo";
import { uid } from "../lib/id";

export interface DishInput {
  name: string;
  category: Dish["category"];
  image: string | null;
  servingUnit: Dish["servingUnit"];
  costPerServing: number | null;
  sellingPrice: number | null;
}

export interface RecordInput {
  dishId: string;
  date: string;
  prepared: number;
  sold: number;
  discarded: number;
  wasOffered: boolean;
  notes: string;
}

interface DataContextValue {
  data: AppData;
  dishes: Dish[];
  records: DailyRecord[];
  activeDishes: Dish[];
  archivedDishes: Dish[];
  hasRestaurant: boolean;
  createRestaurant: (name: string, type: RestaurantType | "") => void;
  updateRestaurant: (patch: Partial<Pick<AppData["restaurant"] & object, "name" | "type">>) => void;
  addDish: (input: DishInput) => Dish;
  updateDish: (id: string, input: DishInput) => void;
  setDishStatus: (id: string, status: DishStatus) => void;
  upsertRecord: (input: RecordInput) => void;
  upsertRecords: (inputs: RecordInput[]) => void;
  deleteRecord: (id: string) => void;
  updateSettings: (patch: Partial<ForecastSettings>) => void;
  loadDemoData: () => void;
  resetDemoData: () => void;
  clearAllData: () => void;
  recordFor: (dishId: string, date: string) => DailyRecord | undefined;
  recordsForDate: (date: string) => DailyRecord[];
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData());
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    saveData(data);
  }, [data]);

  const createRestaurant = useCallback((name: string, type: RestaurantType | "") => {
    setData((d) => ({ ...d, restaurant: makeRestaurant(name, type) }));
  }, []);

  const updateRestaurant = useCallback((patch: { name?: string; type?: RestaurantType | "" }) => {
    setData((d) => {
      if (!d.restaurant) return d;
      return { ...d, restaurant: { ...d.restaurant, ...patch } };
    });
  }, []);

  const addDish = useCallback((input: DishInput) => {
    const now = new Date().toISOString();
    const dish: Dish = {
      id: uid("dish"),
      name: input.name.trim(),
      category: input.category,
      image: input.image,
      servingUnit: input.servingUnit,
      costPerServing: input.costPerServing,
      sellingPrice: input.sellingPrice,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    setData((d) => ({ ...d, dishes: [...d.dishes, dish] }));
    return dish;
  }, []);

  const updateDish = useCallback((id: string, input: DishInput) => {
    setData((d) => ({
      ...d,
      dishes: d.dishes.map((dish) =>
        dish.id === id
          ? {
              ...dish,
              name: input.name.trim(),
              category: input.category,
              image: input.image,
              servingUnit: input.servingUnit,
              costPerServing: input.costPerServing,
              sellingPrice: input.sellingPrice,
              updatedAt: new Date().toISOString(),
            }
          : dish
      ),
    }));
  }, []);

  const setDishStatus = useCallback((id: string, status: DishStatus) => {
    setData((d) => ({
      ...d,
      dishes: d.dishes.map((dish) =>
        dish.id === id ? { ...dish, status, updatedAt: new Date().toISOString() } : dish
      ),
    }));
  }, []);

  const upsertRecords = useCallback((inputs: RecordInput[]) => {
    setData((d) => {
      const records = [...d.records];
      const now = new Date().toISOString();
      for (const input of inputs) {
        const idx = records.findIndex(
          (r) => r.dishId === input.dishId && r.date === input.date
        );
        if (idx >= 0) {
          records[idx] = { ...records[idx], ...input, updatedAt: now };
        } else {
          records.push({
            id: uid("rec"),
            ...input,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
      return { ...d, records };
    });
  }, []);

  const upsertRecord = useCallback(
    (input: RecordInput) => upsertRecords([input]),
    [upsertRecords]
  );

  const deleteRecord = useCallback((id: string) => {
    setData((d) => ({ ...d, records: d.records.filter((r) => r.id !== id) }));
  }, []);

  const updateSettings = useCallback((patch: Partial<ForecastSettings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, []);

  const loadDemoData = useCallback(() => setData(buildDemoData()), []);

  const resetDemoData = useCallback(() => {
    setData(buildDemoData());
  }, []);

  const clearAllData = useCallback(() => {
    clearData();
    setData(emptyData());
  }, []);

  const recordFor = useCallback(
    (dishId: string, date: string) =>
      data.records.find((r) => r.dishId === dishId && r.date === date),
    [data.records]
  );

  const recordsForDate = useCallback(
    (date: string) => data.records.filter((r) => r.date === date),
    [data.records]
  );

  const value = useMemo<DataContextValue>(() => {
    const activeDishes = data.dishes.filter((d) => d.status === "active");
    const archivedDishes = data.dishes.filter((d) => d.status === "archived");
    return {
      data,
      dishes: data.dishes,
      records: data.records,
      activeDishes,
      archivedDishes,
      hasRestaurant: data.restaurant !== null,
      createRestaurant,
      updateRestaurant,
      addDish,
      updateDish,
      setDishStatus,
      upsertRecord,
      upsertRecords,
      deleteRecord,
      updateSettings,
      loadDemoData,
      resetDemoData,
      clearAllData,
      recordFor,
      recordsForDate,
    };
  }, [
    data,
    createRestaurant,
    updateRestaurant,
    addDish,
    updateDish,
    setDishStatus,
    upsertRecord,
    upsertRecords,
    deleteRecord,
    updateSettings,
    loadDemoData,
    resetDemoData,
    clearAllData,
    recordFor,
    recordsForDate,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
