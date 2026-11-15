import { useMemo, useState } from "react";
import { ClipboardList, Pencil, Trash2 } from "lucide-react";
import { useData } from "../data/store";
import { useToast } from "../data/toast";
import type { DailyRecord, Dish } from "../types";
import { computeForecast, recentRecordedDates, saleForDate } from "../lib/forecast";
import { todayISO, formatShort, formatLong } from "../lib/date";
import { num } from "../lib/format";
import { validateSalesInput } from "../lib/recordValidation";
import { DishImage } from "../components/DishImage";
import { Button, EmptyState } from "../components/ui";
import { CalculationModal } from "../components/DishDetail";
import { ConfirmDialog, Modal } from "../components/overlays";
export function History({onRecordDate}: {onRecordDate:(date:string)=>void}) {
  const {dishes,records,upsertRecord,deleteRecord} = useData();
  const {push} = useToast();
  const [through,setThrough] = useState(todayISO());
  const [selected,setSelected] = useState<Dish|null>(null);
  const [editing,setEditing] = useState<DailyRecord|null>(null);
  const [quantity,setQuantity] = useState("");
  const [error,setError] = useState("");
  const [deleting,setDeleting] = useState<DailyRecord|null>(null);
  const allDates = useMemo(() => [...new Set(records.filter(r => r.wasOffered).map(r => r.date))].sort(),[records]);
  const dates = useMemo(() => recentRecordedDates(records,through),[records,through]);
  const columns: (string|null)[] = [...dates,...Array(Math.max(0,5-dates.length)).fill(null)];
  const visible = dishes.filter(d => d.status === "active" || records.some(r => r.dishId === d.id));
  const selectedForecast = selected ? computeForecast(records,selected.id,dates) : null;
  const olderDates = allDates.filter(date => dates[0] && date < dates[0]);
  const newerDates = allDates.filter(date => date > (dates.at(-1) ?? ""));
  function saveSale() {
    if (!editing) return;
    const result=validateSalesInput(quantity,false);setError(result.error ?? "");
    if (result.quantity === null || result.error) return;
    upsertRecord({...editing,sold:result.quantity});setEditing(null);push("Daily sales saved successfully.","good");
  }
  return <>
    <section className="head"><div className="head__lead"><h1 className="head__title">History</h1><p className="head__sub">Your five most recent recorded sales days.</p></div><div className="head__actions"><Button variant="ghost" icon={<ClipboardList className="ico" />} onClick={() => onRecordDate(todayISO())}>Daily Recording</Button></div></section>
    <div className="history-v2-toolbar"><label>Show records through<input type="date" className="input" aria-label="Show records through" max={todayISO()} value={through} onChange={e => {if(e.target.value) setThrough(e.target.value);}} /></label><div className="history-v2-paging"><Button variant="ghost" size="sm" disabled={!olderDates.length} onClick={() => setThrough(olderDates.at(-1) ?? through)}>Older</Button><Button variant="ghost" size="sm" disabled={!newerDates.length} onClick={() => setThrough(newerDates[Math.min(4,newerDates.length-1)] ?? todayISO())}>Newer</Button><Button variant="soft" size="sm" disabled={through === todayISO()} onClick={() => setThrough(todayISO())}>Latest</Button><Button size="sm" icon={<Pencil className="ico" />} onClick={() => onRecordDate(dates.at(-1) ?? through)}>Edit Sales</Button></div></div>
    {dates.length ? <>
      <div className="five-day-scroll" role="region" aria-label="Five-day sales table" tabIndex={0}><table className="five-day-table"><thead><tr><th scope="col">Dish</th>{columns.map((date,i) => <th key={date ?? i} scope="col"><span>Day {i+1}</span>{date ? <button className="day-date" onClick={() => onRecordDate(date)} aria-label={`Edit sales for ${formatLong(date)}`}>{formatShort(date)}</button> : <small>—</small>}</th>)}<th scope="col" className="average-column">Average</th></tr></thead><tbody>{visible.map(dish => {const forecast=computeForecast(records,dish.id,dates);return <tr key={dish.id}><th scope="row"><div className="sales-record-dish"><DishImage dish={dish} className="recline__thumb" /><div><b>{dish.name}</b><small>{dish.status === "archived" ? "Archived" : dish.category}</small></div></div></th>{columns.map((date,i) => {const record = date ? saleForDate(records,dish.id,date) : undefined;return <td key={date ?? i}>{date ? <button className="history-sale-cell" aria-label={`${record ? "Edit" : "Add"} ${dish.name} sales for ${formatShort(date)}`} onClick={() => {if(record){setEditing(record);setQuantity(String(record.sold));setError("");}else onRecordDate(date);}}>{record ? num(record.sold) : "—"}</button> : "—"}</td>;})}<td className="average-column"><button className="history-average" aria-label={`View average calculation for ${dish.name}`} onClick={() => setSelected(dish)}>{forecast.recommended === null ? "—" : num(forecast.recommended)}</button></td></tr>;})}</tbody></table></div>
      <p className="history-v2-note">Average uses only recorded values in these five dates. A dash means no record; zero is included. Click a sale to edit it or an average to see the calculation. Older records are kept.</p>
    </> : <EmptyState icon={<ClipboardList className="ico" />} title="No records yet." description="Your daily sales will appear here once you start recording." action={<Button onClick={() => onRecordDate(todayISO())}>Record Sales</Button>} />}
    <CalculationModal dish={selected} forecast={selectedForecast} onClose={() => setSelected(null)} />
    <Modal open={editing !== null} onClose={() => setEditing(null)} title={dishes.find(d => d.id === editing?.dishId)?.name ?? "Edit sale"} subtitle={editing ? formatLong(editing.date) : ""} labelledById="edit-sale-title" footer={<><Button variant="ghost" icon={<Trash2 className="ico" />} onClick={() => {setDeleting(editing);setEditing(null);}}>Delete Sale</Button><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" form="edit-sale-form">Save Changes</Button></>}>
      <form id="edit-sale-form" onSubmit={e => {e.preventDefault();saveSale();}}><label className="field" htmlFor="edit-sale-quantity">Servings Sold<input id="edit-sale-quantity" className="input" inputMode="numeric" value={quantity} onChange={e => {setQuantity(e.target.value);setError("");}} aria-invalid={Boolean(error)} /></label>{error ? <p className="field__err" role="alert">{error}</p> : null}</form>
    </Modal>
    <ConfirmDialog open={deleting !== null} title="Delete this sales record?" description="This sale will be removed and the averages will update. Other records and the dish will be kept." confirmLabel="Delete Sale" tone="danger" onClose={() => setDeleting(null)} onConfirm={() => {if(deleting){deleteRecord(deleting.id);push("Sales record deleted.","good");}}} />
  </>;
}
