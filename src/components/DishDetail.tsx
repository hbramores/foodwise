import { Calculator, ClipboardList, Info, Lightbulb, Pencil, TrendingUp } from "lucide-react";
import type { Dish, ForecastSettings } from "../types";
import { MIN_ELIGIBLE_DAYS } from "../types";
import type { ForecastResult } from "../lib/forecast";
import { estimatedAvoidableCost } from "../lib/forecast";
import { num, percent, pesoPrecise, unitLabel } from "../lib/format";
import { formatLong, formatShort } from "../lib/date";
import { Drawer } from "./overlays";
import { Button } from "./ui";
import { DishImage } from "./DishImage";

function RecentBars({ forecast, unit }: { forecast: ForecastResult; unit: string }) {
  const rows = [...forecast.usedRecords].reverse();
  const max = Math.max(1, ...rows.map((r) => r.sold));
  return (
    <>
      <div className="bars" style={{ height: 132 }} aria-hidden="true">
        {rows.map((r) => (
          <div className="bars__col" key={r.id}>
            <div className="bars__track">
              <span
                className="bars__bar bars__bar--sold"
                style={{ height: `${Math.max(4, (r.sold / max) * 100)}%` }}
              />
            </div>
            <span className="bars__lab">{formatShort(r.date)}</span>
          </div>
        ))}
      </div>
      <div className="legend">
        <span className="ppill ppill--sold">
          <i />
          Sold {unitLabel(2, unit)}
        </span>
      </div>
    </>
  );
}

export function ForecastExplanation({
  dish,
  forecast,
  settings,
  forecastDate,
}: {
  dish: Dish;
  forecast: ForecastResult;
  settings: ForecastSettings;
  forecastDate: string;
}) {
  const unit = dish.servingUnit;
  const cost = estimatedAvoidableCost(forecast.potentialReduction, dish.costPerServing);

  if (!forecast.hasEnoughData || forecast.recommended === null) {
    return (
      <div className="callout">
        <Info className="ico" />
        <span>
          Not enough sales data yet. Record at least {MIN_ELIGIBLE_DAYS} days of sales for this
          dish to receive a preparation recommendation.
        </span>
      </div>
    );
  }

  return (
    <div className="calc">
      <div>
        <h3 className="drawer-section">Recent sales</h3>
        <p className="field__hint" style={{ marginBottom: 12 }}>
          The last {forecast.usedRecords.length} recorded{" "}
          {forecast.usedRecords.length === 1 ? "day" : "days"} before {formatShort(forecastDate)}.
        </p>
        <RecentBars forecast={forecast} unit={unit} />
      </div>

      <div>
        <h3 className="drawer-section">
          <Calculator className="ico" style={{ width: 15, height: 15 }} /> How this was calculated
        </h3>
        <div className="calc" style={{ gap: 10 }}>
          <div className="calc__row">
            <span>Total sold in the last {forecast.eligibleDays} days</span>
            <b>
              {num(forecast.totalSold)} {unitLabel(forecast.totalSold, unit)}
            </b>
          </div>
          <div className="calc__row">
            <span>Average daily sales</span>
            <b>
              {num(Math.round(forecast.averageSales * 10) / 10)} {unitLabel(2, unit)}/day
            </b>
          </div>
          <div className="calc__row">
            <span>Safety allowance ({percent(settings.safetyAllowance)})</span>
            <b>
              +{num(Math.ceil(forecast.averageSales * settings.safetyAllowance))}{" "}
              {unitLabel(2, unit)}
            </b>
          </div>
          <div className="calc__row is-total">
            <span>Recommended to prepare</span>
            <b>
              {num(forecast.recommended)} {unitLabel(forecast.recommended, unit)}
            </b>
          </div>
        </div>
        <div className="callout" style={{ marginTop: 14 }}>
          <Lightbulb className="ico" />
          <span>
            Average sales of {num(Math.round(forecast.averageSales * 10) / 10)} {unitLabel(2, unit)}
            /day, plus {percent(settings.safetyAllowance)} extra in case more customers arrive than
            usual. Rounded up to a whole {unit}.
          </span>
        </div>
      </div>

      {forecast.averagePreparedCeil !== null ? (
        <div>
          <h3 className="drawer-section">
            <TrendingUp className="ico" style={{ width: 15, height: 15 }} /> Usual vs recommended
          </h3>
          <div className="calc" style={{ gap: 10 }}>
            <div className="calc__row">
              <span>Average prepared in the same period</span>
              <b>
                {num(forecast.averagePreparedCeil)} {unitLabel(forecast.averagePreparedCeil, unit)}
              </b>
            </div>
            <div className="calc__row">
              <span>Recommended to prepare</span>
              <b>
                {num(forecast.recommended)} {unitLabel(forecast.recommended, unit)}
              </b>
            </div>
            <div className="calc__row is-total">
              <span>Potential reduction</span>
              <b>
                {num(forecast.potentialReduction ?? 0)}{" "}
                {unitLabel(forecast.potentialReduction ?? 0, unit)}
              </b>
            </div>
          </div>

          {cost !== null ? (
            <div className="callout callout--good" style={{ marginTop: 14 }}>
              <TrendingUp className="ico" />
              <span>
                Illustrative potential cost reduction:{" "}
                <b>
                  {pesoPrecise(cost)} per day
                </b>{" "}
                ({num(forecast.potentialReduction ?? 0)} × {pesoPrecise(dish.costPerServing ?? 0)}{" "}
                cost per {unit}). Actual savings depend on whether production is reduced and which
                costs are avoidable.
              </span>
            </div>
          ) : (
            <div className="callout" style={{ marginTop: 14 }}>
              <Info className="ico" />
              <span>
                Add a cost per {unit} to this dish to see an illustrative cost reduction.
              </span>
            </div>
          )}
        </div>
      ) : null}

      <div className="callout callout--amber">
        <Info className="ico" />
        <span>
          Recommendations are estimates based on recorded sales. Adjust preparation when expecting
          unusual demand.
        </span>
      </div>
    </div>
  );
}

