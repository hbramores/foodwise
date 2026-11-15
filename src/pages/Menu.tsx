import { useMemo, useState } from "react";
import {
  Archive,
  ChefHat,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { useData, type DishInput } from "../data/store";
import { useToast } from "../data/toast";
import { DISH_CATEGORIES, type Dish, type DishCategory } from "../types";
import { computeForecast } from "../lib/forecast";
import { todayISO } from "../lib/date";
import { DishCard } from "../components/DishCard";
import { DishDetailDrawer } from "../components/DishDetail";
import { DishForm } from "../components/DishForm";
import { ConfirmDialog } from "../components/overlays";
import { Button, Chip, EmptyState } from "../components/ui";
import { DateSelector } from "../components/DateSelector";
import type { RouteKey } from "../hooks";

type CategoryFilter = DishCategory | "All Dishes";

export function Menu({ navigate }: { navigate: (r: RouteKey) => void }) {
  const {
    data,
    activeDishes,
    archivedDishes,
    records,
    addDish,
    updateDish,
    setDishStatus,
  } = useData();
  const { push } = useToast();

  const today = todayISO();
  const [forecastDate, setForecastDate] = useState(today);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All Dishes");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Dish | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Dish | null>(null);

  const settings = data.settings;

  const byDish = useMemo(() => {
    const map = new Map<string, typeof records>();
    for (const r of records) {
      const arr = map.get(r.dishId);
      if (arr) arr.push(r);
      else map.set(r.dishId, [r]);
    }
    return map;
  }, [records]);

  const activeForecasts = useMemo(
    () =>
      activeDishes.map((dish) => ({
        dish,
        forecast: computeForecast(byDish.get(dish.id) ?? [], settings, forecastDate),
      })),
    [activeDishes, byDish, settings, forecastDate]
  );

  const pool = showArchived ? archivedDishes : activeDishes;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pool
      .filter((d) => (category === "All Dishes" ? true : d.category === category))
      .filter((d) => (q ? d.name.toLowerCase().includes(q) : true))
      .map((dish) => ({
        dish,
        forecast: computeForecast(byDish.get(dish.id) ?? [], settings, forecastDate),
      }));
  }, [pool, category, query, byDish, settings, forecastDate]);

  const selected = visible.find((v) => v.dish.id === selectedId) ?? null;

  function handleSubmit(input: DishInput) {
    if (editing) {
      updateDish(editing.id, input);
      push("Dish updated successfully.", "good");
    } else {
      addDish(input);
      push("Dish added successfully.", "good");
    }
    setEditing(null);
  }

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(dish: Dish) {
    setEditing(dish);
    setFormOpen(true);
  }

  function openRecordFor(_dish: Dish) {
    navigate("record");
  }

  const isArchivedView = showArchived;
  const isEmptyMenu = activeDishes.length === 0 && archivedDishes.length === 0;

  return (
    <>
      <section className="head">
        <div className="head__lead">
          <div>
            <h1 className="head__title">Menu</h1>
            <p className="head__sub">
              Recommended servings for your next preparation.
            </p>
          </div>
        </div>

        <div className="head__actions">
          <DateSelector
            value={forecastDate}
            onChange={setForecastDate}
            label="Prepare for"
            id="forecast-date"
          />
          <Button variant="primary" icon={<Plus className="ico" />} onClick={openAdd}>
            Add dish
          </Button>
        </div>

      </section>

      {isEmptyMenu ? (
        <div className="panel">
          <EmptyState
            icon={<ChefHat style={{ width: 34, height: 34, strokeWidth: 1.4 }} />}
            title="No dishes yet."
            description="Add your first dish to start recording sales and receiving preparation recommendations."
            action={
              <Button variant="accent" icon={<Plus className="ico" />} onClick={openAdd}>
                Add your first dish
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="toolbar">
            <label className="search" style={{ minWidth: 220, flex: "0 1 300px" }}>
              <Search className="ico" aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search dishes"
                aria-label="Search dishes"
              />
            </label>

            <select className="select" aria-label="Filter by category" value={category} onChange={e => setCategory(e.target.value as CategoryFilter)}>
              <option value="All Dishes">All categories</option>
              {DISH_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <span className="toolbar__spacer" />

            <Chip active={showArchived} onClick={() => setShowArchived((v) => !v)}>
              <Archive className="ico" style={{ width: 14, height: 14 }} />
              Archived
              {archivedDishes.length > 0 ? <b>{archivedDishes.length}</b> : null}
            </Chip>
          </div>

          {visible.length === 0 ? (
            <div className="panel">
              <EmptyState
                icon={<Search style={{ width: 30, height: 30, strokeWidth: 1.4 }} />}
                title={isArchivedView ? "No archived dishes." : "No dishes match your search."}
                description={
                  isArchivedView
                    ? "Archived dishes will appear here and can be restored to your menu."
                    : "Try a different search term or category, or add a new dish."
                }
                action={
                  !isArchivedView ? (
                    <Button variant="ghost" icon={<Plus className="ico" />} onClick={openAdd}>
                      Add dish
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="dishgrid">
              {visible.map(({ dish, forecast }) => (
                <DishCard
                  key={dish.id}
                  dish={dish}
                  forecast={forecast}
                  isArchived={dish.status === "archived"}
                  onOpen={() => setSelectedId(dish.id)}
                  onEdit={() => openEdit(dish)}
                  onToggleStatus={() => {
                    if (dish.status === "active") setArchiveTarget(dish);
                    else {
                      setDishStatus(dish.id, "active");
                      push("Dish restored to your menu.", "good");
                    }
                  }}
                  onRecord={() => openRecordFor(dish)}
                />
              ))}
            </div>
          )}

          {!isArchivedView && activeForecasts.some(f => f.forecast.recommended === null) ? (
            <div className="callout callout--amber" style={{ marginTop: 20 }}>
              <Sparkles className="ico" />
              <span>
                Some dishes need at least 3 recorded days before FoodWise can recommend a quantity.
                Record their daily sales to unlock recommendations.
              </span>
            </div>
          ) : null}
        </>
      )}

      <DishDetailDrawer
        open={selected !== null}
        dish={selected?.dish ?? null}
        forecast={selected?.forecast ?? null}
        settings={settings}
        forecastDate={forecastDate}
        onClose={() => setSelectedId(null)}
        onEdit={() => {
          if (selected) {
            setSelectedId(null);
            openEdit(selected.dish);
          }
        }}
        onRecord={() => {
          if (selected) {
            setSelectedId(null);
            openRecordFor(selected.dish);
          }
        }}
      />

      <DishForm
        open={formOpen}
        dish={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Archive this dish?"
        description="It will no longer appear in your active menu, but its historical records will be preserved."
        confirmLabel="Archive dish"
        tone="danger"
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (archiveTarget) {
            setDishStatus(archiveTarget.id, "archived");
            push("Dish archived. You can restore it any time.", "good");
          }
        }}
      />
    </>
  );
}
