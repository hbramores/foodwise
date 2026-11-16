import {
  DATA_VERSION,
  MENU_CATEGORIES,
  PAYMENT_METHODS,
  type AppData,
  type ClosingLineItem,
  type Ingredient,
  type IngredientCategory,
  type InventoryMovement,
  type MenuCategory,
  type MenuProduct,
  type MovementKind,
  type PaymentMethod,
  type POSLineItem,
  type POSTransaction,
  type PreparationBatch,
  type RecipeItem,
  type RecordStatus,
  type Unit,
} from "../types";
import { uid } from "./id";
import { manilaToday } from "./date";
import { availableServings, nextReceiptCode, reconciliationGap, requirementFor, type RequirementLine } from "./calc";
import { convertQty, round3 } from "./units";

/* ------------------------------------------------------------------- days */

export function ensureOpenDay(data: AppData, date: string): AppData {
  if (data.days.some((d) => d.date === date)) return data;
  return { ...data, days: [...data.days, { id: uid("day"), date, status: "open", closedAt: null }] };
}

export function reopenOperatingDay(data: AppData, date: string): AppData {
  return {
    ...data,
    days: data.days.map((d) => (d.date === date ? { ...d, status: "open", closedAt: null } : d)),
  };
}

/* ------------------------------------------------------------ preparation */

export interface PreparationInput {
  productId: string;
  servings: number;
  override?: boolean;
  date?: string;
}

export type PreparationResult =
  | { ok: true; data: AppData; batch: PreparationBatch }
  | { ok: false; error: string; blockers: RequirementLine[] };

/**
 * Confirms a preparation batch: creates the batch, deducts every recipe
 * ingredient exactly once, and records an inventory movement per ingredient.
 * Nothing is written when validation fails, so a batch can never be partial.
 */
export function prepareServings(data: AppData, input: PreparationInput): PreparationResult {
  const date = input.date ?? manilaToday();
  const servings = Math.floor(input.servings);
  const product = data.products.find((p) => p.id === input.productId);

  if (!product) return { ok: false, error: "Unknown product.", blockers: [] };
  if (product.status !== "active") return { ok: false, error: `${product.name} is archived.`, blockers: [] };
  if (!Number.isFinite(servings) || servings <= 0) {
    return { ok: false, error: "Enter a whole number of servings above zero.", blockers: [] };
  }
  const recipe = data.recipes.filter((r) => r.productId === product.id);
  if (!recipe.length) {
    return { ok: false, error: `${product.name} has no recipe yet. Add recipe ingredients first.`, blockers: [] };
  }

  const requirement = requirementFor(data, product.id, servings);
  const blockers = requirement.filter((line) => !line.ok);
  if (blockers.length && !input.override) {
    return { ok: false, error: "Not enough ingredients for this batch.", blockers };
  }

  const now = new Date().toISOString();
  const batch: PreparationBatch = {
    id: uid("batch"),
    productId: product.id,
    date,
    servings,
    override: Boolean(input.override && blockers.length),
    createdAt: now,
  };

  const ingredientPatches = new Map<string, number>();
  const movements: InventoryMovement[] = [];

  for (const line of requirement) {
    // Stock floors at zero so an explicit override can never write a negative
    // balance; the movement records what was actually consumed.
    const next = Math.max(0, round3(line.ingredient.stock - line.qty));
    ingredientPatches.set(line.ingredient.id, next);
    movements.push({
      id: uid("mov"),
      ingredientId: line.ingredient.id,
      date,
      kind: "prep" as MovementKind,
      qty: round3(next - line.ingredient.stock),
      balanceAfter: next,
      ref: batch.id,
      note: `Prepared ${servings} × ${product.name}`,
      createdAt: now,
    });
  }

  const next: AppData = {
    ...data,
    batches: [...data.batches, batch],
    movements: [...data.movements, ...movements],
    ingredients: data.ingredients.map((i) =>
      ingredientPatches.has(i.id) ? { ...i, stock: ingredientPatches.get(i.id) as number, updatedAt: now } : i
    ),
  };

  return { ok: true, data: ensureOpenDay(next, date), batch };
}

