import { useState } from "react";
import {
  Database,
  Info,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Store,
  Trash2,
  Upload,
} from "lucide-react";
import { useData } from "../data/store";
import { useToast } from "../data/toast";
import { HISTORICAL_PERIODS, RESTAURANT_TYPES, type HistoricalPeriod, type RestaurantType } from "../types";
import { percent } from "../lib/format";
import { Button, Card, Field, Segmented } from "../components/ui";
import { ConfirmDialog } from "../components/overlays";

export function Settings() {
  const {
    data,
    updateRestaurant,
    updateSettings,
    loadDemoData,
    resetDemoData,
    clearAllData,
    records,
    dishes,
  } = useData();
  const { push } = useToast();

  const [name, setName] = useState(data.restaurant?.name ?? "");
  const [type, setType] = useState<RestaurantType | "">(data.restaurant?.type ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "load" | "reset" | "clear">(null);

  const hasData = dishes.length > 0 || records.length > 0;

  function saveRestaurant() {
    if (!name.trim()) {
      setNameError("Please enter your restaurant name.");
      return;
    }
    setNameError(null);
    updateRestaurant({ name: name.trim(), type });
    push("Settings saved.", "good");
  }

  const allowancePct = Math.round(data.settings.safetyAllowance * 100);

  return (
    <>
      <section className="head">
        <div className="head__lead">
          <div>
            <h1 className="head__title">
              <span className="accent">Settings</span>
            </h1>
            <p className="head__sub">
              Manage your restaurant details, forecast preferences, and the data saved in this
              browser.
            </p>
          </div>
        </div>
      </section>

      <div className="split">
        <div style={{ display: "grid", gap: 16 }}>
          <Card title="Restaurant information" icon={<Store className="ico" />}>
            <div className="mform__grid" style={{ marginTop: 4 }}>
              <Field label="Restaurant name" htmlFor="s-name" error={nameError} wide>
                <input
                  id="s-name"
                  className="input"
                  value={name}
                  maxLength={60}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                />
              </Field>
              <Field label="Restaurant type" htmlFor="s-type" wide>
                <select
                  id="s-type"
                  className="select"
                  value={type}
                  onChange={(e) => setType(e.target.value as RestaurantType | "")}
                >
                  <option value="">Not set</option>
                  {RESTAURANT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div style={{ marginTop: 18 }}>
              <Button variant="primary" icon={<Save className="ico" />} onClick={saveRestaurant}>
                Save changes
              </Button>
            </div>
          </Card>

          <Card title="Forecast preferences" icon={<SlidersHorizontal className="ico" />}>
            <div className="settingrow">
              <div className="settingrow__head">
                <div>
                  <div className="settingrow__title">Historical period</div>
                  <p className="field__hint" style={{ marginTop: 3 }}>
                    How many recent days of sales to average.
                  </p>
                </div>
                <Segmented<HistoricalPeriod>
                  ariaLabel="Historical period"
                  value={data.settings.historicalPeriod}
                  onChange={(v) => updateSettings({ historicalPeriod: v })}
                  options={HISTORICAL_PERIODS.map((p) => ({ value: p, label: `${p} days` }))}
                />
              </div>
            </div>

            <div className="settingrow">
              <div className="settingrow__head">
                <div>
                  <div className="settingrow__title">Safety allowance</div>
                  <p className="field__hint" style={{ marginTop: 3 }}>
                    Extra servings to prepare in case more customers arrive than usual.
                  </p>
                </div>
                <span className="rangeval">{percent(data.settings.safetyAllowance)}</span>
              </div>
              <input
                className="range"
                type="range"
                min={0}
                max={20}
                step={1}
                value={allowancePct}
                aria-label="Safety allowance percent"
                onChange={(e) => updateSettings({ safetyAllowance: Number(e.target.value) / 100 })}
              />
              <p className="field__hint">
                0% prepares exactly the average. 10% is the default. Changes apply to
                recommendations immediately.
              </p>
            </div>
          </Card>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <Card title="Data management" icon={<Database className="ico" />}>
            <div style={{ display: "grid", gap: 10 }}>
              <Button
                variant="ghost"
                block
                icon={<Upload className="ico" />}
                onClick={() => setConfirm("load")}
              >
                Load demo data
              </Button>
              <Button
                variant="ghost"
                block
                icon={<RotateCcw className="ico" />}
                onClick={() => setConfirm("reset")}
                disabled={!hasData}
              >
                Reset demo data
              </Button>
              <Button
                variant="danger"
                block
                icon={<Trash2 className="ico" />}
                onClick={() => setConfirm("clear")}
                disabled={!hasData && !data.restaurant}
              >
                Clear all local data
              </Button>
            </div>
            <div className="callout" style={{ marginTop: 16 }}>
              <Info className="ico" />
              <span>
                FoodWise PH stores everything in this browser using local storage. It is a prototype
                and not a substitute for secure, multi-device storage.
              </span>
            </div>
          </Card>

          <Card title="About" icon={<Info className="ico" />}>
            <div className="calc">
              <div className="calc__row">
                <span>Product</span>
                <b>FoodWise PH</b>
              </div>
              <div className="calc__row">
                <span>Version</span>
                <b>1.0</b>
              </div>
              <div className="calc__row">
                <span>Records stored</span>
                <b>{records.length}</b>
              </div>
              <div className="calc__row">
                <span>Dishes</span>
                <b>{dishes.length}</b>
              </div>
            </div>
            <p className="field__hint" style={{ marginTop: 16 }}>
              A simple food preparation forecasting tool for Philippine restaurants. Sample dish
              photos are from Wikimedia Commons and are credited in{" "}
              <code>public/dishes/CREDITS.json</code>.
            </p>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === "load"}
        title="Load demo data?"
        description={
          hasData
            ? "This replaces your current menu and records with the sample restaurant, Kusina ni Maria."
            : "This loads the sample restaurant, Kusina ni Maria, with a full menu and two weeks of records."
        }
        confirmLabel="Load demo data"
        tone="accent"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          loadDemoData();
          push("Demo data loaded.", "good");
        }}
      />

      <ConfirmDialog
        open={confirm === "reset"}
        title="Reset demo data?"
        description="This restores the sample restaurant to its original menu and records. Any changes you made to the demo will be lost."
        confirmLabel="Reset demo data"
        tone="danger"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          resetDemoData();
          push("Demo data reset.", "good");
        }}
      />

      <ConfirmDialog
        open={confirm === "clear"}
        title="Clear all local data?"
        description="This permanently removes your restaurant, menu, and all daily records from this browser. You will return to the welcome screen."
        confirmLabel="Clear everything"
        tone="danger"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          clearAllData();
          push("All local data cleared.", "good");
        }}
      />
    </>
  );
}
