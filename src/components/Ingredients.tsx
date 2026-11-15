import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Dish } from "../types";
import { useData } from "../data/store";
import { useToast } from "../data/toast";
import { Button, IconButton } from "./ui";
export function Ingredients({dish}: {dish: Dish}) {
  const {updateIngredients} = useData();
  const {push} = useToast();
  const [editing,setEditing] = useState(false);
  const [items,setItems] = useState<string[]>([]);
  const [error,setError] = useState("");
  const start = () => {setItems([...dish.ingredients]);setEditing(true);setError("");};
  return <details className="ingredients-section" open={editing || undefined}>
    <summary>Ingredients <span>{dish.ingredients.length}</span></summary>
    {editing ? <form onSubmit={event => {
      event.preventDefault();
      if (items.some(item => item.trim() === "")) {setError("Name each ingredient, or remove empty rows.");return;}
      updateIngredients(dish.id,items);setEditing(false);push("Ingredients saved.","good");
    }}>
      <div className="ingredient-editor">{items.map((item,index) => <div className="ingredient-editor__row" key={index}>
        <input className="input" aria-label={`Ingredient ${index+1}`} value={item} onChange={e => {setItems(prev => prev.map((text,i) => i === index ? e.target.value : text));setError("");}} />
        <IconButton label={`Remove ingredient ${index+1}`} ghost size="sm" onClick={() => setItems(prev => prev.filter((_,i) => i !== index))}><Trash2 className="ico" /></IconButton>
      </div>)}</div>
      {error ? <p className="field__err" role="alert">{error}</p> : null}
      <div className="ingredient-actions"><Button variant="ghost" size="sm" icon={<Plus className="ico" />} onClick={() => setItems(prev => [...prev,""])}>Add ingredient</Button><Button type="submit" size="sm">Save ingredients</Button><Button variant="soft" size="sm" onClick={() => setEditing(false)}>Cancel</Button></div>
    </form> : <>
      {dish.ingredients.length ? <ul>{dish.ingredients.map((item,index) => <li key={index}>{item}</li>)}</ul> : <p>No ingredients added yet.</p>}
      <Button variant="ghost" size="sm" onClick={start}>Edit Ingredients</Button>
    </>}
  </details>;
}
