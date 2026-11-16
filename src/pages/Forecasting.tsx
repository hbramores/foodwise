import { useMemo, useState } from "react";
import { Calculator, ChefHat, Info, TrendingUp } from "lucide-react";
import { Badge, Button, Card, EmptyState, Segmented } from "../components/ui";
import { DetailPanel, DetailRows, DetailSection } from "../components/DetailPanel";
import { useStore } from "../data/store";
import { FORECAST_WINDOW, type MenuProduct } from "../types";
import { productImage, productInitial } from "../lib/images";
import {
  availableServings,
  forecastFor,
  preparedQty,
  soldQty,
  type Forecast,
} from "../lib/calc";
import { formatCompact, manilaToday } from "../lib/date";
import { num, peso } from "../lib/format";

export function Forecasting() {
  const { data } = useStore();
  const [view, setView] = useState<"cards" | "table">("cards");
  const [selected, setSelected] = useState<MenuProduct | null>(null);
  const today = manilaToday();

  const products = useMemo(() => data.products.filter((p) => p.status === "active"), [data.products]);
  const forecasts = useMemo(
    () => new Map(products.map((p) => [p.id, forecastFor(data, p.id)])),
    [products, data]
  );

  const allDates = useMemo(() => {
    const set = new Set<string>();
    for (const f of forecasts.values()) f.dates.forEach((d) => set.add(d));
    return [...set].sort();
  }, [forecasts]);

  return (
    <div className="stack">
      <header className="head">
        <div className="head__lead">
          <h1 className="head__title">Forecasting</h1>
          <p className="head__sub">
            Recommended servings from the latest {FORECAST_WINDOW} recorded operating dates of
            completed POS sales.
          </p>
        </div>
        <div className="head__actions">
          <Segmented
            value={view}
            options={[
              { value: "cards" as const, label: "Cards" },
              { value: "table" as const, label: "History table" },
            ]}
            onChange={setView}
            ariaLabel="Forecast view"
          />
        </div>
      </header>

      <div className="banner banner--info banner--hint">
        <Info className="ico" />
        <div>
          <b>How the number is calculated</b>
          <p>
            Recommended servings = ROUND(sum of daily sales ÷ number of recorded days). Missing days
            are skipped, not treated as zero, and voided or refunded quantities are excluded.
          </p>
        </div>
      </div>

      {!products.length ? (
        <Card>
          <EmptyState icon={<TrendingUp className="ico" />} title="No active dishes" description="Add dishes in Menu & Recipes to start forecasting." />
        </Card>
      ) : view === "cards" ? (
        <div className="fgrid">
          {products.map((product) => {
            const f = forecasts.get(product.id) as Forecast;
            return (
              <button key={product.id} type="button" className="fcard2" onClick={() => setSelected(product)}>
                <span className="fcard2__media">
                  {productImage(product) ? <img src={productImage(product) as string} alt={product.name} loading="lazy" /> : <span className="menuitem__ph">{productInitial(product.name)}</span>}
                </span>
                <span className="fcard2__info">
                  <b>{product.name}</b>
                  <small>{product.category} · {peso(product.price)}</small>
                  <span className="fcard2__days">
                    {f.validDays ? `${f.validDays} of ${FORECAST_WINDOW} days recorded` : "No recorded days yet"}
                  </span>
                </span>
                <span className="fcard2__rec">
                  <small>Prepare</small>
                  <b>{f.recommended === null ? "—" : num(f.recommended)}</b>
                  <small>servings</small>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <Card title="Five-day sales history" icon={<Calculator className="ico" />} sub="Completed POS sales per operating day">
          <div className="tablewrap">
            <table className="table table--compact">
              <thead>
                <tr>
                  <th scope="col">Dish</th>
                  {allDates.map((date) => (
                    <th scope="col" key={date}>{formatCompact(date)}</th>
                  ))}
                  <th scope="col" className="avgcol">Average</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const f = forecasts.get(product.id) as Forecast;
                  return (
                    <tr key={product.id} className="table__row" role="button" tabIndex={0} onClick={() => setSelected(product)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(product); } }}>
                      <th scope="row">{product.name}</th>
                      {allDates.map((date) => {
                        const idx = f.dates.indexOf(date);
                        return <td key={date}>{idx >= 0 ? num(f.values[idx]) : "—"}</td>;
                      })}
                      <td className="avgcol"><b>{f.recommended === null ? "—" : num(f.recommended)}</b></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ForecastDetails product={selected} onClose={() => setSelected(null)} />

      <Card title="Preparation comparison" icon={<ChefHat className="ico" />} sub="Recommended against what is already available today">
        <div className="tablewrap">
          <table className="table table--compact">
            <thead>
              <tr>
                <th scope="col">Dish</th>
                <th scope="col">Recommended</th>
                <th scope="col">Available now</th>
                <th scope="col">Prepared (window)</th>
                <th scope="col">Sold (window)</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const f = forecasts.get(product.id) as Forecast;
                return (
                  <tr key={product.id}>
                    <td><b>{product.name}</b></td>
                    <td>{f.recommended === null ? "—" : <Badge tone="sage">{num(f.recommended)}</Badge>}</td>
                    <td>{num(availableServings(data, product.id))}</td>
                    <td>{num(preparedQty(data, product.id, { from: f.dates[0] ?? today, to: today }))}</td>
                    <td>{num(soldQty(data, product.id, { from: f.dates[0] ?? today, to: today }))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ForecastDetails({ product, onClose }: { product: MenuProduct | null; onClose: () => void }) {
  const { data } = useStore();
  const today = manilaToday();
  const f = product ? forecastFor(data, product.id) : null;

  return (
    <DetailPanel
      open={Boolean(product && f)}
      onClose={onClose}
      eyebrow="Forecast"
      title={product?.name ?? ""}
      subtitle={product ? `${product.category} · ${peso(product.price)}` : ""}
      media={product && productImage(product) ? <img className="dpanel__img" src={productImage(product) as string} alt={product.name} /> : null}
      footer={
        <div className="dpanel__actions">
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      }
    >
      {f ? (
        <>
          <section className="reccallout">
            <span>Recommended servings</span>
            <b>{f.recommended === null ? "—" : num(f.recommended)}</b>
            <small>
              {f.validDays
                ? `${num(f.total)} sales ÷ ${f.validDays} recorded day(s)`
                : "Insufficient data — record at least one operating day"}
            </small>
          </section>

          <DetailSection title="Recent recorded days">
            {f.dates.length ? (
              <ul className="lines">
                {f.dates.map((date, i) => (
                  <li key={date}>
                    <span>{formatCompact(date)}</span>
                    <b>{num(f.values[i])} sold</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="note">No recorded sales yet for this dish.</p>
            )}
          </DetailSection>

          <DetailSection title="Calculation">
            <div className="mathline">
              {f.values.length ? (
                <>
                  <span>{f.values.join(" + ")} = {num(f.total)}</span>
                  <span className="muted">÷ {f.validDays} day(s)</span>
                  <span>= {f.average === null ? "—" : f.average.toFixed(2)}</span>
                  <span>→ ROUND = <b>{f.recommended === null ? "—" : num(f.recommended)}</b></span>
                </>
              ) : (
                <span className="muted">Insufficient data</span>
              )}
            </div>
          </DetailSection>

          <DetailRows
            rows={[
              { label: "Available now", value: num(availableServings(data, product?.id ?? "")) },
              { label: "Prepared in window", value: num(preparedQty(data, product?.id ?? "", { from: f.dates[0] ?? today, to: today })) },
              { label: "Sold in window", value: num(soldQty(data, product?.id ?? "", { from: f.dates[0] ?? today, to: today })) },
              { label: "Recorded days", value: `${f.validDays} of ${FORECAST_WINDOW}` },
            ]}
          />
        </>
      ) : null}
    </DetailPanel>
  );
}
