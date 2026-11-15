import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import type { Dish } from "../types";
import type { ForecastResult } from "../lib/forecast";
import { num } from "../lib/format";
import { formatShort } from "../lib/date";
import { Drawer } from "./overlays";
import { Button } from "./ui";
import { DishImage } from "./DishImage";

/**
 * Dish details drawer. Opened by clicking anywhere on a Menu card (and from
 * the History average). Shows the recommended preparation quantity, the
 * five-day sales, how the average is calculated, and the full ingredient
 * list, with optional edit / archive actions.
 */
export function CalculationModal({
  dish,
  forecast,
  onClose,
  onEdit,
  onToggleStatus,
  isArchived,
}: {
  dish: Dish | null;
  forecast: ForecastResult | null;
  onClose: () => void;
  onEdit?: () => void;
  onToggleStatus?: () => void;
  isArchived?: boolean;
}) {
  const open = dish !== null && forecast !== null;
  return (
    <Drawer open={open} onClose={onClose} label={dish ? `${dish.name} details` : "Dish details"}>
      {dish && forecast ? (
        <div className="dish-detail">
          <header className="dish-detail__head">
            <DishImage dish={dish} className="dish-detail__image" />
            <div className="dish-detail__title">
              <h2>{dish.name}</h2>
              <p>
                {dish.category}
                {isArchived ? " · Archived" : ""}
              </p>
            </div>
          </header>

          <div className="dish-detail__rec">
            <span className="dish-detail__rec-label">Recommended to prepare</span>
            <strong className="dish-detail__rec-num">
              {forecast.recommended === null ? "—" : num(forecast.recommended)}
              <small> servings</small>
            </strong>
          </div>

          <section className="dish-detail__section">
            <h3 className="drawer-section">Five-day sales</h3>
            {forecast.eligibleDays ? (
              <>
                <div className="recent-sales-list">
                  {forecast.dates.map((date, i) => (
                    <span key={date}>
                      <small>{formatShort(date)}</small>
                      <b>{forecast.values[i] === null ? "—" : num(forecast.values[i] as number)}</b>
                    </span>
                  ))}
                </div>
                <div className="calc">
                  <div className="calc__row">
                    <span>Average of recorded days</span>
                    <b>
                      {num(forecast.totalSold)} ÷ {forecast.eligibleDays} ={" "}
                      {num(Number((forecast.averageSales ?? 0).toFixed(2)))}
                    </b>
                  </div>
                  <div className="calc__row is-total">
                    <span>Recommended preparation</span>
                    <b>{forecast.recommended === null ? "—" : num(forecast.recommended)}</b>
                  </div>
                </div>
                <p className="dish-detail__hint">
                  Rounded to the nearest whole serving. Only recorded numbers are included; a dash is
                  not counted as zero.
                </p>
                {forecast.eligibleDays < 5 ? (
                  <p className="limited-history">Based on limited sales history.</p>
                ) : null}
              </>
            ) : (
              <p className="dish-detail__hint">No sales recorded in the five most recent dates yet.</p>
            )}
          </section>

          <section className="dish-detail__section">
            <h3 className="drawer-section">Ingredients</h3>
            {dish.ingredients.length ? (
              <ul className="dish-detail__ingredients">
                {dish.ingredients.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="dish-detail__hint">No ingredients added yet.</p>
            )}
          </section>

          {onEdit || onToggleStatus ? (
            <div className="dish-detail__actions">
              {onEdit ? (
                <Button variant="ghost" icon={<Pencil className="ico" />} onClick={onEdit}>
                  Edit dish &amp; ingredients
                </Button>
              ) : null}
              {onToggleStatus ? (
                <Button
                  variant={isArchived ? "ghost" : "danger"}
                  icon={isArchived ? <ArchiveRestore className="ico" /> : <Archive className="ico" />}
                  onClick={onToggleStatus}
                >
                  {isArchived ? "Restore dish" : "Archive dish"}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
}