/* ------------------------------------------------------------------ POS */

export interface CartLine {
  productId: string;
  qty: number;
}

export interface CheckoutInput {
  cart: CartLine[];
  payment: PaymentMethod;
  received?: number;
  date?: string;
  idempotencyKey?: string;
}

export type CheckoutResult =
  | { ok: true; data: AppData; txn: POSTransaction }
  | { ok: false; error: string };

/**
 * Records a sale. Availability is derived from transactions, so completing a
 * checkout can never deduct raw ingredients (PRD §4.6) and can never exceed
 * what was prepared.
 */
export function checkout(data: AppData, input: CheckoutInput): CheckoutResult {
  const date = input.date ?? manilaToday();
  if (input.idempotencyKey && data.transactions.some((t) => t.id === input.idempotencyKey)) {
    return { ok: false, error: "This order was already completed." };
  }
  if (!input.cart.length) return { ok: false, error: "The cart is empty." };
  if (!PAYMENT_METHODS.includes(input.payment)) return { ok: false, error: "Choose a payment method." };

  const items: POSLineItem[] = [];
  for (const line of input.cart) {
    const product = data.products.find((p) => p.id === line.productId);
    if (!product) return { ok: false, error: "A product in the cart no longer exists." };
    const qty = Math.floor(line.qty);
    if (!Number.isFinite(qty) || qty <= 0) {
      return { ok: false, error: `Enter a valid quantity for ${product.name}.` };
    }
    const available = availableServings(data, product.id);
    if (qty > available) {
      return { ok: false, error: `Only ${available} ${product.name} serving(s) are available.` };
    }
    items.push({
      productId: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      qty,
    });
  }

  const total = items.reduce((sum, l) => sum + l.price * l.qty, 0);
  const received = input.payment === "Cash" ? Math.max(0, input.received ?? 0) : total;
  if (input.payment === "Cash" && received < total) {
    return { ok: false, error: "Amount received is less than the total." };
  }

  const txn: POSTransaction = {
    id: input.idempotencyKey ?? uid("txn"),
    code: nextReceiptCode(data),
    date,
    at: new Date().toISOString(),
    items,
    total,
    payment: input.payment,
    received,
    change: round3(received - total),
    status: "completed",
    note: "",
  };

  return { ok: true, data: ensureOpenDay({ ...data, transactions: [...data.transactions, txn] }, date), txn };
}

export function setTransactionStatus(
  data: AppData,
  id: string,
  status: POSTransaction["status"],
  note: string
): AppData {
  return {
    ...data,
    transactions: data.transactions.map((t) => (t.id === id ? { ...t, status, note } : t)),
  };
}

/* --------------------------------------------------------------- closing */

export interface CloseResult {
  ok: boolean;
  error?: string;
  data: AppData;
}

export function closeOperatingDay(
  data: AppData,
  date: string,
  lines: ClosingLineItem[]
): CloseResult {
  const gap = lines.reduce((sum, line) => sum + Math.abs(reconciliationGap(line)), 0);
  if (gap > 0.0001) {
    return { ok: false, error: "Every remaining serving must be reconciled before closing.", data };
  }

  const record = { id: uid("close"), date, lines, closedAt: new Date().toISOString() };
  const next: AppData = {
    ...data,
    closings: [...data.closings.filter((c) => c.date !== date), record],
    days: data.days.map((d) =>
      d.date === date ? { ...d, status: "closed", closedAt: record.closedAt } : d
    ),
  };
  return { ok: true, data: ensureOpenDay(next, date) };
}

/* ------------------------------------------------------------- inventory */

