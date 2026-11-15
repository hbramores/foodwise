import { buildDemoData } from "../src/lib/demo";
import { computeForecast, estimatedAvoidableCost } from "../src/lib/forecast";
import { todayISO } from "../src/lib/date";

const data = buildDemoData();
const today = todayISO();

const expected: Record<string, number> = {
  "Fried Chicken": 46,
  "Pork Adobo": 39,
  "Filipino Spaghetti": 44,
  "Beef Caldereta": 25,
  "Pancit Canton": 33,
  "Chicken Inasal": 36,
};

let failures = 0;

console.log("restaurant:", data.restaurant?.name, "| period:", data.settings.historicalPeriod);
console.log("dishes:", data.dishes.length, "records:", data.records.length);

for (const dish of data.dishes) {
  const recs = data.records.filter((r) => r.dishId === dish.id);
  const f = computeForecast(recs, data.settings, today);
  const unit = dish.servingUnit;
  const ok = f.recommended === expected[dish.name];
  if (!ok) failures += 1;
  const cost = estimatedAvoidableCost(f.potentialReduction, dish.costPerServing);
  console.log(
    `${ok ? "PASS" : "FAIL"} ${dish.name.padEnd(18)} avg=${f.averageSales.toFixed(0).padStart(3)} ` +
      `rec=${String(f.recommended).padStart(3)} (expected ${expected[dish.name]}) ` +
      `avgPrep=${f.averagePreparedCeil} reduction=${f.potentialReduction} ` +
      `cost=${cost === null ? "n/a" : "PHP" + cost} eligible=${f.eligibleDays}/${f.totalEligibleDays}`
  );
}

// total recommended
const total = data.dishes.reduce(
  (sum, dish) =>
    sum +
    (computeForecast(
      data.records.filter((r) => r.dishId === dish.id),
      data.settings,
      today
    ).recommended ?? 0),
  0
);
console.log("total recommended:", total, "(expected 223)");
if (total !== 223) failures += 1;

// insufficient-data rule: a brand new dish with 2 records yields no recommendation
const sparse = data.records.slice(0, 2).map((r) => ({ ...r, dishId: "x" }));
const sparseForecast = computeForecast(sparse, data.settings, today);
console.log("sparse (2 records) recommended:", sparseForecast.recommended, "(expected null)");
if (sparseForecast.recommended !== null) failures += 1;

// not-offered records are excluded from averages
const offered = computeForecast(
  data.records.filter((r) => r.dishId === "dish_fried_chicken" && r.date < today).slice(0, 5),
  { historicalPeriod: 7, safetyAllowance: 0.1 },
  today
);
const withOff = computeForecast(
  data.records
    .filter((r) => r.dishId === "dish_fried_chicken" && r.date < today)
    .slice(0, 5)
    .map((r, i) => (i === 0 ? { ...r, wasOffered: false } : r)),
  { historicalPeriod: 7, safetyAllowance: 0.1 },
  today
);
console.log(
  "not-offered exclusion:",
  offered.eligibleDays,
  "->",
  withOff.eligibleDays,
  "(expected 5 -> 4)"
);
if (!(offered.eligibleDays === 5 && withOff.eligibleDays === 4)) failures += 1;

// Zero sales count as a recorded day; same-day and future sales never enter a forecast.
const sample = data.records.filter(r => r.dishId === data.dishes[0].id).slice(0, 3);
const zeros = computeForecast(sample.map(r => ({...r, sold: 0})), data.settings, today);
if (zeros.eligibleDays !== 3 || zeros.recommended !== 0) failures += 1;
const boundary = computeForecast([...sample, {...sample[0], date: today, sold: 9999}], data.settings, today);
if (boundary.eligibleDays !== 3 || boundary.totalSold !== sample.reduce((sum,r) => sum+r.sold,0)) failures += 1;
console.log("Zero-sales and forecast-date boundary checks:", zeros.recommended === 0 && boundary.eligibleDays === 3 ? "PASS" : "FAIL");

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
