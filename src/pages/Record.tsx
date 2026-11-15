import { useCallback, useEffect, useRef, useState } from "react";
import { Save, Check, ClipboardList } from "lucide-react";
import { useData } from "../data/store";
import { useToast } from "../data/toast";
import { useNavGuard } from "../data/nav";
import { todayISO } from "../lib/date";
import { validateSalesInput } from "../lib/recordValidation";
import { DateSelector } from "../components/DateSelector";
import { DishImage } from "../components/DishImage";
import { Button, EmptyState } from "../components/ui";
import { ConfirmDialog } from "../components/overlays";
import type { RouteKey } from "../hooks";
export function Record({navigate,initialDate}: {navigate:(r:RouteKey)=>void;initialDate:string|null}) {
  const {activeDishes,recordFor,upsertRecords} = useData();
  const {push} = useToast();
  const [date,setDate] = useState(initialDate ?? todayISO());
  const [drafts,setDrafts] = useState<{[id:string]:string}>({});
  const [errors,setErrors] = useState<{[id:string]:string}>({});
  const [dirty,setDirty] = useState(false);
  const [pendingDate,setPendingDate] = useState<string|null>(null);
  const dirtyRef = useRef(false);dirtyRef.current=dirty;
  useNavGuard(useCallback(() => dirtyRef.current,[]));
  const dishKey = activeDishes.map(d => d.id).join(",");
  useEffect(() => {
    setDrafts(Object.fromEntries(activeDishes.map(d => [d.id,recordFor(d.id,date)?.wasOffered ? String(recordFor(d.id,date)?.sold) : ""])));
    setErrors({});setDirty(false);
  },[date,dishKey]); // Changes of date load that day's saved sales, never missing values as zero.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e:BeforeUnloadEvent) => {e.preventDefault();e.returnValue="";};
    window.addEventListener("beforeunload",warn);return () => window.removeEventListener("beforeunload",warn);
  },[dirty]);
  function update(id:string,value:string) {setDrafts(prev => ({...prev,[id]:value}));setErrors(prev => ({...prev,[id]:""}));setDirty(true);}
  function save() {
    const nextErrors: {[id:string]:string} = {};
    const inputs = activeDishes.flatMap(dish => {
      const existing = recordFor(dish.id,date);
      const result = validateSalesInput(drafts[dish.id] ?? "",!existing?.wasOffered);
      if (result.error) {nextErrors[dish.id]=result.error;return [];}
      if (result.quantity === null) return [];
      return [{dishId:dish.id,date,sold:result.quantity,prepared:existing?.prepared ?? null,discarded:existing?.discarded ?? null,wasOffered:true,notes:existing?.notes ?? ""}];
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {push("Check the highlighted sales quantities.","danger");return;}
    if (!inputs.length) {push("Enter at least one sales quantity. Blank rows are not saved.","default");return;}
    upsertRecords(inputs);setDirty(false);push("Daily sales saved successfully.","good");
  }
  return <>
    <section className="head sales-record-head"><div className="head__lead"><h1 className="head__title">Daily Recording</h1><p className="head__sub">Enter how many servings were sold.</p></div><div className="head__actions"><DateSelector value={date} onChange={next => dirty ? setPendingDate(next) : setDate(next)} label="Date" max={todayISO()} id="sales-date" /></div></section>
    {activeDishes.length ? <>
      <div className="sales-record-list" role="group" aria-label="Daily sales entry"><div className="sales-record-table-head"><span>Dish</span><span>Servings Sold</span></div>
        {activeDishes.map(dish => {const error=errors[dish.id];const saved=recordFor(dish.id,date);return <div className="sales-record-row" key={dish.id}>
          <div className="sales-record-dish"><DishImage dish={dish} className="recline__thumb" /><div><label htmlFor={`sold-${dish.id}`}>{dish.name}</label><small>{dish.category}{saved?.wasOffered && drafts[dish.id] === String(saved.sold) ? <span className="sales-saved"><Check className="ico" />Saved</span> : null}</small></div></div>
          <div className="sales-record-input"><span aria-hidden="true">Servings Sold</span><input id={`sold-${dish.id}`} className="input num" inputMode="numeric" pattern="[0-9]*" placeholder="—" autoComplete="off" aria-label={`${dish.name} servings sold`} aria-invalid={Boolean(error)} aria-describedby={error ? `sold-error-${dish.id}` : undefined} value={drafts[dish.id] ?? ""} onChange={e => update(dish.id,e.target.value)} />{error ? <p id={`sold-error-${dish.id}`} className="field__err" role="alert">{error}</p> : null}</div>
        </div>;})}
      </div>
      <div className="sales-record-footer"><p>{dirty ? "Unsaved changes" : "Blank means not recorded. Zero means no servings sold."}</p><Button icon={<Save className="ico" />} onClick={save} disabled={!dirty}>Save Daily Sales</Button></div>
    </> : <EmptyState icon={<ClipboardList className="ico" />} title="No active dishes." description="Add a dish to start recording sales." action={<Button onClick={() => navigate("menu")}>Go to Menu</Button>} />}
    <ConfirmDialog open={pendingDate !== null} title="You have unsaved changes. Leave without saving?" description="Changing the date will discard your unsaved entries." confirmLabel="Leave Without Saving" cancelLabel="Stay" tone="danger" onClose={() => setPendingDate(null)} onConfirm={() => {if(pendingDate) setDate(pendingDate);}} />
  </>;
}
