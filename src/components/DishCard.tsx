import type { KeyboardEvent } from "react";
import type { Dish } from "../types";
import type { ForecastResult } from "../lib/forecast";
import { num } from "../lib/format";
import { DishImage } from "./DishImage";

interface DishCardProps {
  dish: Dish;
  forecast: ForecastResult;
  isArchived?: boolean;
  onOpen: () => void;
}

/**
 * Compact horizontal menu card: Food Image → Dish Name & Category → Large
 * Recommended Servings number on the right. The whole card is one clickable
 * element that opens the dish details drawer.
 */
export function DishCard({ dish, forecast, isArchived, onOpen }: DishCardProps) {
  const recommended = forecast.recommended;
  const limitedHistory = !isArchived && forecast.eligibleDays > 0 && forecast.eligibleDays < 5;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      onOpen();
    }
  }

  return (
    <div
      className={`dish-card${isArchived ? " is-archived" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`Open details for ${dish.name}`}
      onClick={onOpen}
      onKeyDown={onKeyDown}
    >
      <span className="dish-card__media">
        <DishImage dish={dish} className="dish-card__image" />
      </span>

      <span className="dish-card__info">
        <span className="dish-card__name">{dish.name}</span>
        <span className="dish-card__category">{dish.category}</span>
        {isArchived ? <span className="dish-card__note">Archived</span> : null}
        {limitedHistory ? <span className="dish-card__note">Limited history</span> : null}
      </span>

      <span className="dish-card__rec">
        <span className="dish-card__rec-label">PREPARE</span>
        <strong className="dish-card__rec-num">
          {recommended === null ? "—" : num(recommended)}
        </strong>
        <span className="dish-card__rec-unit">servings</span>
      </span>
    </div>
  );
}
