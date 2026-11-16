import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  ChefHat,
  ClipboardList,
  Flame,
  Lightbulb,
  Package,
  ShoppingCart,
  TrendingUp,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button, Card, Segmented } from "../components/ui";
import { useStore } from "../data/store";
import type { RouteKey } from "../hooks";
import {
  PERIODS,
  availableServings,
  insights as buildInsights,
  kpis,
  periodRange,
  stockState,
  wasteSummary,
  type PeriodKey,
} from "../lib/calc";
import { formatCompact, formatLong, manilaToday } from "../lib/date";
import { num, peso, percent } from "../lib/format";
import { qtyLabel } from "../lib/units";

export function Dashboard({ navigate }: { navigate: (r: RouteKey) => void }) {
  const { data } = useStore();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const today = manilaToday();

  const range = useMemo(() => periodRange(period, today), [period, today]);
  const summary = useMemo(() => kpis(data, range), [data, range]);
  const waste = useMemo(() => wasteSummary(data, range), [data, range]);
  const stock = useMemo(() => stockState(data), [data]);
  const tips = useMemo(() => buildInsights(data, range), [data, range]);

  const remaining = data.products
    .filter((p) => p.status === "active")
    .reduce((sum, p) => sum + availableServings(data, p.id), 0);

  const soldShare = summary.prepared > 0 ? summary.sold / summary.prepared : 0;

  return (
    <div className="stack">
      <header className="head">
        <div className="head__lead">
          <h1 className="head__title">{data.settings.restaurantName || "Your restaurant"}</h1>
          <p className="head__sub">
            {formatLong(today)} · operations across sales, preparation, inventory and waste.
          </p>
        </div>
        <div className="head__actions">
          <Segmented
            value={period}
            options={PERIODS.map((p) => ({ value: p.key, label: p.label }))}
            onChange={setPeriod}
            ariaLabel="Date range"
          />
        </div>
      </header>

      <section className="kpis" aria-label="Key figures">
        <Kpi icon={<Wallet className="ico" />} tone="green" label="Total Sales" value={peso(summary.sales)} />
        <Kpi icon={<ShoppingCart className="ico" />} tone="gold" label="Orders" value={num(summary.orders)} />
        <Kpi icon={<ChefHat className="ico" />} tone="gold" label="Servings Prepared" value={num(summary.prepared)} />
        <Kpi icon={<Flame className="ico" />} tone="green" label="Servings Sold" value={num(summary.sold)} />
      </section>

      <div className="grid2">
        <Card title="Prepared vs. Sold" icon={<ChefHat className="ico" />} sub={`${PERIODS.find((p) => p.key === period)?.label} · servings`}>
          <div className="vs">
            <div className="vs__row">
              <span className="vs__label">Prepared</span>
              <span className="vs__bar">
                <i className="vs__fill vs__fill--gold" style={{ width: "100%" }} />
              </span>
              <b>{num(summary.prepared)}</b>
            </div>
            <div className="vs__row">
              <span className="vs__label">Sold</span>
              <span className="vs__bar">
                <i className="vs__fill vs__fill--green" style={{ width: `${Math.round(soldShare * 100)}%` }} />
              </span>
              <b>{num(summary.sold)}</b>
            </div>
            <div className="vs__row">
              <span className="vs__label">Remaining</span>
              <span className="vs__bar">
                <i className="vs__fill vs__fill--muted" style={{ width: `${Math.round((1 - soldShare) * 100)}%` }} />
              </span>
              <b>{num(remaining)}</b>
            </div>
          </div>
          <p className="note">
            Remaining servings are still sellable or can be carried over. They are not counted as
            waste until a day is closed.
          </p>
        </Card>

        <Card title="Food Waste Summary" icon={<Trash2 className="ico" />} sub="Derived from closing records">
          <div className="statgrid">
            <Stat label="Discarded servings" value={num(waste.discarded)} />
            <Stat label="Avg. per closed day" value={waste.closedDays ? num(waste.perClosedDay) : "—"} />
            <Stat label="Waste rate" value={waste.rate === null ? "—" : percent(waste.rate)} />
            <Stat label="Closed days" value={num(waste.closedDays)} />
          </div>
          {waste.unreconciled > 0 ? (
            <p className="note note--warn">
              <AlertTriangle className="ico" /> {num(waste.unreconciled)} serving(s) are not yet
              reconciled in a closed day.
            </p>
          ) : (
            <p className="note">
              Waste uses actual closing records, never an estimate from unsold food.
            </p>
          )}
        </Card>
      </div>

      <Card
        title="Ingredient Stock Status"
        icon={<Package className="ico" />}
        tools={<Button variant="ghost" size="sm" onClick={() => navigate("inventory")}>Open Inventory</Button>}
      >
        {stock.out.length ? (
          <div className="stockbanner stockbanner--out">
            <AlertTriangle className="ico" />
            <div>
              <b>{stock.out.length} ingredient{stock.out.length === 1 ? "" : "s"} out of stock</b>
              <p>{stock.out.map((i) => i.name).join(", ")}</p>
            </div>
          </div>
        ) : stock.low.length ? (
          <div className="stockbanner stockbanner--low">
            <AlertTriangle className="ico" />
            <div>
              <b>{stock.low.length} ingredient{stock.low.length === 1 ? "" : "s"} running low</b>
              <p>
                {stock.low
                  .slice(0, 6)
                  .map((i) => `${i.name} (${qtyLabel(i.stock)} ${i.unit})`)
                  .join(", ")}
                {stock.low.length > 6 ? ` +${stock.low.length - 6} more` : ""}
              </p>
            </div>
          </div>
        ) : (
          <div className="stockbanner stockbanner--ok">
            <BadgeCheck className="ico" />
            <div>
              <b>All {stock.active.length} ingredients are in stock</b>
              <p>Nothing is below its low-stock threshold right now.</p>
            </div>
          </div>
        )}
      </Card>

      <Card title="FoodWise Insights · Demo" icon={<Lightbulb className="ico" />} sub="Rule-based suggestions from your own records">
        <ul className="insights">
          {tips.map((tip) => (
            <li key={tip.id} className={`insights__item insights__item--${tip.tone}`}>
              {tip.tone === "warn" ? <AlertTriangle className="ico" /> : tip.tone === "good" ? <BadgeCheck className="ico" /> : <Lightbulb className="ico" />}
              <span>{tip.text}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Quick Actions" icon={<ArrowRight className="ico" />}>
        <div className="quickactions">
          <Button icon={<ShoppingCart className="ico" />} onClick={() => navigate("pos")}>
            Open POS
          </Button>
          <Button variant="accent" icon={<ChefHat className="ico" />} onClick={() => navigate("pos")}>
            Add Prepared Food
          </Button>
          <Button variant="soft" icon={<TrendingUp className="ico" />} onClick={() => navigate("forecast")}>
            View Forecast
          </Button>
          <Button variant="soft" icon={<ClipboardList className="ico" />} onClick={() => navigate("inventory")}>
            View Inventory
          </Button>
        </div>
        <p className="note">
          Operating window {formatCompact(range.from)} – {formatCompact(range.to)}.
        </p>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "green" | "gold";
}) {
  return (
    <article className={`kpi kpi--${tone}`}>
      <span className="kpi__icon">{icon}</span>
      <span className="kpi__label">{label}</span>
      <b className="kpi__value">{value}</b>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}
