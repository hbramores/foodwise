import { DATA_VERSION, emptyData, type AppData } from "../types";

/**
 * IndexedDB persistence for the structured prototype records (PRD §9.2).
 * Every entity gets its own store; a save writes all of them in a single
 * transaction so the dataset can never be half-written.
 *
 * If IndexedDB is unavailable (private windows, locked-down browsers) the
 * module transparently falls back to LocalStorage so the prototype keeps
 * working instead of losing data.
 */

const DB_NAME = "foodwise-ph";
const DB_VERSION = 1;

const LIST_STORES = [
  "products",
  "ingredients",
  "recipes",
  "batches",
  "movements",
  "transactions",
  "days",
  "closings",
] as const;

type ListStore = (typeof LIST_STORES)[number];
const META_STORE = "meta";
const META_KEY = "app";
const FALLBACK_KEY = "foodwise-ph:fallback";

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
      for (const name of LIST_STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

function readFallback(): AppData | null {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppData;
    if (parsed?.version !== DATA_VERSION) return null;
    return { ...emptyData(), ...parsed };
  } catch {
    return null;
  }
}

function writeFallback(data: AppData): void {
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable — the session simply stays in memory */
  }
}

export async function loadState(): Promise<AppData | null> {
  const db = await openDb();
  if (!db) return readFallback();

  return new Promise((resolve) => {
    const names = [META_STORE, ...LIST_STORES];
    const tx = db.transaction(names, "readonly");
    const metaReq = tx.objectStore(META_STORE).get(META_KEY);
    const lists = new Map<ListStore, AppData[ListStore]>();

    for (const name of LIST_STORES) {
      const req = tx.objectStore(name).getAll();
      req.onsuccess = () => {
        lists.set(name, (req.result ?? []) as AppData[ListStore]);
      };
    }

    tx.oncomplete = () => {
      const meta = metaReq.result as AppData | undefined;
      if (!meta || meta.version !== DATA_VERSION) {
        resolve(null);
        return;
      }
      const data: AppData = { ...emptyData(), ...meta };
      const bag = data as unknown as Record<string, unknown>;
      for (const name of LIST_STORES) {
        bag[name] = lists.get(name) ?? [];
      }
      resolve(data);
    };
    tx.onerror = () => resolve(readFallback());
    tx.onabort = () => resolve(readFallback());
  });
}

export async function saveState(data: AppData): Promise<void> {
  const db = await openDb();
  if (!db) {
    writeFallback(data);
    return;
  }

  const { products, ingredients, recipes, batches, movements, transactions, days, closings } = data;
  const lists: Record<ListStore, unknown[]> = {
    products,
    ingredients,
    recipes,
    batches,
    movements,
    transactions,
    days,
    closings,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([META_STORE, ...LIST_STORES], "readwrite");
    tx.objectStore(META_STORE).put(data, META_KEY);
    for (const name of LIST_STORES) {
      const store = tx.objectStore(name);
      store.clear();
      for (const row of lists[name]) store.put(row);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB write aborted"));
  });
}

export async function clearState(): Promise<void> {
  const db = await openDb();
  try {
    localStorage.removeItem(FALLBACK_KEY);
  } catch {
    /* ignore */
  }
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction([META_STORE, ...LIST_STORES], "readwrite");
    tx.objectStore(META_STORE).clear();
    for (const name of LIST_STORES) tx.objectStore(name).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
}
