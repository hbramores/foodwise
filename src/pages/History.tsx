import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarRange,
  ClipboardList,
  Eye,
  History as HistoryIcon,
  Pencil,
  Trash2,
} from "lucide-react";
import { useData } from "../data/store";
import { useToast } from "../data/toast";
import type { DailyRecord, Dish } from "../types";
import { addDaysISO, formatLong, formatShort, todayISO } from "../lib/date";
import { num, parseNumberInput } from "../lib/format";
import { retained as calcRetained, unsold as calcUnsold } from "../lib/forecast";
import { Button, Card, EmptyState, IconButton, Segmented, StatusPill } from "../components/ui";
import { ConfirmDialog, Modal } from "../components/overlays";
import { DishImage } from "../components/DishImage";
import type { RouteKey } from "../hooks";

type RangeKey = 7 | 14 | 30 | 0;

export function History({ navigate }: { navigate: (r: RouteKey) => void }) {
  const { dishes, records, deleteRecord } = useData();
  const { push } = useToast();

  const [range, setRange] = useState<RangeKey>(7);
  const [dishFilter, setDishFilter] = useState<string>("all");
  const [viewTarget, setViewTarget] = useState<DailyRecord | null>(null);
  const [editTarget, setEditTarget] = useState<DailyRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DailyRecord | null>(null);

  const dishById = useMemo(() => {
    const m = new Map<string, Dish>();
    for (const d of dishes) m.set(d.id, d);
    return m;
  }, [dishes]);

  const today = todayISO();
  const startDate = range === 0 ? null : addDaysISO(today, -(range - 1));

  const filtered = useMemo(
    () =>
      records
        .filter((r) => (startDate ? r.date >= startDate : true))
        .filter((r) => (dishFilter === "all" ? true : r.dishId === dishFilter))
        .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1)),
    [records, startDate, dishFilter]
  );

  const chartData = useMemo(() => {
    const map = new Map<string, { date: string; prepared: number; sold: number }>();
    for (const r of filtered) {
      const row = map.get(r.date) ?? { date: r.date, prepared: 0, sold: 0 };
      row.prepared += r.prepared;
      row.sold += r.sold;
      map.set(r.date, row);
    }
    return [...map.values()].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-14);
  }, [filtered]);

  const showEmpty = records.length === 0;

  return (
    <>
      <section className="head">
        <div className="head__lead">
          <div>
            <h1 className="head__title">
              History
            </h1>
            <p className="head__sub">
              Review your kitchen&rsquo;s previous preparation and sales, and spot overproduction.
            </p>
          </div>
        </div>

        <div className="head__actions">
          <Segmented<RangeKey>
            ariaLabel="Date range"
            value={range}
            onChange={setRange}
            options={[
              { value: 7, label: "7 days" },
              { value: 14, label: "14 days" },
              { value: 30, label: "30 days" },
              { value: 0, label: "All" },
            ]}
          />
          <select
            className="select"
            aria-label="Filter by dish"
            value={dishFilter}
            onChange={(e) => setDishFilter(e.target.value)}
            style={{ minWidth: 180 }}
          >
            <option value="all">All dishes</option>
            {dishes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.status === "archived" ? " (archived)" : ""}
              </option>
            ))}
          </select>
        </div>
      </section>

      {showEmpty ? (
        <div className="panel">
          <EmptyState
            icon={<HistoryIcon style={{ width: 32, height: 32, strokeWidth: 1.4 }} />}
            title="No records yet."
            description="Your daily records will appear here after you start recording your kitchen's production and sales."
            action={
              <Button
                variant="accent"
                icon={<ClipboardList className="ico" />}
                onClick={() => navigate("record")}
              >
                Record today&rsquo;s sales
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="history-content" style={{ display: "grid", gap: 16 }}>
            <details className="history-chart"><summary>Production vs. sales</summary>
            <Card
              title="Prepared vs sold"
              icon={<CalendarRange className="ico" />}
              sub={
                range === 0
                  ? "All recorded dates"
                  : `Last ${range} days · ${startDate ? formatShort(startDate) : ""} to ${formatShort(today)}`
              }
            >
              {chartData.length === 0 ? (
                <p className="field__hint">No quantities to chart for this selection yet.</p>
              ) : (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={chartData}
                      margin={{ top: 6, right: 6, left: -18, bottom: 0 }}
                      barGap={4}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="var(--color-line)"
                        strokeDasharray="3 5"
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v: string) => formatShort(v)}
                        tick={{ fill: "var(--color-muted)", fontSize: 11, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "var(--color-muted)", fontSize: 11, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        width={46}
                      />
                      <Tooltip
                        cursor={{
                          fill: "color-mix(in srgb, var(--color-espresso) 6%, transparent)",
                        }}
                        labelFormatter={(v: string) => formatLong(v)}
                        contentStyle={{
                          background: "var(--color-surface)",
                          border: "1px solid var(--color-line)",
                          borderRadius: 12,
                          boxShadow: "var(--shadow-pop)",
                          fontSize: 12.5,
                        }}
                        formatter={(value: number, name: string) => [
                          `${num(value)} servings`,
                          name === "prepared" ? "Prepared" : "Sold",
                        ]}
                      />
                      <Bar
                        dataKey="prepared"
                        fill="var(--color-sage)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={26}
                      />
                      <Bar
                        dataKey="sold"
                        fill="var(--color-caramel)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={26}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="legend">
                <span className="ppill">
                  <i style={{ background: "var(--color-sage)" }} />
                  Prepared
                </span>
                <span className="ppill ppill--sold">
                  <i />
                  Sold
                </span>
              </div>
            </Card>

            </details>
            <Card
              title="Records"
              icon={<ClipboardList className="ico" />}
              sub={`${filtered.length} record${filtered.length === 1 ? "" : "s"}`}
            >
              {filtered.length === 0 ? (
                <p className="field__hint">No records match these filters.</p>
              ) : (
                <div className="table-wrap" style={{ marginTop: 4 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Dish</th>
                        <th className="r">Prepared</th>
                        <th className="r">Sold</th>
                        <th className="r">Unsold</th>
                        <th className="r">Discarded</th>
                        <th className="r">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => {
                        const dish = dishById.get(r.dishId);
                        const unsold = Math.max(0, calcUnsold(r.prepared, r.sold));
                        return (
                          <tr key={r.id}>
                            <td>
                              <b>{formatShort(r.date)}</b>
                              <br />
                              <small style={{ color: "var(--color-muted)" }}>
                                {relativeWeekday(r.date)}
                              </small>
                            </td>
                            <td>
                              <div className="cell-dish">
                                {dish ? (
                                  <DishImage dish={dish} className="recline__thumb" />
                                ) : null}
                                <div>
                                  <b>{dish?.name ?? "Unknown dish"}</b>
                                  <small>
                                    {r.wasOffered ? (
                                      dish?.servingUnit ?? "serving"
                                    ) : (
                                      <StatusPill tone="plain">Not offered</StatusPill>
                                    )}
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td className="r num">{num(r.prepared)}</td>
                            <td className="r num">{num(r.sold)}</td>
                            <td className="r num">{num(unsold)}</td>
                            <td className="r num">{num(r.discarded)}</td>
                            <td className="r">
                              <div
                                className="recline__actions"
                                style={{ justifyContent: "flex-end" }}
                              >
                                <IconButton
                                  label="View record"
                                  ghost
                                  size="sm"
                                  onClick={() => setViewTarget(r)}
                                >
                                  <Eye className="ico" />
                                </IconButton>
                                <IconButton
                                  label="Edit record"
                                  ghost
                                  size="sm"
                                  onClick={() => setEditTarget(r)}
                                >
                                  <Pencil className="ico" />
                                </IconButton>
                                <IconButton
                                  label="Delete record"
                                  ghost
                                  size="sm"
                                  onClick={() => setDeleteTarget(r)}
                                >
                                  <Trash2 className="ico" />
                                </IconButton>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      <ViewRecordModal
        record={viewTarget}
        dish={viewTarget ? dishById.get(viewTarget.dishId) : undefined}
        onClose={() => setViewTarget(null)}
      />

      <EditRecordModal
        record={editTarget}
        dish={editTarget ? dishById.get(editTarget.dishId) : undefined}
        onClose={() => setEditTarget(null)}
        onSaved={() => push("Record updated.", "good")}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this record?"
        description="This removes the selected daily record. The dish itself is not affected."
        confirmLabel="Delete record"
        tone="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteRecord(deleteTarget.id);
            push("Record deleted.", "good");
          }
        }}
      />
    </>
  );
}

function relativeWeekday(iso: string): string {
  return formatLong(iso).replace(/^\w+, /, "");
}

function ViewRecordModal({
  record,
  dish,
  onClose,
}: {
  record: DailyRecord | null;
  dish?: Dish;
  onClose: () => void;
}) {
  if (!record) return null;
  const unsold = Math.max(0, calcUnsold(record.prepared, record.sold));
  const retained = Math.max(0, calcRetained(record.prepared, record.sold, record.discarded));
  return (
    <Modal
      open={record !== null}
      onClose={onClose}
      title={dish?.name ?? "Record"}
      subtitle={formatLong(record.date)}
    >
      <div className="calc">
        <div className="calc__row">
          <span>Prepared</span>
          <b>{num(record.prepared)}</b>
        </div>
        <div className="calc__row">
          <span>Sold</span>
          <b>{num(record.sold)}</b>
        </div>
        <div className="calc__row">
          <span>Unsold</span>
          <b>{num(unsold)}</b>
        </div>
        <div className="calc__row">
          <span>Discarded</span>
          <b>{num(record.discarded)}</b>
        </div>
        <div className="calc__row is-total">
          <span>Retained</span>
          <b>{num(retained)}</b>
        </div>
      </div>
      {record.notes ? (
        <div className="callout" style={{ marginTop: 16 }}>
          <span>&ldquo;{record.notes}&rdquo;</span>
        </div>
      ) : null}
      {!record.wasOffered ? (
        <div className="callout callout--amber" style={{ marginTop: 12 }}>
          <span>This day is marked as not offered and is excluded from averages.</span>
        </div>
      ) : null}
    </Modal>
  );
}

function EditRecordModal({
  record,
  dish,
  onClose,
  onSaved,
}: {
  record: DailyRecord | null;
  dish?: Dish;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { upsertRecord } = useData();
  const [prepared, setPrepared] = useState("");
  const [sold, setSold] = useState("");
  const [discarded, setDiscarded] = useState("");
  const [notes, setNotes] = useState("");
  const [wasOffered, setWasOffered] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recordId = record?.id ?? null;

  useEffect(() => {
    if (!record) return;
    setPrepared(String(record.prepared));
    setSold(String(record.sold));
    setDiscarded(String(record.discarded));
    setNotes(record.notes);
    setWasOffered(record.wasOffered);
    setError(null);
  }, [recordId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!record) return null;

  function submit() {
    if (!record) return;
    if (wasOffered) {
      const p = parseNumberInput(prepared);
      const s = parseNumberInput(sold);
      const d = discarded.trim() === "" ? 0 : parseNumberInput(discarded);
      if (p === null || !Number.isInteger(p) || p < 0) {
        setError("Enter the prepared servings as a whole number.");
        return;
      }
      if (s === null || !Number.isInteger(s) || s < 0) {
        setError("Enter the sold servings as a whole number.");
        return;
      }
      if (s > p) {
        setError("Sold servings cannot exceed prepared servings.");
        return;
      }
      if (d === null || d < 0 || !Number.isInteger(d)) {
        setError("Discarded must be a whole number of zero or greater.");
        return;
      }
      if (d > p - s) {
        setError("Discarded cannot exceed unsold servings.");
        return;
      }
      upsertRecord({
        dishId: record.dishId,
        date: record.date,
        prepared: p,
        sold: s,
        discarded: d,
        wasOffered: true,
        notes: notes.trim(),
      });
    } else {
      upsertRecord({
        dishId: record.dishId,
        date: record.date,
        prepared: 0,
        sold: 0,
        discarded: 0,
        wasOffered: false,
        notes: notes.trim(),
      });
    }
    onSaved();
    onClose();
  }

  return (
    <Modal
      open={record !== null}
      onClose={onClose}
      title={`Edit ${dish?.name ?? "record"}`}
      subtitle={formatLong(record.date)}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            Save changes
          </Button>
        </>
      }
    >
      <label className="switchrow" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className="check"
          aria-checked={!wasOffered}
          aria-label="Not offered today"
          onClick={() => setWasOffered((v) => !v)}
        >
          <svg viewBox="0 0 24 24" className="ico" aria-hidden="true">
            <path d="m5 12.5 4 4 10-10" />
          </svg>
        </button>
        Not offered today (excluded from averages)
      </label>

      {wasOffered ? (
        <div className="mform__grid">
          <div className="field">
            <label className="field__label" htmlFor="er-prepared">
              Prepared
            </label>
            <input
              id="er-prepared"
              className="input"
              inputMode="numeric"
              value={prepared}
              onChange={(e) => setPrepared(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="er-sold">
              Sold
            </label>
            <input
              id="er-sold"
              className="input"
              inputMode="numeric"
              value={sold}
              onChange={(e) => setSold(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="er-discarded">
              Discarded
            </label>
            <input
              id="er-discarded"
              className="input"
              inputMode="numeric"
              value={discarded}
              onChange={(e) => setDiscarded(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="er-notes">
              Notes (optional)
            </label>
            <input
              id="er-notes"
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. church crowd after mass"
            />
          </div>
        </div>
      ) : (
        <div className="field field--wide">
          <label className="field__label" htmlFor="er-notes2">
            Notes (optional)
          </label>
          <input
            id="er-notes2"
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      )}

      {error ? (
        <p className="field__err" role="alert" style={{ marginTop: 12 }}>
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
