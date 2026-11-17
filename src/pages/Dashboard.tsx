import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Boxes,
  ChefHat,
  ChevronRight,
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
import { DetailPanel, DetailSection, GoldCallout, InfoTile } from "../components/DetailPanel";
import { useStore } from "../data/store";
import type { RouteKey } from "../hooks";
import type { AppData } from "../types";
import {
  PERIODS,
  availableServings,
  discardedQty,
  insights as buildInsights,
  kpis,
  periodRange,
  productFlow,
  stockState,
  wasteSummary,
  type Insight,
  type PeriodKey,
  type PeriodRange,
} from "../lib/calc";
import { formatCompact, formatLong, manilaToday } from "../lib/date";
import { num, peso, percent } from "../lib/format";
import { qtyLabel } from "../lib/units";

type PanelKey = "flow" | "waste" | "stock" | "insight" | null;

export function Dashboard({ navigate }: { navigate: (r: RouteKey) => void }) {
  const { data } = useStore();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [panel, setPanel] = useState<PanelKey>(null);
  const today = manilaToday();

  const range = useMemo(() => periodRange(period, today), [period, today]);
  const summary = useMemo(() => kpis(data, range), [data, range]);
  const waste = useMemo(() => wasteSummary(data, range), [data, range]);
  const stock = useMemo(() => stockState(data), [data]);
  const tips = useMemo(() => buildInsights(data, range, 4), [data, range]);

  const remaining = Math.max(0, summary.prepared - summary.sold - waste.discarded);
  const soldShare = summary.prepared > 0 ? summary.sold / summary.prepared : 0;
  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? "";

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

      <section className="kpis kpis--dash" aria-label="Key figures">
        <Kpi icon={<Wallet className="ico" />} tone="green" label="Total Sales" value={peso(summary.sales)} />
        <Kpi icon={<ShoppingCart className="ico" />} tone="gold" label="Orders" value={num(summary.orders)} />
        <Kpi icon={<ChefHat className="ico" />} tone="gold" label="Servings Prepared" value={num(summary.prepared)} />
        <Kpi icon={<Flame className="ico" />} tone="green" label="Servings Sold" value={num(summary.sold)} />
      </section>

      {/* Two balanced rows: flow | waste, then stock | insight */}
      <div className="dashgrid">
        <PanelCard
          title="Prepared vs. Sold"
          icon={<ChefHat className="ico" />}
          sub={`${periodLabel} · servings`}
          onOpen={() => setPanel("flow")}
        >
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
            Remaining servings have not been sold or recorded as discarded yet — they are not counted
            as waste until Wrap Up.
          </p>
        </PanelCard>

        <PanelCard
          title="Food Waste Summary"
          icon={<Trash2 className="ico" />}
          sub="Derived from Wrap Up records"
          onOpen={() => setPanel("waste")}
        >
          <div className="statgrid">
            <Stat label="Discarded servings" value={num(waste.discarded)} />
            <Stat label="Avg. per closed day" value={waste.closedDays ? num(waste.perClosedDay) : "—"} />
            <Stat label="Waste rate" value={waste.rate === null ? "—" : percent(waste.rate)} />
            <Stat label="Closed days" value={num(waste.closedDays)} />
          </div>
          <p className="note">
            Waste uses completed Wrap Up records only — never an estimate from unsold food.
          </p>
        </PanelCard>

        <PanelCard
          title="Ingredient Stock Status"
          icon={<Package className="ico" />}
          sub={`${stock.active.length} active ingredients`}
          onOpen={() => setPanel("stock")}
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
                    .slice(0, 5)
                    .map((i) => `${i.name} (${qtyLabel(i.stock)} ${i.unit})`)
                    .join(", ")}
                  {stock.low.length > 5 ? ` +${stock.low.length - 5} more` : ""}
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
        </PanelCard>

        <PanelCard
          title="FoodWise Insight"
          icon={<Lightbulb className="ico" />}
          sub="Rule-based observations · Demo"
          onOpen={() => setPanel("insight")}
        >
          <ul className="insights">
            {tips.map((tip) => (
              <li key={tip.id} className={`insights__item insights__item--${tip.tone}`}>
                {tip.tone === "warn" ? (
                  <AlertTriangle className="ico" />
                ) : tip.tone === "good" ? (
                  <BadgeCheck className="ico" />
                ) : (
                  <Lightbulb className="ico" />
                )}
                <span>{tip.text}</span>
              </li>
            ))}
          </ul>
        </PanelCard>
      </div>

      <Card title="Quick Actions" icon={<ArrowRight className="ico" />}>
        <div className="quickactions">
          <Button className="qbtn" icon={<ShoppingCart className="ico" />} onClick={() => navigate("pos")}>
            <span className="qbtn__long">Open POS</span>
            <span className="qbtn__short">POS</span>
          </Button>
          <Button
            className="qbtn"
            variant="accent"
            icon={<ChefHat className="ico" />}
            onClick={() => {
              try {
                sessionStorage.setItem("foodwise:openPrep", "1");
              } catch {
                /* storage unavailable — the POS still opens */
              }
              navigate("pos");
            }}
          >
            <span className="qbtn__long">Add Prepared Food</span>
            <span className="qbtn__short">Prepare</span>
          </Button>
          <Button className="qbtn" variant="soft" icon={<TrendingUp className="ico" />} onClick={() => navigate("forecast")}>
            <span className="qbtn__long">View Forecast</span>
            <span className="qbtn__short">Forecast</span>
          </Button>
          <Button className="qbtn" variant="soft" icon={<ClipboardList className="ico" />} onClick={() => navigate("inventory")}>
            <span className="qbtn__long">View Inventory</span>
            <span className="qbtn__short">Inventory</span>
          </Button>
        </div>
        <p className="note">
          Operating window {formatCompact(range.from)} – {formatCompact(range.to)}.
        </p>
      </Card>

      <FlowPanel
        open={panel === "flow"}
        onClose={() => setPanel(null)}
        range={range}
        periodLabel={periodLabel}
        data={data}
      />
      <WastePanel
        open={panel === "waste"}
        onClose={() => setPanel(null)}
        range={range}
        periodLabel={periodLabel}
        data={data}
      />
      <StockPanel open={panel === "stock"} onClose={() => setPanel(null)} data={data} navigate={navigate} />
      <InsightPanel open={panel === "insight"} onClose={() => setPanel(null)} tips={buildInsights(data, range, 12)} />
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

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

