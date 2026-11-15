import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, Check, ClipboardList, Save, Trash2, TriangleAlert } from "lucide-react";
import { useData } from "../data/store";
import { useToast } from "../data/toast";
import { useNavGuard } from "../data/nav";
import type { DailyRecord, Dish } from "../types";
import { formatLong, relativeDayLabel, todayISO } from "../lib/date";
import { num, parseNumberInput } from "../lib/format";
import { unsold as calcUnsold, retained as calcRetained } from "../lib/forecast";
import { Button, EmptyState, IconButton, StatusPill } from "../components/ui";
import { ConfirmDialog } from "../components/overlays";
import { DateSelector } from "../components/DateSelector";
import { DishImage } from "../components/DishImage";
import type { RouteKey } from "../hooks";

interface Draft {
  prepared: string;
  sold: string;
  discarded: string;
  notes: string;
  wasOffered: boolean;
  touched: boolean;
}

function draftFrom(record: DailyRecord | undefined): Draft {
  return {
    prepared: record ? String(record.prepared) : "",
    sold: record ? String(record.sold) : "",
    discarded: record ? String(record.discarded) : "",
    notes: record?.notes ?? "",
    wasOffered: record ? record.wasOffered : true,
    touched: false,
  };
}

function toInt(value: string): { ok: boolean; value: number } {
  const parsed = parseNumberInput(value);
  if (parsed === null || !Number.isInteger(parsed) || parsed < 0) {
    return { ok: false, value: 0 };
  }
  return { ok: true, value: parsed };
}

