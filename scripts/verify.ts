import { buildSeedData } from "../src/lib/seed";
import {
  checkout,
  closeOperatingDay,
  prepareServings,
  setRecipe,
  setTransactionStatus,
  upsertProduct,
  applyStockMovement,
} from "../src/lib/actions";
import {
  availableServings,
  forecastFor,
  kpis,
  periodRange,
  reconciliationGap,
  stockState,
  wasteSummary,
} from "../src/lib/calc";
import { manilaToday } from "../src/lib/date";
import { convertQty } from "../src/lib/units";
import type { AppData, ClosingLineItem } from "../src/types";

let failures = 0;
function check(condition: boolean, label: string) {
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition) failures += 1;
}

const today = manilaToday();
const seed = buildSeedData();

/* ---------------------------------------------------------------- seeding */

check(seed.products.length === 6, "Six seeded menu products");
check(seed.ingredients.length === 29, "Twenty-nine seeded ingredients");
check(
  seed.products.every((p) => seed.recipes.some((r) => r.productId === p.id)),
  "Every product has a recipe"
);
check(
  Object.values(
    seed.recipes.reduce<Record<string, number>>((acc, r) => {
      acc[r.productId] = (acc[r.productId] ?? 0) + 1;
      return acc;
    }, {})
  ).join(",") === "10,8,9,8,2,4",
  "Recipe line counts match the PRD (10, 8, 9, 8, 2, 4)"
);
check(seed.days.filter((d) => d.status === "closed").length === 5, "Five closed seeded operating days");
check(seed.days.filter((d) => d.status === "open").length === 1, "Today starts as an open operating day");
check(seed.transactions.length === 30, "Thirty seeded POS transactions");
check(seed.closings.length === 5, "Five seeded closing records");

/* ------------------------------------------------------------- forecasting */

const expected = [10, 42, 17, 23, 16, 17];
seed.products.forEach((product, i) => {
  const f = forecastFor(seed, product.id);
  check(f.validDays === 5, `Five valid days recorded: ${product.name}`);
  check(f.recommended === expected[i], `Recommendation matches the PRD: ${product.name} = ${expected[i]}`);
});

/* --------------------------------------------------- inventory consistency */

check(
  seed.ingredients.every((ingredient) => {
    const moves = seed.movements.filter((m) => m.ingredientId === ingredient.id);
    const last = moves[moves.length - 1];
    return last ? Math.abs(last.balanceAfter - ingredient.stock) < 0.0001 : true;
  }),
  "Every ingredient's movement ledger ends at its current stock"
);

/* ---------------------------------------------- acceptance workflow (§12) */

let data: AppData = seed;
const chicken = data.products.find((p) => p.name === "Fried Chicken") as { id: string };
const chickenIngredient = data.ingredients.find((i) => i.name === "Chicken pieces") as { id: string; stock: number };

check(availableServings(data, chicken.id) === 0, "Fried Chicken starts with no prepared servings");
const stockBefore = chickenIngredient.stock;

// 4. prepare 50 servings
const prep = prepareServings(data, { productId: chicken.id, servings: 50 });
check(prep.ok, "Preparing 50 Fried Chicken servings is accepted");
if (prep.ok) data = prep.data;

// 5. availability increases by 50
check(availableServings(data, chicken.id) === 50, "Availability increases by exactly 50");

// 6. inventory deducts 10 kg of chicken plus the other recipe ingredients
const afterPrep = data.ingredients.find((i) => i.id === chickenIngredient.id) as { stock: number };
check(Math.abs(stockBefore - afterPrep.stock - 10) < 0.0001, "Chicken pieces deduct 10 kg (200 g × 50)");
check(
  data.movements.filter((m) => m.ref === (prep.ok ? prep.batch.id : "")).length === 8,
  "One inventory movement per recipe line (8 lines)"
);
check(
  data.batches.filter((b) => b.productId === chicken.id && b.date === today).length === 1,
  "Exactly one preparation batch recorded"
);

// 7. sell two servings
const sale = checkout(data, { cart: [{ productId: chicken.id, qty: 2 }], payment: "Cash", received: 500 });
check(sale.ok, "Selling two Fried Chicken servings succeeds");
if (sale.ok) data = sale.data;

// 8. availability decreases to 48
check(availableServings(data, chicken.id) === 48, "Availability decreases to 48 after selling two");

// 9. raw ingredients are not deducted again
const afterSale = data.ingredients.find((i) => i.id === chickenIngredient.id) as { stock: number };
check(afterSale.stock === afterPrep.stock, "Checkout does not deduct raw ingredients again");

// 10. sale appears in history with a timestamp
const recorded = data.transactions.find((t) => sale.ok && t.id === sale.txn.id);
check(Boolean(recorded?.at && recorded?.code), "The sale is stored with a receipt code and timestamp");
check(recorded?.status === "completed", "The sale is stored as completed");

// 11. dashboard figures update
const dayRange = periodRange("today", today);
check(kpis(data, dayRange).sales === 258, "Dashboard sales include the new order (₱258)");
check(kpis(data, dayRange).sold === 2, "Dashboard servings sold updates to 2");

// 12. forecasting reflects the POS history
check(forecastFor(data, chicken.id).validDays === 5, "Forecasting still uses the latest five recorded days");
check(forecastFor(data, chicken.id).values.at(-1) === 2, "Today's sale feeds the forecasting window");

/* --------------------------------------------------------- integrity guards */

