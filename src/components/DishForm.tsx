import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import type { Dish, DishCategory, ServingUnit } from "../types";
import { DISH_CATEGORIES, SERVING_UNITS } from "../types";
import { Modal } from "./overlays";
import { Button, Field } from "./ui";
import { resolveImageSrc } from "./DishImage";
import type { DishInput } from "../data/store";
import { parseNumberInput } from "../lib/format";

const PRESET_IMAGES = [
  { src: "dishes/fried-chicken.jpg", label: "Fried chicken" },
  { src: "dishes/pork-adobo.jpg", label: "Adobo" },
  { src: "dishes/filipino-spaghetti.jpg", label: "Spaghetti" },
  { src: "dishes/beef-caldereta.jpg", label: "Caldereta" },
  { src: "dishes/pancit-canton.jpg", label: "Pancit" },
  { src: "dishes/chicken-inasal.jpg", label: "Inasal" },
];

async function downscale(file: File, max = 900, quality = 0.78): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not load the image"));
    el.src = dataUrl;
  });

  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  try {
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return dataUrl;
  }
}

export function DishForm({
  open,
  dish,
  onClose,
  onSubmit,
}: {
  open: boolean;
  dish: Dish | null;
  onClose: () => void;
  onSubmit: (input: DishInput) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<DishCategory>("Main Dishes");
  const [servingUnit, setServingUnit] = useState<ServingUnit>("serving");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; cost?: string; price?: string }>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (dish) {
      setName(dish.name);
      setCategory(dish.category);
      setServingUnit(dish.servingUnit);
      setCost(dish.costPerServing === null ? "" : String(dish.costPerServing));
      setPrice(dish.sellingPrice === null ? "" : String(dish.sellingPrice));
      setImage(dish.image);
    } else {
      setName("");
      setCategory("Main Dishes");
      setServingUnit("serving");
      setCost("");
      setPrice("");
      setImage(null);
    }
    setErrors({});
  }, [open, dish]);

  const picking = image && !PRESET_IMAGES.some((p) => p.src === image);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((e) => ({ ...e, name: e.name }));
      return;
    }
    try {
      const small = await downscale(file);
      setImage(small);
    } catch {
      /* ignore */
    }
  }

  function submit() {
    const nextErrors: typeof errors = {};
    const trimmed = name.trim();
    if (!trimmed) nextErrors.name = "Please enter a dish name.";
    else if (trimmed.length > 80) nextErrors.name = "Dish name must be 80 characters or fewer.";

    const costNum = cost.trim() === "" ? null : parseNumberInput(cost);
    if (cost.trim() !== "" && (costNum === null || costNum < 0)) {
      nextErrors.cost = "Enter a cost of zero or greater.";
    }
    const priceNum = price.trim() === "" ? null : parseNumberInput(price);
    if (price.trim() !== "" && (priceNum === null || priceNum < 0)) {
      nextErrors.price = "Enter a price of zero or greater.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit({
      name: trimmed,
      category,
      image,
      servingUnit,
      costPerServing: costNum,
      sellingPrice: priceNum,
    });
    onClose();
  }

  const preview = resolveImageSrc(image);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={dish ? "Edit dish" : "Add a dish"}
      subtitle={
        dish
          ? "Update this dish. Its sales history stays linked."
          : "Add a dish to your menu to start recording and forecasting."
      }
      labelledById="dish-form-title"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            {dish ? "Save changes" : "Add dish"}
          </Button>
        </>
      }
    >
      <div className="mform__grid">
        <Field label="Dish name" htmlFor="dish-name" error={errors.name} wide>
          <input
            id="dish-name"
            className="input"
            value={name}
            maxLength={80}
            placeholder="Fried Chicken"
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <Field label="Category" htmlFor="dish-category">
          <select
            id="dish-category"
            className="select"
            value={category}
            onChange={(e) => setCategory(e.target.value as DishCategory)}
          >
            {DISH_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Serving unit" htmlFor="dish-unit" hint="Used to label quantities.">
          <select
            id="dish-unit"
            className="select"
            value={servingUnit}
            onChange={(e) => setServingUnit(e.target.value as ServingUnit)}
          >
            {SERVING_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Cost per serving (optional)" htmlFor="dish-cost" error={errors.cost}>
          <input
            id="dish-cost"
            className="input"
            value={cost}
            inputMode="decimal"
            placeholder="55"
            onChange={(e) => setCost(e.target.value)}
          />
        </Field>

        <Field label="Selling price (optional)" htmlFor="dish-price" error={errors.price}>
          <input
            id="dish-price"
            className="input"
            value={price}
            inputMode="decimal"
            placeholder="95"
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>

        <Field label="Dish image (optional)" wide hint="Upload a photo, or pick a sample below.">
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div
              style={{
                width: 116,
                height: 92,
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid var(--color-line)",
                background: "var(--color-cream)",
                flex: "none",
                display: "grid",
                placeItems: "center",
              }}
            >
              {preview ? (
                <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <ImagePlus style={{ width: 26, height: 26, color: "var(--color-caramel)" }} />
              )}
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                  {image ? "Replace photo" : "Upload photo"}
                </Button>
                {image ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 className="ico" style={{ width: 15, height: 15 }} />}
                    onClick={() => setImage(null)}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  void handleFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <span className="field__hint">
                {picking
                  ? "Uploaded photos are stored in this browser only."
                  : "Sample photos are included for the prototype."}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {PRESET_IMAGES.map((p) => (
              <button
                key={p.src}
                type="button"
                aria-label={`Use ${p.label} photo`}
                title={`Use ${p.label} photo`}
                onClick={() => setImage(p.src)}
                style={{
                  width: 54,
                  height: 44,
                  borderRadius: 10,
                  overflow: "hidden",
                  border:
                    image === p.src
                      ? "2px solid var(--color-caramel)"
                      : "1px solid var(--color-line)",
                  background: "var(--color-cream)",
                }}
              >
                <img
                  src={resolveImageSrc(p.src) ?? ""}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
