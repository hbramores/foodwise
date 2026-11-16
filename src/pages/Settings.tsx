import { useEffect, useState } from "react";
import { Database, Info, RotateCcw, Save, Store, Trash2, Upload } from "lucide-react";
import { useData } from "../data/store";
import { useToast } from "../data/toast";
import { RESTAURANT_TYPES, type RestaurantType } from "../types";
import { Button, Card, Field } from "../components/ui";
import { ConfirmDialog } from "../components/overlays";
export function Settings() {
  const {data,updateRestaurant,loadDemoData,resetDemoData,clearAllData} = useData();
  const {push} = useToast();
  const [name,setName] = useState(data.restaurant?.name ?? "");
  const [type,setType] = useState<RestaurantType|"">(data.restaurant?.type ?? "");
  const [error,setError] = useState("");
  const [confirm,setConfirm] = useState<"load"|"reset"|"clear"|null>(null);
  useEffect(() => {setName(data.restaurant?.name ?? "");setType(data.restaurant?.type ?? "");},[data.restaurant]);
  return <>
    <section className="head"><div className="head__lead"><h1 className="head__title">Settings</h1><p className="head__sub">Your restaurant and the data saved in this browser.</p></div></section>
    <div className="settings-v2">
      <Card title="Restaurant Information" icon={<Store className="ico" />}><form onSubmit={e => {e.preventDefault();if(!name.trim()){setError("Enter your restaurant name.");return;}updateRestaurant({name:name.trim(),type});setError("");push("Restaurant information saved.","good");}} className="settings-restaurant-form"><Field label="Restaurant Name" htmlFor="restaurant-name" error={error}><input id="restaurant-name" className="input" maxLength={60} value={name} onChange={e => {setName(e.target.value);setError("");}} aria-invalid={Boolean(error)} /></Field><Field label="Restaurant Type" htmlFor="restaurant-type"><select id="restaurant-type" className="select" value={type} onChange={e => setType(e.target.value as RestaurantType|"")}><option value="">Not set</option>{RESTAURANT_TYPES.map(t => <option key={t}>{t}</option>)}</select></Field><Button type="submit" icon={<Save className="ico" />}>Save Changes</Button></form></Card>
      <Card title="Data Management" icon={<Database className="ico" />}><p className="field__hint">The complete demo includes six dishes, their ingredients, and five days of sales. Loading or resetting it replaces current data.</p><div className="settings-data-actions"><Button variant="ghost" icon={<Upload className="ico" />} onClick={() => setConfirm("load")}>Load Demo Data</Button><Button variant="ghost" icon={<RotateCcw className="ico" />} onClick={() => setConfirm("reset")}>Reset Demo Data</Button><Button variant="danger" icon={<Trash2 className="ico" />} onClick={() => setConfirm("clear")}>Clear Local Data</Button></div></Card>
      <Card title="About" icon={<Info className="ico" />}><div className="about-v2"><b>FoodWise <span>Version 2.0</span></b><p>Restaurant Sales Forecasting System</p><small>Recommended servings are the rounded average of recorded sales in the five most recent dates. All data stays in this browser.</small><a className="link" href="/dishes/CREDITS.json" target="_blank" rel="noreferrer">Photo credits and licenses</a></div></Card>
    </div>
    <ConfirmDialog open={confirm !== null} title={confirm === "clear" ? "Clear local data?" : confirm === "reset" ? "Reset demo data?" : "Load demo data?"} description={confirm === "clear" ? "This removes your restaurant details, dishes, ingredients, and sales from this browser. You will return to an empty menu." : "This replaces your current dishes, ingredients, restaurant details, and sales with the complete five-day sample. Your current changes will be lost."} confirmLabel={confirm === "clear" ? "Clear Local Data" : confirm === "reset" ? "Reset Demo Data" : "Load Demo Data"} tone="danger" onClose={() => setConfirm(null)} onConfirm={() => {if(confirm === "clear") clearAllData();else if(confirm === "reset") resetDemoData();else loadDemoData();push(confirm === "clear" ? "Local data cleared." : "Complete five-day demo loaded.","good");}} />
  </>;
}
