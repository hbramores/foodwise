import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, IconButton, Segmented, StatusPill } from "../components/ui";
import { DetailPanel, DetailRows, DetailSection } from "../components/DetailPanel";
import { useStore } from "../data/store";
import { useToast } from "../data/toast";
import { MENU_CATEGORIES, UNITS, type MenuCategory, type MenuProduct, type Unit } from "../types";
import { forecastFor } from "../lib/calc";
import { IMAGE_LIBRARY, productImage, productInitial } from "../lib/images";
import { num, parseNumberInput, peso } from "../lib/format";
import { qtyLabel } from "../lib/units";

interface RecipeDraft {
  key: string;
  ingredientId: string;
  qty: string;
  unit: Unit;
}

interface ProductDraft {
  id: string;
  name: string;
  category: MenuCategory;
  price: string;
  image: string | null;
  description: string;
  recipe: RecipeDraft[];
}

function blankDraft(): ProductDraft {
  return { id: "", name: "", category: "Main Course", price: "0", image: IMAGE_LIBRARY[1].value, description: "", recipe: [] };
}

export function MenuRecipes() {
  const { data, saveProduct, setProductStatus, saveRecipe } = useStore();
  const { push } = useToast();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MenuCategory | "all">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [draft, setDraft] = useState<ProductDraft | null>(null);

  const rows = useMemo(
    () =>
      data.products
        .filter((p) => (showArchived ? p.status === "archived" : p.status === "active"))
        .filter((p) => category === "all" || p.category === category)
        .filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase())),
    [data.products, category, query, showArchived]
  );

  const current = openId ? data.products.find((p) => p.id === openId) ?? null : null;

  function openProduct(product: MenuProduct, next: "view" | "edit" = "view") {
    setOpenId(product.id);
    setMode(next);
    setDraft({
      id: product.id,
      name: product.name,
      category: product.category,
      price: String(product.price),
      image: productImage(product),
      description: product.description,
      recipe: data.recipes
        .filter((r) => r.productId === product.id)
        .map((r) => ({ key: r.id, ingredientId: r.ingredientId, qty: String(r.qty), unit: r.unit })),
    });
  }

  function startNew() {
    setOpenId(null);
    setDraft(blankDraft());
    setMode("edit");
  }

  function save() {
    if (!draft) return;
    const name = draft.name.trim();
    const price = parseNumberInput(draft.price);
    if (!name) {
      push("Give the dish a name.", "danger");
      return;
    }
    if (price === null || price < 0) {
      push("Enter a valid selling price.", "danger");
      return;
    }
    const validRecipe = draft.recipe.filter((line) => line.ingredientId && (parseNumberInput(line.qty) ?? 0) > 0);
    if (draft.recipe.length && !validRecipe.length) {
      push("Recipe lines need an ingredient and a quantity above zero.", "danger");
      return;
    }

    const productId = saveProduct(
      { name, category: draft.category, price, image: draft.image, description: draft.description },
      draft.id || undefined
    );

    if (draft.recipe.length) {
      saveRecipe(
        productId,
        validRecipe.map((line) => ({
          ingredientId: line.ingredientId,
          qty: parseNumberInput(line.qty) ?? 0,
          unit: line.unit,
        }))
      );
    }

    push(draft.id ? "Product updated." : "Product added.", "good");
    setMode("view");
    if (!draft.id) setOpenId(null);
  }

  async function pickImage(file: File) {
    const reader = new FileReader();
    reader.onload = () => setDraft((prev) => (prev ? { ...prev, image: String(reader.result) } : prev));
    reader.readAsDataURL(file);
  }

  return (
    <div className="stack">
      <header className="head">
        <div className="head__lead">
          <h1 className="head__title">Menu &amp; Recipes</h1>
          <p className="head__sub">Dishes, selling prices and the recipe that drives preparation.</p>
        </div>
        <div className="head__actions">
          <Button variant="accent" icon={<Plus className="ico" />} onClick={startNew}>
            Add Product
          </Button>
        </div>
      </header>

      <Card
        title={showArchived ? "Archived products" : "Products"}
        icon={<UtensilsCrossed className="ico" />}
        tools={
          <Segmented
            value={showArchived ? "archived" : "active"}
            options={[
              { value: "active", label: "Active" },
              { value: "archived", label: "Archived" },
            ]}
            onChange={(v) => setShowArchived(v === "archived")}
            ariaLabel="Product status"
          />
        }
      >
        <div className="toolbar">
          <label className="search">
            <Search className="ico" />
            <input placeholder="Search dishes" aria-label="Search dishes" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <div className="pillrow" role="group" aria-label="Filter by category">
            <button type="button" className={`filter-pill${category === "all" ? " is-on" : ""}`} aria-pressed={category === "all"} onClick={() => setCategory("all")}>All</button>
            {MENU_CATEGORIES.map((c) => (
              <button key={c} type="button" className={`filter-pill${category === c ? " is-on" : ""}`} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>
        </div>

        {rows.length ? (
          <div className="menulist">
            {rows.map((product) => {
              const f = forecastFor(data, product.id);
              return (
                <button key={product.id} type="button" className="menuitem" onClick={() => openProduct(product)}>
                  <span className="menuitem__media">
                    {productImage(product) ? <img src={productImage(product) as string} alt={product.name} loading="lazy" /> : <span className="menuitem__ph">{productInitial(product.name)}</span>}
                  </span>
                  <span className="menuitem__body">
                    <b>{product.name}</b>
                    <small>{product.category} · {data.recipes.filter((r) => r.productId === product.id).length} recipe line(s)</small>
                  </span>
                  <span className="menuitem__price">{peso(product.price)}</span>
                  <span className="menuitem__rec">
                    <small>Prepare</small>
                    <b>{f.recommended === null ? "—" : num(f.recommended)}</b>
                  </span>
                  <span className="menuitem__status">
                    {product.status === "archived" ? <StatusPill tone="plain">Archived</StatusPill> : <StatusPill tone="good">Active</StatusPill>}
                  </span>
                  <ChevronRight className="ico menuitem__chev" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<UtensilsCrossed className="ico" />} title="No dishes" description="Add a product to build the menu." />
        )}
      </Card>

      {/* Product details */}
      <DetailPanel
        open={mode === "view" && Boolean(current)}
        onClose={() => setOpenId(null)}
        eyebrow="Product"
        title={current?.name ?? ""}
        subtitle={current ? `${current.category} · ${peso(current.price)}` : ""}
        media={current && productImage(current) ? <img className="dpanel__img" src={productImage(current) as string} alt={current.name} /> : null}
        footer={
          <div className="dpanel__actions">
            <Button
              variant={current?.status === "archived" ? "soft" : "ghost"}
              icon={current?.status === "archived" ? <ArchiveRestore className="ico" /> : <Archive className="ico" />}
              onClick={() => {
                if (!current) return;
                setProductStatus(current.id, current.status === "active" ? "archived" : "active");
                push(current.status === "active" ? "Product archived." : "Product restored.", "good");
              }}
            >
              {current?.status === "archived" ? "Restore" : "Archive"}
            </Button>
            <Button icon={<Pencil className="ico" />} onClick={() => current && openProduct(current, "edit")}>
              Edit Product
            </Button>
          </div>
        }
      >
        {current ? (
          <>
            <p className="dpanel__desc">{current.description || "No description yet."}</p>
            <DetailRows
              rows={[
                { label: "Category", value: current.category },
                { label: "Selling price", value: peso(current.price) },
                { label: "Status", value: <StatusPill tone={current.status === "active" ? "good" : "plain"}>{current.status}</StatusPill> },
                { label: "Recommended", value: forecastFor(data, current.id).recommended === null ? "Insufficient data" : `${num(forecastFor(data, current.id).recommended as number)} servings` },
              ]}
            />
            <DetailSection title="Recipe">
              {data.recipes.filter((r) => r.productId === current.id).length ? (
                <ul className="lines">
                  {data.recipes
                    .filter((r) => r.productId === current.id)
                    .map((line) => {
                      const ingredient = data.ingredients.find((i) => i.id === line.ingredientId);
                      return (
                        <li key={line.id}>
                          <span>{ingredient?.name ?? "Unknown ingredient"}</span>
                          <b>{qtyLabel(line.qty)} {line.unit}</b>
                        </li>
                      );
                    })}
                </ul>
              ) : (
                <p className="note">No recipe yet — preparation cannot be confirmed until ingredients are added.</p>
              )}
            </DetailSection>
          </>
        ) : null}
      </DetailPanel>

      {/* Product editor */}
      <DetailPanel
        open={mode === "edit" && Boolean(draft)}
        onClose={() => (draft?.id ? setMode("view") : setOpenId(null))}
        size="wide"
        eyebrow={draft?.id ? "Edit product" : "New product"}
        title={draft?.id ? draft.name || "Edit product" : "Add Product"}
        footer={
          <div className="dpanel__actions">
            <Button variant="ghost" onClick={() => (draft?.id ? setMode("view") : setOpenId(null))}>Cancel</Button>
            <Button onClick={save}>Save Changes</Button>
          </div>
        }
      >
        {draft ? (
          <>
            <Field label="Product name" htmlFor="p-name">
              <input id="p-name" className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <div className="fieldrow">
              <Field label="Category" htmlFor="p-cat">
                <select id="p-cat" className="input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as MenuCategory })}>
                  {MENU_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Selling price (₱)" htmlFor="p-price">
                <input id="p-price" className="input" inputMode="decimal" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
              </Field>
            </div>
            <Field label="Description" htmlFor="p-desc">
              <textarea id="p-desc" className="input" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </Field>
            <Field label="Image" hint="Choose a bundled photo or upload your own.">
              <div className="imgpicker">
                {IMAGE_LIBRARY.map((choice) => (
                  <button
                    key={choice.value}
                    type="button"
                    className={`imgpicker__opt${draft.image === choice.value ? " is-on" : ""}`}
                    aria-pressed={draft.image === choice.value}
                    onClick={() => setDraft({ ...draft, image: choice.value })}
                  >
                    <img src={choice.value} alt={choice.label} />
                  </button>
                ))}
                <label className="imgpicker__upload">
                  <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) void pickImage(file); }} />
                  Upload
                </label>
                {draft.image ? (
                  <IconButton label="Clear image" ghost size="sm" onClick={() => setDraft({ ...draft, image: null })}>
                    <X className="ico" />
                  </IconButton>
                ) : null}
              </div>
            </Field>

            <DetailSection
              title="Recipe"
              action={
                <Button
                  variant="soft"
                  size="sm"
                  icon={<Plus className="ico" />}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      recipe: [...draft.recipe, { key: `new-${Date.now()}`, ingredientId: data.ingredients[0]?.id ?? "", qty: "1", unit: data.ingredients[0]?.unit ?? "kg" }],
                    })
                  }
                >
                  Add ingredient
                </Button>
              }
            >
              {draft.recipe.length ? (
                <ul className="recipelist">
                  {draft.recipe.map((line, index) => (
                    <li key={line.key}>
                      <select
                        className="input"
                        aria-label={`Ingredient ${index + 1}`}
                        value={line.ingredientId}
                        onChange={(e) => {
                          const ingredient = data.ingredients.find((i) => i.id === e.target.value);
                          const next = [...draft.recipe];
                          next[index] = { ...line, ingredientId: e.target.value, unit: ingredient?.unit ?? line.unit };
                          setDraft({ ...draft, recipe: next });
                        }}
                      >
                        {data.ingredients.filter((i) => i.status === "active").map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                      <input
                        className="input input--num"
                        aria-label={`Quantity ${index + 1}`}
                        inputMode="decimal"
                        value={line.qty}
                        onChange={(e) => {
                          const next = [...draft.recipe];
                          next[index] = { ...line, qty: e.target.value };
                          setDraft({ ...draft, recipe: next });
                        }}
                      />
                      <select
                        className="input"
                        aria-label={`Unit ${index + 1}`}
                        value={line.unit}
                        onChange={(e) => {
                          const next = [...draft.recipe];
                          next[index] = { ...line, unit: e.target.value as Unit };
                          setDraft({ ...draft, recipe: next });
                        }}
                      >
                        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <IconButton
                        label="Remove line"
                        ghost
                        size="sm"
                        onClick={() => setDraft({ ...draft, recipe: draft.recipe.filter((l) => l.key !== line.key) })}
                      >
                        <Trash2 className="ico" />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="note">No recipe lines yet. Add ingredients so preparation can deduct stock.</p>
              )}
              <p className="note">
                Quantities are per single serving. {draft.recipe.length ? <Badge tone="sage">{draft.recipe.length} line(s)</Badge> : null}
              </p>
            </DetailSection>
          </>
        ) : null}
      </DetailPanel>
    </div>
  );
}