export function DishDetailDrawer({
  open,
  dish,
  forecast,
  settings,
  forecastDate,
  onClose,
  onEdit,
  onRecord,
}: {
  open: boolean;
  dish: Dish | null;
  forecast: ForecastResult | null;
  settings: ForecastSettings;
  forecastDate: string;
  onClose: () => void;
  onEdit: () => void;
  onRecord: () => void;
}) {
  if (!dish || !forecast) return null;
  const unit = dish.servingUnit;

  return (
    <Drawer open={open} onClose={onClose} label={`${dish.name} details`}>
      <div className="detail-hero">
        <div className="detail-hero__media">
          <DishImage dish={dish} />
        </div>

        <div className="detail-hero__title">
          <h2>{dish.name}</h2>
          <span className="badge badge--plain">{dish.category}</span>
        </div>

        {forecast.recommended !== null ? (
          <div className="hero-rec">
            <span className="hero-rec__label">Recommended to prepare</span>
            <div className="hero-rec__qty">
              <b>{num(forecast.recommended)}</b>
              <span>{unitLabel(forecast.recommended, unit)}</span>
            </div>
            <span className="field__hint">for {formatLong(forecastDate)}</span>
          </div>
        ) : (
          <div className="callout callout--amber">
            <Info className="ico" />
            <span>
              Not enough sales data yet. Record at least {MIN_ELIGIBLE_DAYS} days of sales to
              receive a recommendation.
            </span>
          </div>
        )}

        <ForecastExplanation
          dish={dish}
          forecast={forecast}
          settings={settings}
          forecastDate={forecastDate}
        />

        <div className="detail-actions">
          <Button
            variant="accent"
            icon={<ClipboardList className="ico" />}
            onClick={onRecord}
          >
            Record sales
          </Button>
          <Button variant="ghost" icon={<Pencil className="ico" />} onClick={onEdit}>
            Edit dish
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
