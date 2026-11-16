import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Boxes,
  History,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, IconButton, Segmented, StatusPill } from "../components/ui";
import { DetailPanel, DetailRows, DetailSection } from "../components/DetailPanel";
import { useStore } from "../data/store";
import { useToast } from "../data/toast";
import { INGREDIENT_CATEGORIES, UNITS, type Ingredient, type IngredientCategory, type Unit } from "../types";
import { stockLevel, stockState } from "../lib/calc";
import { formatCompact } from "../lib/date";
import { parseNumberInput } from "../lib/format";
import { qtyLabel } from "../lib/units";

const MOVEMENT_LABEL: Record<string, string> = {
  prep: "Preparation",
  restock: "Restock",
  adjust: "Correction",
  loss: "Ingredient loss",
  seed: "Opening stock",
};

export function Inventory() {
  const { data, saveIngredient, setIngredientStatus, moveStock } = useStore();
  const { push } = useToast();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<IngredientCategory | "all">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "stock">("view");
  const [draft, setDraft] = useState<Ingredient | null>(null);

  const stock = useMemo(() => stockState(data), [data]);

  const rows = useMemo(() => {
    const pool = data.ingredients
      .filter((i) => (showArchived ? i.status === "archived" : i.status === "active"))
      .filter((i) => category === "all" || i.category === category)
      .filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()));
    const order: Record<string, number> = { out: 0, low: 1, normal: 2 };
    return [...pool].sort((a, b) => {
      const diff = order[stockLevel(a)] - order[stockLevel(b)];
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });
  }, [data.ingredients, category, query, showArchived]);

  const current = selected ? data.ingredients.find((i) => i.id === selected) ?? null : null;
  const movements = current
    ? data.movements.filter((m) => m.ingredientId === current.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    : [];
  const usedIn = current ? data.recipes.filter((r) => r.ingredientId === current.id).length : 0;

  function openIngredient(id: string, next: "view" | "edit" | "stock" = "view") {
    const ingredient = data.ingredients.find((i) => i.id === id) ?? null;
    setSelected(id);
    setDraft(ingredient);
    setMode(next);
  }

  function startNew() {
    setSelected(null);
    setDraft({
      id: "",
      name: "",
      category: "Dry Goods",
      unit: "kg",
      stock: 0,
      lowThreshold: 1,
      status: "active",
      createdAt: "",
      updatedAt: "",
    });
    setMode("edit");
  }

  function saveDraft() {
    if (!draft) return;
    if (!draft.name.trim()) {
      push("Give the ingredient a name.", "danger");
      return;
    }
    saveIngredient(
      {
        name: draft.name,
        category: draft.category,
        unit: draft.unit,
        lowThreshold: Math.max(0, draft.lowThreshold),
      },
      draft.id || undefined
    );
    push(draft.id ? "Ingredient updated." : "Ingredient added.", "good");
    setMode("view");
    if (!draft.id) setSelected(null);
  }

  function applyStock(kind: "restock" | "adjust" | "loss", qty: number, note: string) {
    if (!current) return;
    const delta = kind === "adjust" ? qty : kind === "restock" ? Math.abs(qty) : -Math.abs(qty);
    moveStock(current.id, kind, delta, note || MOVEMENT_LABEL[kind]);
    push(`${MOVEMENT_LABEL[kind]} recorded for ${current.name}.`, "good");
    setMode("view");
  }

  return (
    <div className="stack">
      <header className="head">
        <div className="head__lead">
          <h1 className="head__title">Inventory</h1>
          <p className="head__sub">Raw ingredients consumed by confirmed food preparation.</p>
        </div>
        <div className="head__actions">
          <Button variant="accent" icon={<Plus className="ico" />} onClick={startNew}>
            Add Ingredient
          </Button>
          <Button
            variant="soft"
            icon={<PackagePlus className="ico" />}
            disabled={!rows.length}
            onClick={() => {
              const first = rows.find((r) => stockLevel(r) !== "normal") ?? rows[0];
              if (first) openIngredient(first.id, "stock");
            }}
          >
            Add Stock
          </Button>
        </div>
      </header>

      <section className="kpis" aria-label="Inventory summary">
        <article className="kpi kpi--green">
          <span className="kpi__icon"><Boxes className="ico" /></span>
          <span className="kpi__label">Total Ingredients</span>
          <b className="kpi__value">{stock.active.length}</b>
        </article>
        <article className="kpi kpi--gold">
          <span className="kpi__icon"><TriangleAlert className="ico" /></span>
          <span className="kpi__label">Low Stock</span>
          <b className="kpi__value">{stock.low.length}</b>
        </article>
        <article className="kpi kpi--danger">
          <span className="kpi__icon"><TriangleAlert className="ico" /></span>
          <span className="kpi__label">Out of Stock</span>
          <b className="kpi__value">{stock.out.length}</b>
        </article>
      </section>

      <Card
        title={showArchived ? "Archived ingredients" : "Ingredients"}
        icon={<Boxes className="ico" />}
        tools={
          <Segmented
            value={showArchived ? "archived" : "active"}
            options={[
              { value: "active", label: "Active" },
              { value: "archived", label: "Archived" },
            ]}
            onChange={(v) => setShowArchived(v === "archived")}
            ariaLabel="Ingredient status"
          />
        }
      >
        <div className="toolbar">
          <label className="search">
            <Search className="ico" />
            <input placeholder="Search ingredients" aria-label="Search ingredients" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <div className="pillrow" role="group" aria-label="Filter by category">
            <button type="button" className={`filter-pill${category === "all" ? " is-on" : ""}`} aria-pressed={category === "all"} onClick={() => setCategory("all")}>All</button>
            {INGREDIENT_CATEGORIES.map((c) => (
              <button key={c} type="button" className={`filter-pill${category === c ? " is-on" : ""}`} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>
        </div>

        {rows.length ? (
          <div className="tablewrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Ingredient</th>
                  <th scope="col">Category</th>
                  <th scope="col">Available</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((ingredient) => {
                  const level = stockLevel(ingredient);
                  return (
                    <tr
                      key={ingredient.id}
                      className={`table__row row--${level}`}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open ${ingredient.name}`}
                      onClick={() => openIngredient(ingredient.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openIngredient(ingredient.id);
                        }
                      }}
                    >
                      <th scope="row">{ingredient.name}</th>
                      <td>{ingredient.category}</td>
                      <td>
                        <b className={`stockqty stockqty--${level}`}>
                          {level !== "normal" ? <TriangleAlert className="ico" /> : null}
                          {qtyLabel(ingredient.stock)} {ingredient.unit}
                        </b>
                      </td>
                      <td>
                        {level === "out" ? (
                          <StatusPill tone="danger">Out of stock</StatusPill>
                        ) : level === "low" ? (
                          <StatusPill tone="amber">Low stock</StatusPill>
                        ) : (
                          <StatusPill tone="good">In stock</StatusPill>
                        )}
                      </td>
                      <td>
                        <span className="rowactions" onClick={(e) => e.stopPropagation()}>
                          <IconButton label={`Edit ${ingredient.name}`} ghost size="sm" onClick={() => openIngredient(ingredient.id, "edit")}>
                            <Pencil className="ico" />
                          </IconButton>
                          <IconButton
                            label={ingredient.status === "active" ? `Archive ${ingredient.name}` : `Restore ${ingredient.name}`}
                            ghost
                            size="sm"
                            onClick={() => {
                              setIngredientStatus(ingredient.id, ingredient.status === "active" ? "archived" : "active");
                              push(ingredient.status === "active" ? "Ingredient archived." : "Ingredient restored.", "good");
                            }}
                          >
                            {ingredient.status === "active" ? <Archive className="ico" /> : <ArchiveRestore className="ico" />}
                          </IconButton>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<Boxes className="ico" />} title="No ingredients" description="Add an ingredient to start tracking stock." />
        )}
      </Card>

      {/* Ingredient details / editor / stock */}
      <DetailPanel
        open={mode === "view" && Boolean(current)}
        onClose={() => setSelected(null)}
        eyebrow="Ingredient"
        title={current?.name ?? ""}
        subtitle={current ? `${current.category} · ${qtyLabel(current.stock)} ${current.unit} available` : ""}
        footer={
          <div className="dpanel__actions">
            <Button variant="ghost" icon={<Pencil className="ico" />} onClick={() => setMode("edit")}>Edit</Button>
            <Button variant="soft" icon={<SlidersHorizontal className="ico" />} onClick={() => setMode("stock")}>Stock adjustment</Button>
          </div>
        }
      >
        {current ? (
          <>
            <DetailRows
              rows={[
                { label: "Category", value: current.category },
                { label: "Unit", value: current.unit },
                { label: "Available", value: `${qtyLabel(current.stock)} ${current.unit}` },
                { label: "Low-stock threshold", value: `${qtyLabel(current.lowThreshold)} ${current.unit}` },
                { label: "Status", value: <StatusPill tone={stockLevel(current) === "out" ? "danger" : stockLevel(current) === "low" ? "amber" : "good"}>{stockLevel(current) === "normal" ? "In stock" : stockLevel(current) === "low" ? "Low stock" : "Out of stock"}</StatusPill> },
                { label: "Used in", value: usedIn ? <Badge tone="sage">{usedIn} recipe line(s)</Badge> : "Not used yet" },
              ]}
            />

            <DetailSection title="Stock movements">
              {movements.length ? (
                <ul className="movelist">
                  {movements.slice(0, 12).map((m) => (
                    <li key={m.id}>
                      <span className={`movelist__dot movelist__dot--${m.qty < 0 ? "out" : "in"}`} />
                      <span className="movelist__body">
                        <b>{MOVEMENT_LABEL[m.kind] ?? m.kind}</b>
                        <small>{m.note} · {formatCompact(m.date)}</small>
                      </span>
                      <span className="movelist__qty">
                        {m.qty > 0 ? "+" : ""}{qtyLabel(m.qty)} {current.unit}
                        <small>→ {qtyLabel(m.balanceAfter)}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="note">No movements recorded yet.</p>
              )}
            </DetailSection>

            {usedIn ? (
              <p className="note">
                <TriangleAlert className="ico" /> This ingredient is referenced by recipes, so it can be archived but never deleted.
              </p>
            ) : null}
          </>
        ) : null}
      </DetailPanel>

      <EditIngredientPanel
        open={mode === "edit"}
        draft={draft}
        onChange={setDraft}
        onClose={() => (draft?.id ? setMode("view") : setSelected(null))}
        onSave={saveDraft}
      />

      <StockPanel
        open={mode === "stock" && Boolean(current)}
        ingredient={current}
        onClose={() => setMode("view")}
        onApply={applyStock}
      />
    </div>
  );
}

function EditIngredientPanel({
  open,
  draft,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean;
  draft: Ingredient | null;
  onChange: (next: Ingredient) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!draft) return null;
  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      eyebrow={draft.id ? "Edit" : "New"}
      title={draft.id ? draft.name : "Add Ingredient"}
      footer={
        <div className="dpanel__actions">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave}>Save Changes</Button>
        </div>
      }
    >
      <Field label="Ingredient name" htmlFor="ing-name">
        <input id="ing-name" className="input" value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} />
      </Field>
      <Field label="Category" htmlFor="ing-cat">
        <select id="ing-cat" className="input" value={draft.category} onChange={(e) => onChange({ ...draft, category: e.target.value as IngredientCategory })}>
          {INGREDIENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Measurement unit" htmlFor="ing-unit">
        <select id="ing-unit" className="input" value={draft.unit} onChange={(e) => onChange({ ...draft, unit: e.target.value as Unit })}>
          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </Field>
      <Field label="Low-stock threshold" htmlFor="ing-low" hint="Never shown on the Dashboard.">
        <input
          id="ing-low"
          className="input"
          inputMode="decimal"
          value={String(draft.lowThreshold)}
          onChange={(e) => onChange({ ...draft, lowThreshold: parseNumberInput(e.target.value) ?? 0 })}
        />
      </Field>
      <p className="note">Quantities are changed through stock adjustments so every movement stays auditable.</p>
    </DetailPanel>
  );
}

function StockPanel({
  open,
  ingredient,
  onClose,
  onApply,
}: {
  open: boolean;
  ingredient: Ingredient | null;
  onClose: () => void;
  onApply: (kind: "restock" | "adjust" | "loss", qty: number, note: string) => void;
}) {
  const [kind, setKind] = useState<"restock" | "adjust" | "loss">("restock");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");

  if (!ingredient) return null;
  const value = parseNumberInput(qty) ?? 0;
  const preview = kind === "adjust" ? value : kind === "restock" ? Math.abs(value) : -Math.abs(value);

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      eyebrow="Inventory"
      title="Stock Adjustment"
      subtitle={`${ingredient.name} · ${qtyLabel(ingredient.stock)} ${ingredient.unit} on hand`}
      footer={
        <div className="dpanel__actions">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              onApply(kind, value, note);
              setQty("");
              setNote("");
            }}
            disabled={value === 0}
          >
            Apply Movement
          </Button>
        </div>
      }
    >
      <Field label="Movement type" htmlFor="mv-kind">
        <select id="mv-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="restock">Add stock (delivery)</option>
          <option value="adjust">Correct stock (signed)</option>
          <option value="loss">Record ingredient loss</option>
        </select>
      </Field>
      <Field label={`Quantity (${ingredient.unit})`} htmlFor="mv-qty">
        <input id="mv-qty" className="input" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
      </Field>
      <Field label="Note" htmlFor="mv-note">
        <input id="mv-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional reference" />
      </Field>
      <p className="note">
        <History className="ico" /> Resulting balance: <b>{qtyLabel(Math.max(0, ingredient.stock + preview))} {ingredient.unit}</b>
      </p>
    </DetailPanel>
  );
}