export function Record({ navigate }: { navigate: (r: RouteKey) => void }) {
  const { dishes, activeDishes, records, upsertRecords, deleteRecord, recordFor } = useData();
  const { push } = useToast();

  const [date, setDate] = useState(todayISO());
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Dish | null>(null);

  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  const isDirty = useCallback(() => dirtyRef.current, []);
  useNavGuard(isDirty);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const rows: Dish[] = useMemo(() => {
    const recorded = new Set(records.filter((r) => r.date === date).map((r) => r.dishId));
    const activeIds = new Set(activeDishes.map((d) => d.id));
    const extra = dishes.filter((d) => recorded.has(d.id) && !activeIds.has(d.id));
    return [...activeDishes, ...extra];
  }, [activeDishes, dishes, records, date]);

  // rebuild drafts when the date changes or the dish set changes
  const layoutKey = `${date}|${rows.map((d) => d.id).join(",")}`;
  useEffect(() => {
    const next: Record<string, Draft> = {};
    for (const dish of rows) {
      next[dish.id] = draftFrom(recordFor(dish.id, date));
    }
    setDrafts(next);
    setErrors({});
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);

  function update(dishId: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({
      ...prev,
      [dishId]: { ...prev[dishId], ...patch, touched: true },
    }));
    setErrors((prev) => {
      if (!prev[dishId]) return prev;
      const next = { ...prev };
      delete next[dishId];
      return next;
    });
    setDirty(true);
  }

  const computed = rows.map((dish) => {
    const draft = drafts[dish.id] ?? draftFrom(undefined);
    const prepared = draft.wasOffered ? toInt(draft.prepared).value : 0;
    const sold = draft.wasOffered ? toInt(draft.sold).value : 0;
    const discarded = draft.wasOffered ? (parseNumberInput(draft.discarded) ?? 0) : 0;
    const unsold = Math.max(0, calcUnsold(prepared, sold));
    const retained = calcRetained(prepared, sold, discarded);
    const exists = Boolean(recordFor(dish.id, date));
    return { dish, draft, prepared, sold, discarded, unsold, retained, exists };
  });

  const totals = computed.reduce(
    (acc, r) => ({
      prepared: acc.prepared + r.prepared,
      sold: acc.sold + r.sold,
      unsold: acc.unsold + r.unsold,
    }),
    { prepared: 0, sold: 0, unsold: 0 }
  );
  const saving = computed.filter((r) => r.draft.touched || r.exists).length;

  function validateAll(): boolean {
    const next: Record<string, string> = {};
    for (const { dish, draft } of computed) {
      const wouldSave = draft.touched || recordFor(dish.id, date);
      if (!wouldSave) continue;

      if (!draft.wasOffered) continue;

      const prepared = toInt(draft.prepared);
      const sold = toInt(draft.sold);
      const discardedRaw = draft.discarded.trim() === "" ? 0 : parseNumberInput(draft.discarded);

      if (!prepared.ok) {
        next[dish.id] = "Enter the servings prepared (whole number).";
        continue;
      }
      if (!sold.ok) {
        next[dish.id] = "Enter the servings sold (whole number).";
        continue;
      }
      if (sold.value > prepared.value) {
        next[dish.id] = "Sold servings cannot exceed prepared servings.";
        continue;
      }
      if (discardedRaw === null || discardedRaw < 0 || !Number.isInteger(discardedRaw)) {
        next[dish.id] = "Discarded must be a whole number of zero or greater.";
        continue;
      }
      if (discardedRaw > prepared.value - sold.value) {
        next[dish.id] = "Discarded servings cannot exceed unsold servings.";
        continue;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function save() {
    if (!validateAll()) {
      push("Please fix the highlighted entries.", "danger");
      return;
    }
    const inputs = computed
      .filter(({ dish, draft }) => draft.touched || recordFor(dish.id, date))
      .map(({ dish, draft }) => ({
        dishId: dish.id,
        date,
        prepared: draft.wasOffered ? toInt(draft.prepared).value : 0,
        sold: draft.wasOffered ? toInt(draft.sold).value : 0,
        discarded: draft.wasOffered ? (parseNumberInput(draft.discarded) ?? 0) : 0,
        wasOffered: draft.wasOffered,
        notes: draft.notes.trim(),
      }));

    if (inputs.length === 0) {
      push("Nothing to save yet — enter prepared and sold quantities.", "default");
      return;
    }

    upsertRecords(inputs);
    setDirty(false);
    setDrafts((prev) => {
      const next: Record<string, Draft> = { ...prev };
      for (const id of Object.keys(next)) next[id] = { ...next[id], touched: false };
      return next;
    });
    const hadExisting = inputs.some((i) => computed.find((c) => c.dish.id === i.dishId)?.exists);
    push(hadExisting ? "Daily records updated successfully." : "Daily records saved successfully.", "good");
  }

  if (rows.length === 0) {
    return (
      <>
        <RecordHeader
          date={date}
          setDate={setDate}
          onSave={save}
          dirty={dirty}
          totals={totals}
          saving={saving}
        />
        <div className="panel">
          <EmptyState
            icon={<ClipboardList style={{ width: 32, height: 32, strokeWidth: 1.4 }} />}
            title="No active dishes to record."
            description="Add a dish to your menu first, then come back to record what your kitchen prepared and sold."
            action={
              <Button variant="accent" onClick={() => navigate("menu")}>
                Go to menu
              </Button>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <RecordHeader
        date={date}
        setDate={setDate}
        onSave={save}
        dirty={dirty}
        totals={totals}
        saving={saving}
      />

      {dirty ? (
        <div className="callout callout--amber" style={{ marginBottom: 16 }}>
          <TriangleAlert className="ico" />
          <span>
            You have unsaved changes for {formatLong(date)}. Save them before leaving this page.
          </span>
        </div>
      ) : null}

      <div className="reclist">
        <div className="recline recline--head" aria-hidden="true">
          <span>Dish</span>
          <span>Prepared</span>
          <span>Sold</span>
          <span>Discarded</span>
          <span>Unsold / Retained</span>
          <span style={{ textAlign: "right" }}>Actions</span>
        </div>

        {computed.map(({ dish, draft, unsold, retained, exists }) => {
          const err = errors[dish.id];
          const off = !draft.wasOffered;
          return (
            <div key={dish.id} className={`recline${off ? " is-off" : ""}`}>
              <div className="recline__dish">
                <DishImage dish={dish} className="recline__thumb" />
                <div style={{ minWidth: 0 }}>
                  <b>{dish.name}</b>
                  <small>
                    {exists ? "Recorded" : "Not recorded"} · {dish.servingUnit}
                  </small>
                </div>
              </div>

              {off ? (
                <div className="recline__off" style={{ gridColumn: "2 / -1" }}>
                  <StatusPill tone="plain">Not offered — excluded from averages</StatusPill>
                </div>
              ) : (
                <>
                  <div className="recline__field">
                    <span>Prepared</span>
                    <input
                      className="input"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0"
                      value={draft.prepared}
                      onChange={(e) => update(dish.id, { prepared: e.target.value })}
                      aria-label={`${dish.name} prepared servings`}
                    />
                  </div>
                  <div className="recline__field">
                    <span>Sold</span>
                    <input
                      className="input"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0"
                      value={draft.sold}
                      onChange={(e) => update(dish.id, { sold: e.target.value })}
                      aria-label={`${dish.name} sold servings`}
                    />
                  </div>
                  <div className="recline__field">
                    <span>Discarded</span>
                    <input
                      className="input"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0"
                      value={draft.discarded}
                      onChange={(e) => update(dish.id, { discarded: e.target.value })}
                      aria-label={`${dish.name} discarded servings`}
                    />
                  </div>
                  <div className="recline__calc">
                    <div>
                      <span>Unsold</span>
                      <b>{num(unsold)}</b>
                    </div>
                    <div>
                      <span>Retained</span>
                      <b>{num(Math.max(0, retained))}</b>
                    </div>
                  </div>
                </>
              )}

              <div className="recline__actions">
                <button
                  type="button"
                  className="chip"
                  aria-pressed={off}
                  onClick={() => update(dish.id, { wasOffered: !off })}
                  title="Mark this dish as not offered on this date"
                >
                  {off ? <Check className="ico" style={{ width: 14, height: 14 }} /> : null}
                  Not offered
                </button>
                {exists ? (
                  <IconButton
                    label={`Delete the record for ${dish.name}`}
                    ghost
                    size="sm"
                    onClick={() => setDeleteTarget(dish)}
                  >
                    <Trash2 className="ico" />
                  </IconButton>
                ) : null}
              </div>

              {err ? (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span className="field__err" role="alert">
                    {err}
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="callout" style={{ marginTop: 16 }}>
        <ClipboardList className="ico" />
        <span>
          Unsold = Prepared − Sold. Retained = Unsold − Discarded. Retained servings are not
          automatically safe to reuse.
        </span>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this record?"
        description={`This removes the ${date} record for ${
          deleteTarget?.name ?? "this dish"
        }. The dish and its other records stay.`}
        confirmLabel="Delete record"
        tone="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const rec = recordFor(deleteTarget.id, date);
          if (rec) {
            deleteRecord(rec.id);
            setDrafts((prev) => ({ ...prev, [deleteTarget.id]: draftFrom(undefined) }));
            push("Record deleted.", "good");
          }
        }}
      />
    </>
  );
}

function RecordHeader({
  date,
  setDate,
  onSave,
  dirty,
  totals,
  saving,
}: {
  date: string;
  setDate: (iso: string) => void;
  onSave: () => void;
  dirty: boolean;
  totals: { prepared: number; sold: number; unsold: number };
  saving: number;
}) {
  const unitWord = "servings";
  return (
    <section className="head">
      <div className="head__lead">
        <div>
          <h1 className="head__title">
            Daily <span className="accent">Recording</span>
          </h1>
          <p className="head__sub">
            Record what your kitchen prepared and sold today. Unsold and retained quantities appear
            as you type.
          </p>
        </div>
      </div>

      <div className="head__actions">
        <DateSelector
          value={date}
          onChange={setDate}
          label="Date"
          max={todayISO()}
          id="record-date"
        />
        <Button
          variant="primary"
          icon={<Save className="ico" />}
          onClick={onSave}
          disabled={saving === 0 && !dirty}
        >
          Save records
        </Button>
      </div>

      <div className="head__stats">
        <span className="stat">
          <span className="stat__ico">
            <CalendarCheck className="ico" />
          </span>
          <span>
            <span className="stat__value">{relativeDayLabel(date)}</span>
            <span className="stat__label">{formatLong(date)}</span>
          </span>
        </span>
        <span className="stat">
          <span>
            <span className="stat__value">
              {num(totals.prepared)} {unitWord}
            </span>
            <span className="stat__label">Prepared across this date</span>
          </span>
        </span>
        <span className="stat">
          <span>
            <span className="stat__value">
              {num(totals.sold)} {unitWord}
            </span>
            <span className="stat__label">Sold · {num(totals.unsold)} unsold</span>
          </span>
        </span>
      </div>
    </section>
  );
}