check(!checkout(data, { cart: [{ productId: chicken.id, qty: 999 }], payment: "Cash", received: 0 }).ok, "Cannot sell beyond prepared availability");
check(!checkout(data, { cart: [], payment: "Cash" }).ok, "Empty cart is rejected");
check(!checkout(data, { cart: [{ productId: chicken.id, qty: 1 }], payment: "Cash", received: 1 }).ok, "Cash under the total is rejected");
check(!prepareServings(data, { productId: chicken.id, servings: 0 }).ok, "Zero servings cannot be prepared");
check(!prepareServings(data, { productId: chicken.id, servings: -5 }).ok, "Negative servings cannot be prepared");

const key = "idem-test-1";
const first = checkout(data, { cart: [{ productId: chicken.id, qty: 1 }], payment: "GCash", idempotencyKey: key });
if (first.ok) data = first.data;
const duplicate = checkout(data, { cart: [{ productId: chicken.id, qty: 1 }], payment: "GCash", idempotencyKey: key });
check(!duplicate.ok, "A repeated submission with the same key is ignored");
check(availableServings(data, chicken.id) === 47, "Duplicate submission did not change availability");

// void restores availability and net sales
const voided = sale.ok ? setTransactionStatus(data, sale.txn.id, "voided", "test") : data;
data = voided;
check(availableServings(data, chicken.id) === 49, "Voiding a sale returns its servings");
check(kpis(data, dayRange).sales === 129, "Voiding removes the order from net sales");

/* --------------------------------------------------------------- closing */

const closedDay = data.closings[0];
check(closedDay.lines.every((l) => reconciliationGap(l) === 0), "Seeded closed days are fully reconciled");
check(wasteSummary(data, periodRange("month", today)).discarded === 10, "Waste summary reads the closing records (10 seeded)");

const badLines: ClosingLineItem[] = [
  { productId: chicken.id, opening: 0, prepared: 50, sold: 3, remaining: 47, discarded: 0, carriedOver: 0, other: 0 },
];
check(!closeOperatingDay(data, today, badLines).ok, "Closing is blocked until every serving is reconciled");

const goodLines: ClosingLineItem[] = [
  { productId: chicken.id, opening: 0, prepared: 50, sold: 3, remaining: 47, discarded: 2, carriedOver: 45, other: 0 },
];
const closed = closeOperatingDay(data, today, goodLines);
check(closed.ok, "A reconciled day closes successfully");
if (closed.ok) data = closed.data;
check(data.days.find((d) => d.date === today)?.status === "closed", "The operating day is marked closed");
check(availableServings(data, chicken.id) === 47, "Discarding removes 2 servings and carry-over keeps 45");
check(wasteSummary(data, periodRange("today", today)).discarded === 2, "Today's closing feeds the waste summary");
check(data.closings.some((c) => c.date === today), "A closing record is stored for today");

/* ------------------------------------------------------- menu & inventory */

const withProduct = upsertProduct(data, {
  name: "Test Dish",
  category: "Main Course",
  price: 199,
  image: null,
  description: "Test",
});
check(withProduct.data.products.length === 7, "Adding a product appends to the shared catalogue");
const withRecipe = setRecipe(withProduct.data, withProduct.id, [{ ingredientId: "ing-chicken", qty: 250, unit: "g" }]);
check(
  withRecipe.recipes.filter((r) => r.productId === withProduct.id).length === 1,
  "Saving a recipe replaces that product's lines"
);

const ingredientForMove = withRecipe.ingredients.find((i) => i.id === "ing-chicken") as { stock: number };
const restocked = applyStockMovement(withRecipe, "ing-chicken", "restock", 5, "delivery");
check(
  Math.abs((restocked.ingredients.find((i) => i.id === "ing-chicken") as { stock: number }).stock - (ingredientForMove.stock + 5)) < 0.0001,
  "Restocking adds stock and writes a movement"
);

/* ------------------------------------------------- no negative quantities */

const drained = applyStockMovement(restocked, "ing-garlicpowder", "loss", -999, "test drain");
const drainedStock = (drained.ingredients.find((i) => i.id === "ing-garlicpowder") as { stock: number }).stock;
check(drainedStock === 0, "A loss can never push stock below zero");
const lastMove = drained.movements.filter((m) => m.ingredientId === "ing-garlicpowder").at(-1);
check(lastMove?.balanceAfter === 0, "The movement ledger matches the floored stock");

const overPrepared = prepareServings(drained, { productId: chicken.id, servings: 5000, override: true });
check(overPrepared.ok, "An explicit override still confirms the batch");
if (overPrepared.ok) {
  check(
    overPrepared.data.ingredients.every((i) => i.stock >= 0),
    "Override preparation never writes a negative stock"
  );
  check(
    overPrepared.data.ingredients.every((i) => {
      const moves = overPrepared.data.movements.filter((m) => m.ingredientId === i.id);
      const last = moves[moves.length - 1];
      return last ? Math.abs(last.balanceAfter - i.stock) < 0.0001 : true;
    }),
    "Every ledger still ends at its current stock after an override"
  );
}

const levels = stockState(restocked);
check(levels.out.length + levels.low.length + levels.normal.length === 29, "Stock status partitions every ingredient");
check(convertQty(200, "g", "kg") === 0.2, "Unit conversion: 200 g to kg");
check(convertQty(1, "kg", "pcs") === null, "Incompatible units are rejected");

console.log(failures ? `\n${failures} CHECK(S) FAILED` : "\nALL CHECKS PASSED");
if (failures) process.exit(1);
