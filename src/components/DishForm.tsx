import { useEffect, useRef, useState } from "react";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import type { Dish, DishCategory } from "../types";
import { DISH_CATEGORIES } from "../types";
import type { DishInput } from "../data/store";
import { Modal } from "./overlays";
import { Button, Field, IconButton } from "./ui";
import { resolveImageSrc } from "./DishImage";

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

export function DishForm({open,dish,onClose,onSubmit}: {open:boolean;dish:Dish|null;onClose:()=>void;onSubmit:(input:DishInput)=>void}) {
  const [name,setName] = useState("");
  const [category,setCategory] = useState<DishCategory | "">("");
  const [image,setImage] = useState<string|null>(null);
  const [ingredients,setIngredients] = useState<string[]>([]);
  const [errors,setErrors] = useState<{name?:string;category?:string;image?:string;ingredients?:string}>({});
  const [loading,setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {if (!open) return; setName(dish?.name ?? "");setCategory(dish?.category ?? "");setImage(dish?.image ?? null);setIngredients([...(dish?.ingredients ?? [])]);setErrors({});},[open,dish]);
  function submit() {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Enter a dish name.";
    if (!category) next.category = "Choose a category.";
    if (ingredients.some(item => !item.trim())) next.ingredients = "Name each ingredient or remove empty rows.";
    setErrors(next);
    if (Object.keys(next).length || !category) return;
    onSubmit({name:name.trim(),category,image,ingredients:ingredients.map(item => item.trim())});onClose();
  }
  return <Modal open={open} onClose={onClose} title={dish ? "Edit dish" : "Add dish"} subtitle="Dish details and ingredients" labelledById="dish-form-title" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" form="dish-editor" disabled={loading}>Save Dish</Button></>}>
    <form id="dish-editor" onSubmit={e => {e.preventDefault();submit();}} className="dish-editor-v2">
      <Field label="Dish Name" htmlFor="dish-name" error={errors.name}><input id="dish-name" className="input" value={name} maxLength={80} onChange={e => setName(e.target.value)} aria-invalid={Boolean(errors.name)} /></Field>
      <Field label="Category" htmlFor="dish-category" error={errors.category}><select id="dish-category" className="select" value={category} onChange={e => setCategory(e.target.value as DishCategory)}><option value="">Choose a category</option>{DISH_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
      <div className="dish-photo-field"><span className="field__label">Dish Image <small>(optional)</small></span><div className="dish-photo-field__controls">
        {image ? <img src={resolveImageSrc(image) ?? undefined} alt="Dish preview" /> : null}
        <Button variant="ghost" size="sm" icon={<ImagePlus className="ico" />} onClick={() => fileRef.current?.click()} disabled={loading}>{loading ? "Loading image…" : "Upload image"}</Button>
        {image ? <Button variant="soft" size="sm" onClick={() => setImage(null)}>Remove image</Button> : null}
        <input ref={fileRef} type="file" accept="image/*" className="sr" aria-label="Choose dish image" onChange={async e => {const file=e.target.files?.[0];if (!file) return;if (!file.type.startsWith("image/")) {setErrors(v => ({...v,image:"Choose an image file."}));return;}setLoading(true);try {setImage(await downscale(file));setErrors(v => ({...v,image:undefined}));}catch {setErrors(v => ({...v,image:"Could not read this image. Try another file."}));}finally{setLoading(false);e.target.value="";}}} />
      </div>{errors.image ? <p className="field__err" role="alert">{errors.image}</p> : null}</div>
      <div><h3 className="field__label">Ingredients</h3><div className="ingredient-editor">{ingredients.map((item,i) => <div className="ingredient-editor__row" key={i}><input className="input" value={item} aria-label={`Ingredient ${i+1}`} onChange={e => setIngredients(prev => prev.map((value,index) => index === i ? e.target.value : value))} /><IconButton label={`Remove ingredient ${i+1}`} ghost size="sm" onClick={() => setIngredients(prev => prev.filter((_,index) => index !== i))}><Trash2 className="ico" /></IconButton></div>)}</div>{errors.ingredients ? <p className="field__err" role="alert">{errors.ingredients}</p> : null}<Button variant="ghost" size="sm" icon={<Plus className="ico" />} onClick={() => setIngredients(prev => [...prev,""])}>Add ingredient</Button></div>
    </form>
  </Modal>;
}
