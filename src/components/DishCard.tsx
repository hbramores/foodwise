import { Archive, ArchiveRestore, Pencil, MoreVertical, Eye } from "lucide-react";
import type { Dish } from "../types";
import type { ForecastResult } from "../lib/forecast";
import { num, unitLabel } from "../lib/format";
import { DishImage } from "./DishImage";
import { IconButton } from "./ui";
import { PopoverMenu } from "./overlays";
interface DishCardProps {
  dish: Dish; forecast: ForecastResult; isArchived?: boolean;
  onOpen: () => void; onEdit: () => void; onToggleStatus: () => void; onRecord: () => void;
}
export function DishCard({dish, forecast, isArchived, onOpen, onEdit, onToggleStatus, onRecord}: DishCardProps) {
  return <article className="compact-dish">
    <button className="compact-dish__main" onClick={onOpen} aria-label={`${dish.name} — open details`}>
      <DishImage dish={dish} className="compact-dish__image" />
      <span className="compact-dish__info">
        <span className="compact-dish__name">{dish.name}</span>
        <span className="compact-dish__category">{dish.category}</span>
        <span className="compact-dish__average">{forecast.recommended !== null ? `Avg. sold: ${num(Math.round(forecast.averageSales * 10) / 10)}/day` : `${forecast.eligibleDays} of 3 days recorded`}</span>
      </span>
      {forecast.recommended !== null ? <span className="compact-dish__quantity"><span>Prepare</span><b>{forecast.recommended}</b><small>{unitLabel(forecast.recommended, dish.servingUnit)}</small></span> : null}
    </button>
    {forecast.recommended === null ? <div className="compact-dish__empty"><span>Not enough data</span><button className="link" onClick={onRecord}>Record Sales</button></div> : null}
    <div className="compact-dish__actions"><PopoverMenu label={`Actions for ${dish.name}`} trigger={<IconButton label={`Actions for ${dish.name}`} ghost size="sm"><MoreVertical className="ico" /></IconButton>}>
      {close => <>
        <button className="menu__item" role="menuitem" onClick={() => {close(); onOpen();}}><Eye className="ico" />View Details</button>
        <button className="menu__item" role="menuitem" onClick={() => {close(); onEdit();}}><Pencil className="ico" />Edit Dish</button>
        <div className="menu__sep" />
        <button className={`menu__item${isArchived ? "" : " menu__item--danger"}`} role="menuitem" onClick={() => {close(); onToggleStatus();}}>{isArchived ? <ArchiveRestore className="ico" /> : <Archive className="ico" />}{isArchived ? "Restore Dish" : "Archive Dish"}</button>
      </>}
    </PopoverMenu></div>
  </article>;
}
