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
  AppSettings,
  ClosingLineItem,
  MovementKind,
  POSTransaction,
  RecordStatus,
} from "../types";
import { emptyData } from "../types";
import { buildSeedData } from "../lib/seed";
import { clearState, loadState, saveState } from "../lib/db";
import {
  applyStockMovement,
  checkout as checkoutAction,
  closeOperatingDay,
  prepareServings,
  reopenOperatingDay,
  setIngredientStatus as setIngredientStatusAction,
  setProductStatus as setProductStatusAction,
  setRecipe as setRecipeAction,
  setTransactionStatus,
  upsertIngredient,
  upsertProduct,
  type CheckoutInput,
  type CheckoutResult,
  type CloseResult,
  type IngredientInput,
  type PreparationResult,
  type ProductInput,
  type RecipeLineInput,
} from "../lib/actions";
import { manilaToday } from "../lib/date";

interface StoreValue {
  ready: boolean;
  data: AppData;
  saveProduct: (input: ProductInput, id?: string) => string;
  setProductStatus: (id: string, status: RecordStatus) => void;
  saveRecipe: (productId: string, lines: RecipeLineInput[]) => void;
  saveIngredient: (input: IngredientInput, id?: string) => void;
  setIngredientStatus: (id: string, status: RecordStatus) => void;
  moveStock: (id: string, kind: MovementKind, qty: number, note: string) => void;
  prepare: (productId: string, servings: number, override?: boolean) => PreparationResult;
  checkout: (input: CheckoutInput) => CheckoutResult;
  setTxnStatus: (id: string, status: POSTransaction["status"], note: string) => void;
  closeDay: (date: string, lines: ClosingLineItem[]) => CloseResult;
  reopenDay: (date: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetDemo: () => void;
  clearAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => emptyData());
  const [ready, setReady] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    let alive = true;
    loadState()
      .then((stored) => {
        if (!alive) return;
        setData(stored ?? buildSeedData());
        setReady(true);
      })
      .catch(() => {
        if (!alive) return;
        setData(buildSeedData());
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Persist every change, lightly debounced so fast typing does not thrash.
  useEffect(() => {
    if (!ready) return;
    const handle = window.setTimeout(() => {
      void saveState(data).catch(() => undefined);
    }, 220);
    return () => window.clearTimeout(handle);
  }, [data, ready]);

  const apply = useCallback((next: AppData) => setData(next), []);

  const value = useMemo<StoreValue>(() => {
    const current = () => dataRef.current;

    return {
      ready,
      data,
      saveProduct: (input, id) => {
        const result = upsertProduct(current(), input, id);
        apply(result.data);
        return result.id;
      },
      setProductStatus: (id, status) => apply(setProductStatusAction(current(), id, status)),
      saveRecipe: (productId, lines) => apply(setRecipeAction(current(), productId, lines)),
      saveIngredient: (input: IngredientInput, id?: string) =>
        apply(upsertIngredient(current(), input, id)),
      setIngredientStatus: (id, status) =>
        apply(setIngredientStatusAction(current(), id, status)),
      moveStock: (id, kind, qty, note) => apply(applyStockMovement(current(), id, kind, qty, note)),
      prepare: (productId, servings, override) => {
        const result = prepareServings(current(), { productId, servings, override });
        if (result.ok) apply(result.data);
        return result;
      },
      checkout: (input) => {
        const result = checkoutAction(current(), input);
        if (result.ok) apply(result.data);
        return result;
      },
      setTxnStatus: (id, status, note) => apply(setTransactionStatus(current(), id, status, note)),
      closeDay: (date, lines) => {
        const result = closeOperatingDay(current(), date, lines);
        if (result.ok) apply(result.data);
        return result;
      },
      reopenDay: (date) => apply(reopenOperatingDay(current(), date)),
      updateSettings: (patch) =>
        apply({ ...current(), settings: { ...current().settings, ...patch } }),
      resetDemo: () => apply(buildSeedData()),
      clearAll: () => {
        void clearState();
        apply(emptyData());
      },
    };
  }, [apply, data, ready]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <DataProvider>");
  return ctx;
}

/** Today's operating date in Asia/Manila, used by every module. */
export function useTodayDate(): string {
  return manilaToday();
}