export function applyStockMovement(
  data: AppData,
  ingredientId: string,
  kind: MovementKind,
  qty: number,
  note: string,
  date = manilaToday()
): AppData {
  const ingredient = data.ingredients.find((i) => i.id === ingredientId);
  if (!ingredient) return data;
  if (!Number.isFinite(qty) || qty === 0) return data;

  const now = new Date().toISOString();
  // Never allow a negative balance; record the delta that was actually applied.
  const balance = Math.max(0, round3(ingredient.stock + qty));
  const applied = round3(balance - ingredient.stock);
  if (applied === 0) return data;
  const movement: InventoryMovement = {
    id: uid("mov"),
    ingredientId,
    date,
    kind,
    qty: applied,
    balanceAfter: balance,
    ref: null,
    note,
    createdAt: now,
  };

  return {
    ...data,
    ingredients: data.ingredients.map((i) =>
      i.id === ingredientId ? { ...i, stock: balance, updatedAt: now } : i
    ),
    movements: [...data.movements, movement],
  };
}

/* ---------------------------------------------------------------- records */

export interface ProductInput {
  name: string;
  category: MenuCategory;
  price: number;
  image: string | null;
  description: string;
}

/** Returns the saved product id so callers can attach a recipe right away. */
export function upsertProduct(
  data: AppData,
  input: ProductInput,
  id?: string
): { data: AppData; id: string } {
  const now = new Date().toISOString();
  if (id) {
    return {
      id,
      data: {
        ...data,
        products: data.products.map((p) =>
          p.id === id
            ? {
                ...p,
                name: input.name.trim(),
                category: input.category,
                price: input.price,
                image: input.image,
                description: input.description.trim(),
                updatedAt: now,
              }
            : p
        ),
      },
    };
  }
  const product: MenuProduct = {
    id: uid("prd"),
    name: input.name.trim(),
    category: input.category,
    price: input.price,
    image: input.image,
    description: input.description.trim(),
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  return { id: product.id, data: { ...data, products: [...data.products, product] } };
}

export function setProductStatus(data: AppData, id: string, status: RecordStatus): AppData {
  return {
    ...data,
    products: data.products.map((p) =>
      p.id === id ? { ...p, status, updatedAt: new Date().toISOString() } : p
    ),
  };
}

export interface IngredientInput {
  name: string;
  category: IngredientCategory;
  unit: Unit;
  lowThreshold: number;
}

export function upsertIngredient(data: AppData, input: IngredientInput, id?: string): AppData {
  const now = new Date().toISOString();
  if (id) {
    return {
      ...data,
      ingredients: data.ingredients.map((i) =>
        i.id === id
          ? {
              ...i,
              name: input.name.trim(),
              category: input.category,
              unit: input.unit,
              lowThreshold: input.lowThreshold,
              updatedAt: now,
            }
          : i
      ),
    };
  }
  const ingredient: Ingredient = {
    id: uid("ing"),
    name: input.name.trim(),
    category: input.category,
    unit: input.unit,
    stock: 0,
    lowThreshold: input.lowThreshold,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  return { ...data, ingredients: [...data.ingredients, ingredient] };
}

export function setIngredientStatus(data: AppData, id: string, status: RecordStatus): AppData {
  return {
    ...data,
    ingredients: data.ingredients.map((i) =>
      i.id === id ? { ...i, status, updatedAt: new Date().toISOString() } : i
    ),
  };
}

export interface RecipeLineInput {
  ingredientId: string;
  qty: number;
  unit: Unit;
}

export function setRecipe(data: AppData, productId: string, lines: RecipeLineInput[]): AppData {
  const recipes: RecipeItem[] = lines
    .filter((l) => l.ingredientId && Number.isFinite(l.qty) && l.qty > 0)
    .map((l) => ({ id: uid("rcp"), productId, ingredientId: l.ingredientId, qty: l.qty, unit: l.unit }));
  return { ...data, recipes: [...data.recipes.filter((r) => r.productId !== productId), ...recipes] };
}

/* ------------------------------------------------------------------ misc */

export function normaliseProductInput(raw: ProductInput): ProductInput | null {
  const name = raw.name.trim();
  if (!name) return null;
  if (!MENU_CATEGORIES.includes(raw.category)) return null;
  if (!Number.isFinite(raw.price) || raw.price < 0) return null;
  return { ...raw, name, price: round3(raw.price), description: raw.description.trim() };
}

export function isCompatible(qty: number, from: Unit, to: Unit): boolean {
  return convertQty(qty, from, to) !== null;
}

export { DATA_VERSION };