/** A card that behaves as one clickable element opening its detail panel. */
function PanelCard({
  title,
  icon,
  sub,
  onOpen,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  sub?: string;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className="card card--click"
      role="button"
      tabIndex={0}
      aria-label={`Open ${title} details`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <header className="card__head">
        <h2 className="card__title">
          {icon}
          {title}
        </h2>
        <span className="card__hint" aria-hidden="true">
          <ChevronRight className="ico" />
        </span>
      </header>
      {sub ? <p className="card__sub">{sub}</p> : null}
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ panels */

function FlowPanel({
  open,
  onClose,
  data,
  range,
  periodLabel,
}: {
  open: boolean;
  onClose: () => void;
  data: AppData;
  range: PeriodRange;
  periodLabel: string;
}) {
  const flows = productFlow(data, range);
  const totals = flows.reduce(
    (acc, f) => ({
      prepared: acc.prepared + f.prepared,
      sold: acc.sold + f.sold,
      discarded: acc.discarded + f.discarded,
      remaining: acc.remaining + Math.max(0, f.prepared - f.sold - f.discarded),
    }),
    { prepared: 0, sold: 0, discarded: 0, remaining: 0 }
  );
  const peak = Math.max(1, ...flows.map((f) => f.prepared));
  const overall = totals.prepared > 0 ? totals.sold / totals.prepared : null;
  const leftovers = data.products
    .filter((p) => p.status === "active")
    .map((p) => ({ name: p.name, available: availableServings(data, p.id) }))
    .filter((row) => row.available > 0)
    .sort((a, b) => b.available - a.available);

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      size="wide"
      eyebrow="Dashboard"
      title="Prepared vs. Sold"
      subtitle={`${periodLabel} · ${formatCompact(range.from)} – ${formatCompact(range.to)}`}
      footer={
        <div className="dpanel__actions">
          <span className="dpanel__total">{num(totals.prepared)} prepared · {num(totals.sold)} sold</span>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <GoldCallout
        label="Sell-through"
        value={overall === null ? "—" : percent(overall)}
        basis={
          overall === null
            ? "No servings were prepared in this period."
            : `${num(totals.sold)} of ${num(totals.prepared)} prepared servings were sold.`
        }
      />

      <div className="infogrid">
        <InfoTile label="Servings prepared" value={num(totals.prepared)} />
        <InfoTile label="Servings sold" value={num(totals.sold)} />
        <InfoTile label="Remaining" value={num(totals.remaining)} />
        <InfoTile label="Discarded" value={num(totals.discarded)} />
      </div>

      <DetailSection title="Preparation versus sales">
        <ul className="flowlist">
          {flows.map((f) => (
            <li key={f.productId}>
              <span className="flowlist__name">{f.name}</span>
              <span className="flowlist__bars">
                <i
                  className="flowlist__prep"
                  style={{ width: `${Math.max(4, Math.round((f.prepared / peak) * 100))}%` }}
                />
                <i
                  className="flowlist__sold"
                  style={{ width: `${Math.max(f.sold > 0 ? 4 : 0, Math.round((f.sold / peak) * 100))}%` }}
                />
              </span>
              <span className="flowlist__nums">
                {num(f.sold)}/{num(f.prepared)}
              </span>
            </li>
          ))}
        </ul>
        <p className="note">
          Gold is prepared, green is sold. Values come from confirmed preparation batches and
          completed POS sales in this period.
        </p>
      </DetailSection>

      <DetailSection title="Leftover servings today">
        {leftovers.length ? (
          <div className="infogrid">
            {leftovers.map((row) => (
              <InfoTile key={row.name} label={row.name} value={num(row.available)} />
            ))}
          </div>
        ) : (
          <p className="note">
            No prepared servings are currently unsold today — nothing is waiting to sell or reconcile.
          </p>
        )}
      </DetailSection>

      <DetailSection title="Product breakdown">
        <div className="tablewrap">
          <table className="table table--compact">
            <thead>
              <tr>
                <th scope="col">Dish</th>
                <th scope="col">Prepared</th>
                <th scope="col">Sold</th>
                <th scope="col">Remaining</th>
                <th scope="col">Discarded</th>
                <th scope="col">Sell-through</th>
              </tr>
            </thead>
            <tbody>
              {flows.map((f) => (
                <tr key={f.productId}>
                  <th scope="row">{f.name}</th>
                  <td>{num(f.prepared)}</td>
                  <td>{num(f.sold)}</td>
                  <td>{num(Math.max(0, f.prepared - f.sold - f.discarded))}</td>
                  <td>{num(f.discarded)}</td>
                  <td>{f.sellThrough === null ? "—" : percent(f.sellThrough)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DetailSection>
    </DetailPanel>
  );
}

function WastePanel({
  open,
  onClose,
  data,
  range,
  periodLabel,
}: {
  open: boolean;
  onClose: () => void;
  data: AppData;
  range: PeriodRange;
  periodLabel: string;
}) {
  const summary = wasteSummary(data, range);
  const flow = kpis(data, range);
  const closings = data.closings
    .filter((c) => c.date >= range.from && c.date <= range.to)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const peakDay = Math.max(1, ...closings.map((c) => c.lines.reduce((s, l) => s + l.discarded, 0)));

  const byProduct = data.products
    .filter((p) => p.status === "active")
    .map((p) => ({ name: p.name, qty: discardedQty(data, p.id, range) }))
    .filter((row) => row.qty > 0)
    .sort((a, b) => b.qty - a.qty);

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      size="wide"
      eyebrow="Dashboard"
      title="Food Waste Summary"
      subtitle={`${periodLabel} · discarded = prepared − sold`}
      footer={
        <div className="dpanel__actions">
          <span className="dpanel__total">{num(summary.closedDays)} wrapped-up day(s)</span>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <GoldCallout
        label="Discarded servings"
        value={num(summary.discarded)}
        basis={
          summary.rate === null
            ? "No servings were prepared in this period."
            : `${percent(summary.rate)} of everything prepared was discarded across ${num(summary.closedDays)} wrapped-up day(s).`
        }
      />

      <div className="infogrid">
        <InfoTile label="Waste rate" value={summary.rate === null ? "—" : percent(summary.rate)} />
        <InfoTile label="Avg. per closed day" value={num(summary.perClosedDay)} />
        <InfoTile label="Prepared in period" value={num(summary.prepared)} />
        <InfoTile label="Discarded in period" value={num(summary.discarded)} />
      </div>

      <DetailSection title="Prepared, sold and discarded">
        <div className="infogrid">
          <InfoTile label="Servings prepared" value={num(summary.prepared)} />
          <InfoTile label="Servings sold" value={num(flow.sold)} />
          <InfoTile label="Servings discarded" value={num(summary.discarded)} />
          <InfoTile
            label="Still unaccounted"
            value={num(Math.max(0, summary.prepared - flow.sold - summary.discarded))}
          />
        </div>
        <p className="note">
          Discarded is calculated at Wrap Up as Prepared − Sold. Only completed Wrap Up records
          contribute to finalized discarded quantities, so open days stay out of the total.
        </p>
      </DetailSection>

      <DetailSection title="Highest discarded dishes">
        {byProduct.length ? (
          <ul className="lines">
            {byProduct.slice(0, 8).map((row) => (
              <li key={row.name}>
                <span>{row.name}</span>
                <b>{num(row.qty)} servings</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="note">Nothing has been discarded in this period.</p>
        )}
      </DetailSection>

      <DetailSection title="Waste trend by wrapped-up day">
        {closings.length ? (
          <div className="sparkbars">
            {[...closings].reverse().map((c) => {
              const total = c.lines.reduce((s, l) => s + l.discarded, 0);
              return (
                <span className="sparkbars__col" key={c.id}>
                  <i style={{ height: `${Math.max(4, Math.round((total / peakDay) * 100))}%` }} />
                  <b>{num(total)}</b>
                  <small>{formatCompact(c.date)}</small>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="note">No completed Wrap Up records in this period yet.</p>
        )}
      </DetailSection>

      <DetailSection title="Wrap Up records">
        {closings.length ? (
          <ul className="wastelogs">
            {closings.slice(0, 6).map((c) => {
              const discarded = c.lines.reduce((s, l) => s + l.discarded, 0);
              const prepared = c.lines.reduce((s, l) => s + l.prepared, 0);
              const sold = c.lines.reduce((s, l) => s + l.sold, 0);
              return (
                <li key={c.id}>
                  <span className="wastelogs__date">{formatCompact(c.date)}</span>
                  <span className="wastelogs__nums">
                    prepared {num(prepared)} · sold {num(sold)} · discarded <b>{num(discarded)}</b>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="note">Wrap up an operating day to start building waste history.</p>
        )}
      </DetailSection>
    </DetailPanel>
  );
}

function StockPanel({
  open,
  onClose,
  data,
  navigate,
}: {
  open: boolean;
  onClose: () => void;
  data: AppData;
  navigate: (r: RouteKey) => void;
}) {
  const stock = stockState(data);
  const list = (items: typeof stock.active) =>
    items.slice(0, 10).map((i) => `${i.name} · ${qtyLabel(i.stock)} ${i.unit}`);

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      eyebrow="Dashboard"
      title="Ingredient Stock Status"
      subtitle={`${stock.active.length} active ingredients`}
      footer={
        <div className="dpanel__actions">
          <Button
            variant="accent"
            icon={<Boxes className="ico" />}
            onClick={() => {
              onClose();
              navigate("inventory");
            }}
          >
            Open Inventory
          </Button>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="infogrid">
        <InfoTile label="Total ingredients" value={stock.active.length} />
        <InfoTile label="In stock" value={stock.normal.length} />
        <InfoTile label="Low stock" value={stock.low.length} />
        <InfoTile label="Out of stock" value={stock.out.length} />
      </div>

      {stock.out.length ? (
        <DetailSection title="Out of stock">
          <ul className="lines">
            {list(stock.out).map((row) => (
              <li key={row}><span>{row.split(" · ")[0]}</span><b>{row.split(" · ")[1]}</b></li>
            ))}
          </ul>
        </DetailSection>
      ) : null}

      {stock.low.length ? (
        <DetailSection title="Running low">
          <ul className="lines">
            {list(stock.low).map((row) => (
              <li key={row}><span>{row.split(" · ")[0]}</span><b>{row.split(" · ")[1]}</b></li>
            ))}
          </ul>
        </DetailSection>
      ) : null}

      <DetailSection title="Healthy stock">
        <ul className="lines">
          {list(stock.normal).map((row) => (
            <li key={row}><span>{row.split(" · ")[0]}</span><b>{row.split(" · ")[1]}</b></li>
          ))}
        </ul>
        <p className="note">
          Quantities reflect the current stock ledger. Low-stock thresholds are managed in Inventory.
        </p>
      </DetailSection>
    </DetailPanel>
  );
}

function InsightPanel({
  open,
  onClose,
  tips,
}: {
  open: boolean;
  onClose: () => void;
  tips: Insight[];
}) {
  const groups: Array<{ title: string; kinds: Insight["kind"][] }> = [
    { title: "Overproduction warnings", kinds: ["overproduction"] },
    { title: "Frequently sold dishes", kinds: ["popular"] },
    { title: "Repeated waste", kinds: ["waste"] },
    { title: "Ingredient stock concerns", kinds: ["stock"] },
    { title: "Forecast history", kinds: ["history"] },
    { title: "Operational observations", kinds: ["ok"] },
  ];

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      size="wide"
      eyebrow="Dashboard"
      title="FoodWise Insight"
      subtitle="Rule-based observations · Demo"
      footer={
        <div className="dpanel__actions">
          <span className="dpanel__total">No AI service — computed from your records</span>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <p className="note">
        These observations are produced by transparent rules over the application&apos;s own
        preparation, sales, inventory and Wrap Up records. They are not generated by an AI model and
        should be reviewed before acting on them.
      </p>

      {groups.map((group) => {
        const items = tips.filter((t) => group.kinds.includes(t.kind));
        if (!items.length) return null;
        return (
          <DetailSection title={group.title} key={group.title}>
            <ul className="insights">
              {items.map((tip) => (
                <li key={tip.id} className={`insights__item insights__item--${tip.tone}`}>
                  {tip.tone === "warn" ? (
                    <AlertTriangle className="ico" />
                  ) : tip.tone === "good" ? (
                    <BadgeCheck className="ico" />
                  ) : (
                    <Lightbulb className="ico" />
                  )}
                  <span>
                    {tip.text}
                    {tip.action ? <em className="insights__action">{tip.action}</em> : null}
                  </span>
                </li>
              ))}
            </ul>
          </DetailSection>
        );
      })}
    </DetailPanel>
  );
}
