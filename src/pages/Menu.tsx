import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, ChefHat, Plus, Search } from "lucide-react";
import { useData, type DishInput } from "../data/store";
import { useToast } from "../data/toast";
import { DISH_CATEGORIES, type Dish } from "../types";
import { computeForecast, recentRecordedDates } from "../lib/forecast";
import { DishCard } from "../components/DishCard";
import { CalculationModal } from "../components/DishDetail";
import { DishForm } from "../components/DishForm";
import { ConfirmDialog } from "../components/overlays";
import { Button, Chip, EmptyState } from "../components/ui";

/** Horizontally scrollable category pills with a soft "more to scroll" fade. */
function CategoryPills({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(false);
  const options = ["all", ...DISH_CATEGORIES];
  function onScroll() {
    const el = ref.current;
    if (!el) return;
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }
  useEffect(() => {
    onScroll();
  }, []);
  return (
    <div
      ref={ref}
      className={`pillrow${atEnd ? " is-at-end" : ""}`}
      onScroll={onScroll}
      role="group"
      aria-label="Filter by category"
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`filter-pill${value === option ? " is-on" : ""}`}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {option === "all" ? "All" : option}
        </button>
      ))}
    </div>
  );
}

export function Menu() {
  const {activeDishes,archivedDishes,records,addDish,updateDish,setDishStatus} = useData();
  const {push} = useToast();
  const [query,setQuery] = useState("");
  const [category,setCategory] = useState("all");
  const [archived,setArchived] = useState(false);
  const [selected,setSelected] = useState<string|null>(null);
  const [formOpen,setFormOpen] = useState(false);
  const [editing,setEditing] = useState<Dish|null>(null);
  const [archiveTarget,setArchiveTarget] = useState<Dish|null>(null);
  const dates = useMemo(() => recentRecordedDates(records),[records]);
  const pool = archived ? archivedDishes : activeDishes;
  const visible = pool.filter(d => (category === "all" || d.category === category) && d.name.toLowerCase().includes(query.trim().toLowerCase()));
  const selectedDish = [...activeDishes,...archivedDishes].find(d => d.id === selected) ?? null;
  function openEdit(dish:Dish) {setEditing(dish);setFormOpen(true);}
  function openAdd() {setEditing(null);setFormOpen(true);}
  function save(input:DishInput) {if (editing) updateDish(editing.id,input);else addDish(input);push(editing ? "Dish updated successfully." : "Dish added successfully.","good");}
  return <>
    <section className="head"><div className="head__lead"><h1 className="head__title">Menu</h1><p className="head__sub">Your dishes and recommended servings.</p></div><div className="head__actions"><Button icon={<Plus className="ico" />} onClick={openAdd}>Add Dish</Button></div></section>
    <div className="menu-toolbar">
      <div className="menu-toolbar__top">
        <label className="search menu-search"><Search className="ico" /><input placeholder="Search dishes" aria-label="Search dishes" value={query} onChange={e => setQuery(e.target.value)} /></label>
        <Chip active={archived} onClick={() => setArchived(v => !v)}><Archive className="ico" />Archived{archivedDishes.length ? ` (${archivedDishes.length})` : ""}</Chip>
      </div>
      <CategoryPills value={category} onChange={setCategory} />
    </div>
    {visible.length ? <div className="dishgrid menu-grid-v2">{visible.map(dish => <DishCard key={dish.id} dish={dish} forecast={computeForecast(records,dish.id,dates)} isArchived={archived} onOpen={() => setSelected(dish.id)} />)}</div> : <div className="panel"><EmptyState icon={<ChefHat className="ico" />} title={archived ? "No archived dishes." : activeDishes.length ? "No dishes match your search." : "No dishes yet."} description={activeDishes.length ? "Try another search or category." : "Add your first dish to get started."} action={!archived ? <Button onClick={openAdd}>Add Dish</Button> : undefined} /></div>}
    <CalculationModal dish={selectedDish} forecast={selectedDish ? computeForecast(records,selectedDish.id,dates) : null} isArchived={selectedDish?.status === "archived"} onClose={() => setSelected(null)} onEdit={selectedDish ? () => {const target=selectedDish;setSelected(null);openEdit(target);} : undefined} onToggleStatus={selectedDish ? () => {const target=selectedDish;setSelected(null);if (target.status === "active") setArchiveTarget(target);else {setDishStatus(target.id,"active");push("Dish restored to menu.","good");}} : undefined} />
    <DishForm open={formOpen} dish={editing} onClose={() => {setFormOpen(false);setEditing(null);}} onSubmit={save} />
    <ConfirmDialog open={archiveTarget !== null} title="Archive this dish?" description="The dish will leave your active menu. Its sales history will be kept, and you can restore it later." confirmLabel="Archive Dish" tone="danger" onClose={() => setArchiveTarget(null)} onConfirm={() => {if (archiveTarget) {setDishStatus(archiveTarget.id,"archived");push("Dish archived.","good");}}} />
  </>;
}
