import {
  Archive,
  ArchiveRestore,
  Pencil,
  TrendingUp,
  MoreVertical,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import type { Dish } from "../types";
import type { ForecastResult } from "../lib/forecast";
import { num, peso, unitLabel } from "../lib/format";
import { DishImage } from "./DishImage";
import { Button, IconButton } from "./ui";
import { PopoverMenu } from "./overlays";

interface DishCardProps {
  dish: Dish;
  forecast: ForecastResult;
  isArchived?: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onRecord: () => void;
}

export function DishCard({
  dish,
  forecast,
  isArchived,
  onOpen,
  onEdit,
  onToggleStatus,
  onRecord,
}: DishCardProps) {
  const hasRec = forecast.recommended !== null;

  return (
    <article
      className={`dish fade-in${hasRec ? "" : " is-insufficient"}`}
      onClick={onOpen}
      aria-label={`${dish.name} — open details`}
    >
      <div className="dish__media">
        <DishImage dish={dish} className="dish__img" />
        <span className="dish__cat">{dish.category}</span>
        <span className="dish__menu">
          <PopoverMenu
            label={`Actions for ${dish.name}`}
            trigger={
              <IconButton label={`Actions for ${dish.name}`} ghost size="sm">
                <MoreVertical className="ico" />
              </IconButton>
            }
          >
            {(close) => (
              <>
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => {
                    close();
                    onEdit();
                  }}
                >
                  <Pencil className="ico" />
                  Edit dish
                </button>
                {!isArchived ? (
                  <button
                    type="button"
                    className="menu__item"
                    role="menuitem"
                    onClick={() => {
                      close();
                      onRecord();
                    }}
                  >
                    <ClipboardList className="ico" />
                    Record sales
                  </button>
                ) : null}
                <div className="menu__sep" />
                <button
                  type="button"
                  className={isArchived ? "menu__item" : "menu__item menu__item--danger"}
                  role="menuitem"
                  onClick={() => {
                    close();
                    onToggleStatus();
                  }}
                >
                  {isArchived ? <ArchiveRestore className="ico" /> : <Archive className="ico" />}
                  {isArchived ? "Restore to menu" : "Archive dish"}
                </button>
              </>
            )}
          </PopoverMenu>
        </span>
      </div>

      <div className="dish__body">
        <h3 className="dish__name">{dish.name}</h3>
        {hasRec ? (
          <p className="dish__avg">
            <TrendingUp className="ico" style={{ width: 14, height: 14 }} aria-hidden="true" />
            Average sales: <b>{num(Math.round(forecast.averageSales * 10) / 10)}</b>{" "}
            {unitLabel(forecast.averageSales, dish.servingUnit)}/day
          </p>
        ) : (
          <p className="dish__avg">
            <Sparkles className="ico" style={{ width: 14, height: 14 }} aria-hidden="true" />
            Based on {forecast.eligibleDays} recorded{" "}
            {forecast.eligibleDays === 1 ? "day" : "days"}
          </p>
        )}
      </div>

      {hasRec ? (
        <div className="dish__rec">
          <span className="dish__rec-label">Recommended to prepare</span>
          <div className="rec-qty">
            <b>{num(forecast.recommended as number)}</b>
            <span>{unitLabel(forecast.recommended as number, dish.servingUnit)}</span>
          </div>
          <span className="dish__rec-note">
            Safety allowance included · {forecast.eligibleDays} day
            {forecast.eligibleDays === 1 ? "" : "s"} of sales
          </span>
        </div>
      ) : (
        <div className="dish__rec">
          <div className="dish__insufficient">
            <b>Not enough sales data yet.</b>
            <span>Start recording daily sales to receive preparation recommendations.</span>
          </div>
        </div>
      )}

      <div className="dish__foot">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          View details
        </button>
        {!hasRec && !isArchived ? (
          <Button
            variant="accent"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRecord();
            }}
          >
            Record sales
          </Button>
        ) : (
          <span style={{ fontSize: 12.5, color: "var(--color-muted)" }}>
            {isArchived
              ? "Archived"
              : dish.costPerServing
                ? `Cost ${peso(dish.costPerServing)} / ${dish.servingUnit}`
                : "No cost set"}
          </span>
        )}
      </div>
    </article>
  );
}
