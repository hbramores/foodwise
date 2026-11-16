import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Boxes,
  History,
  PackagePlus,
  Plus,
  Search,
  TriangleAlert,
} from "lucide-react";
import { Button, Card, EmptyState, Field, IconButton, Segmented, StatusPill } from "../components/ui";
import { DetailPanel, DetailSection, InfoTile } from "../components/DetailPanel";
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

const MOVEMENT_KINDS: Array<{ value: "restock" | "adjust" | "loss"; label: string }> = [
  { value: "restock", label: "Add stock (delivery)" },
  { value: "adjust", label: "Correct stock (signed)" },
  { value: "loss", label: "Record ingredient loss" },
];

interface Draft {
  id: string;
  name: string;
  category: IngredientCategory;
  unit: Unit;
  lowThreshold: number;
}

function draftFrom(ingredient: Ingredient | null): Draft {
  return {
    id: ingredient?.id ?? "",
    name: ingredient?.name ?? "",
    category: ingredient?.category ?? "Dry Goods",
    unit: ingredient?.unit ?? "kg",
    lowThreshold: ingredient?.lowThreshold ?? 1,
  };
}

export function Inventory() {
  const { data, saveIngredient, setIngredientStatus, moveStock } = useStore();
  const { push } = useToast();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<IngredientCategory | "all">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [adding, setAdding] = useState(false);

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

  const current = openId ? data.ingredients.find((i) => i.id === openId) ?? null : null;
  const movements = current
    ? data.movements
        .filter((m) => m.ingredientId === current.id)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    : [];
  const usedIn = current ? data.recipes.filter((r) => r.ingredientId === current.id).length : 0;

  // Keep the edit form in step with the record (stock changes etc.).
  useEffect(() => {
    if (current) setDraft(draftFrom(current));
  }, [current?.id, current?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  function openIngredient(id: string) {
    setAdding(false);
    setOpenId(id);
  }

  function startNew() {
    setOpenId(null);
    setAdding(true);
    setDraft(draftFrom(null));
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
    if (!draft.id) {
      setAdding(false);
      setDraft(null);
    }
  }

  function applyMovement(kind: "restock" | "adjust" | "loss", qty: number, note: string) {
    if (!current) return;
    const delta = kind === "adjust" ? qty : kind === "restock" ? Math.abs(qty) : -Math.abs(qty);
    moveStock(current.id, kind, delta, note || MOVEMENT_LABEL[kind]);
    push(`${MOVEMENT_LABEL[kind]} recorded for ${current.name}.`, "good");
  }

  const firstCritical = rows.find((r) => stockLevel(r) !== "normal") ?? rows[0];

  return (
    <div className="stack">
      <header className="head head--intro">
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
            disabled={!firstCritical}
            onClick={() => firstCritical && openIngredient(firstCritical.id)}
          >
            Add Stock
          </Button>
        </div>
      </header>

      <section className="kpis kpis--inv" aria-label="Inventory summary">
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
        <div className="toolbar toolbar--row">
          <label className="search">
            <Search className="ico" />
            <input
              placeholder="Search ingredients"
              aria-label="Search ingredients"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            className="input catselect"
            aria-label="Filter by category"
            value={category}
            onChange={(e) => setCategory(e.target.value as IngredientCategory | "all")}
          >
            <option value="all">All categories</option>
            {INGREDIENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {rows.length ? (
          <div className="tablewrap">
            <table className="table invtable">
              <thead>
                <tr>
                  <th scope="col">Ingredient</th>
                  <th scope="col" className="col-cat">Category</th>
                  <th scope="col">
                    <span className="lg">Available</span>
                    <span className="sm">In Stock</span>
                  </th>
                  <th scope="col" className="col-status">Status</th>
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
                      aria-label={`Open ${ingredient.name} details`}
                      onClick={() => openIngredient(ingredient.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openIngredient(ingredient.id);
                        }
                      }}
                    >
                      <th scope="row">{ingredient.name}</th>
                      <td className="col-cat">{ingredient.category}</td>
                      <td>
                        <b className={`stockqty stockqty--${level}`}>
                          {level !== "normal" ? <TriangleAlert className="ico" /> : null}
                          {qtyLabel(ingredient.stock)} {ingredient.unit}
                        </b>
                      </td>
                      <td className="col-status">
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

      {/* Editable ingredient details — opened by clicking a row */}
      <DetailPanel
        open={Boolean(current) && !adding}
        onClose={() => setOpenId(null)}
        eyebrow="Ingredient"
        title={current?.name ?? ""}
        subtitle={current ? `${current.category} · ${qtyLabel(current.stock)} ${current.unit} on hand` : ""}
        footer={
          <div className="dpanel__actions">
            <Button
              variant={current?.status === "archived" ? "soft" : "ghost"}
              icon={current?.status === "archived" ? <ArchiveRestore className="ico" /> : <Archive className="ico" />}
              onClick={() => {
                if (!current) return;
                setIngredientStatus(current.id, current.status === "active" ? "archived" : "active");
                push(current.status === "active" ? "Ingredient archived." : "Ingredient restored.", "good");
              }}
            >
              {current?.status === "archived" ? "Restore" : "Archive"}
            </Button>
            <Button onClick={saveDraft}>Save Changes</Button>
          </div>
        }
      >
        {current && draft ? (
          <>
            <div className="infogrid">
              <InfoTile label="Available" value={`${qtyLabel(current.stock)} ${current.unit}`} />
              <InfoTile label="Low threshold" value={`${qtyLabel(current.lowThreshold)} ${current.unit}`} />
              <InfoTile label="Unit" value={current.unit} />
              <InfoTile label="Used in" value={usedIn ? `${usedIn} recipe(s)` : "—"} />
            </div>

            <StockAdjuster ingredient={current} onApply={applyMovement} />

            <DetailSection title="Details">
              <Field label="Ingredient name" htmlFor="ing-name">
                <input
                  id="ing-name"
                  className="input"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
              <div className="fieldrow">
                <Field label="Category" htmlFor="ing-cat">
                  <select
                    id="ing-cat"
                    className="input"
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value as IngredientCategory })}
                  >
                    {INGREDIENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Unit" htmlFor="ing-unit">
                  <select
                    id="ing-unit"
                    className="input"
                    value={draft.unit}
                    onChange={(e) => setDraft({ ...draft, unit: e.target.value as Unit })}
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Low-stock threshold" htmlFor="ing-low" hint="Never shown on the Dashboard.">
                <input
                  id="ing-low"
                  className="input"
                  inputMode="decimal"
                  value={String(draft.lowThreshold)}
                  onChange={(e) => setDraft({ ...draft, lowThreshold: parseNumberInput(e.target.value) ?? 0 })}
                />
              </Field>
            </DetailSection>

            <DetailSection title="Stock movements">
              {movements.length ? (
                <ul className="movelist">
                  {movements.slice(0, 10).map((m) => (
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

      {/* New ingredient */}
      <DetailPanel
        open={adding}
        onClose={() => {
          setAdding(false);
          setDraft(null);
        }}
        eyebrow="New"
        title="Add Ingredient"
        footer={
          <div className="dpanel__actions">
            <Button
              variant="ghost"
              onClick={() => {
                setAdding(false);
                setDraft(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={saveDraft}>Save Ingredient</Button>
          </div>
        }
      >
        {adding && draft ? (
          <>
            <Field label="Ingredient name" htmlFor="new-ing-name">
              <input
                id="new-ing-name"
                className="input"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <div className="fieldrow">
              <Field label="Category" htmlFor="new-ing-cat">
                <select
                  id="new-ing-cat"
                  className="input"
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value as IngredientCategory })}
                >
                  {INGREDIENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Unit" htmlFor="new-ing-unit">
                <select
                  id="new-ing-unit"
                  className="input"
                  value={draft.unit}
                  onChange={(e) => setDraft({ ...draft, unit: e.target.value as Unit })}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Low-stock threshold" htmlFor="new-ing-low">
              <input
                id="new-ing-low"
                className="input"
                inputMode="decimal"
                value={String(draft.lowThreshold)}
                onChange={(e) => setDraft({ ...draft, lowThreshold: parseNumberInput(e.target.value) ?? 0 })}
              />
            </Field>
            <p className="note">Opening stock is added afterwards with a stock adjustment so every movement stays auditable.</p>
          </>
        ) : null}
      </DetailPanel>
    </div>
  );
}

/** Inline stock movement form shown inside the ingredient panel. */
function StockAdjuster({
  ingredient,
  onApply,
}: {
  ingredient: Ingredient;
  onApply: (kind: "restock" | "adjust" | "loss", qty: number, note: string) => void;
}) {
  const [kind, setKind] = useState<"restock" | "adjust" | "loss">("restock");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");

  const value = parseNumberInput(qty) ?? 0;
  const preview = kind === "adjust" ? value : kind === "restock" ? Math.abs(value) : -Math.abs(value);

  return (
    <DetailSection title="Stock adjustment">
      <div className="stockrow">
        <select
          className="input"
          aria-label="Movement type"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
        >
          {MOVEMENT_KINDS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
        <input
          className="input input--num"
          inputMode="decimal"
          aria-label={`Quantity in ${ingredient.unit}`}
          placeholder={ingredient.unit}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <Button
          onClick={() => {
            onApply(kind, value, note);
            setQty("");
            setNote("");
          }}
          disabled={value === 0}
        >
          Apply
        </Button>
      </div>
      <input
        className="input"
        aria-label="Movement note"
        placeholder="Optional reference"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <p className="note">
        <History className="ico" /> Resulting balance:{" "}
        <b>{qtyLabel(Math.max(0, ingredient.stock + preview))} {ingredient.unit}</b>
      </p>
    </DetailSection>
  );
}
