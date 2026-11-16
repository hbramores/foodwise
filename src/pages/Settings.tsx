import { useState } from "react";
import { Database, Info, RefreshCw, Store, Trash2 } from "lucide-react";
import { Button, Card, Field, StatusPill } from "../components/ui";
import { ConfirmDialog } from "../components/overlays";
import { useStore } from "../data/store";
import { useToast } from "../data/toast";
import { DATA_VERSION } from "../types";
import { manilaToday } from "../lib/date";

const RESTAURANT_TYPES = ["Carinderia", "Casual Dining", "Fast Food", "Café", "Other"];

export function Settings() {
  const { data, updateSettings, resetDemo, clearAll } = useStore();
  const { push } = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="stack">
      <header className="head">
        <div className="head__lead">
          <h1 className="head__title">Settings</h1>
          <p className="head__sub">Restaurant details, demo data and local storage.</p>
        </div>
      </header>

      <Card title="Restaurant" icon={<Store className="ico" />}>
        <Field label="Restaurant name" htmlFor="set-name">
          <input
            id="set-name"
            className="input"
            value={data.settings.restaurantName}
            onChange={(e) => updateSettings({ restaurantName: e.target.value })}
          />
        </Field>
        <Field label="Restaurant type" htmlFor="set-type">
          <select
            id="set-type"
            className="input"
            value={data.settings.restaurantType}
            onChange={(e) => updateSettings({ restaurantType: e.target.value })}
          >
            {RESTAURANT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
      </Card>

      <Card title="Data" icon={<Database className="ico" />} sub="Everything is stored in this browser only — no backend, no cloud sync.">
        <div className="settingsrows">
          <div className="settingsrow">
            <div>
              <b>Reset demo data</b>
              <p>Restores the six products, 29 ingredients, recipes and five days of sales.</p>
            </div>
            <Button variant="soft" icon={<RefreshCw className="ico" />} onClick={() => setConfirmReset(true)}>
              Reset Demo Data
            </Button>
          </div>
          <div className="settingsrow">
            <div>
              <b>Clear local data</b>
              <p>Empties every record. The workspace restarts without demo content.</p>
            </div>
            <Button variant="danger" icon={<Trash2 className="ico" />} onClick={() => setConfirmClear(true)}>
              Clear Local Data
            </Button>
          </div>
        </div>
        <div className="statgrid">
          <div className="stat"><b>{data.products.length}</b><span>Products</span></div>
          <div className="stat"><b>{data.ingredients.length}</b><span>Ingredients</span></div>
          <div className="stat"><b>{data.recipes.length}</b><span>Recipe lines</span></div>
          <div className="stat"><b>{data.transactions.length}</b><span>Transactions</span></div>
        </div>
      </Card>

      <Card title="About" icon={<Info className="ico" />}>
        <div className="about">
          <div>
            <b>FoodWise PH</b>
            <p>Restaurant POS, inventory, preparation forecasting and food-waste monitoring.</p>
          </div>
          <StatusPill tone="sage">Version {DATA_VERSION}.0</StatusPill>
        </div>
        <p className="note">
          Operating date {manilaToday()} (Asia/Manila). Sales are stored with price snapshots so
          history never changes when a dish is repriced.
        </p>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        title="Reset demo data?"
        description="This replaces the current records with the seeded demo dataset. Anything you recorded will be lost."
        confirmLabel="Reset Demo Data"
        tone="accent"
        onConfirm={() => {
          resetDemo();
          push("Demo data restored.", "good");
        }}
        onClose={() => setConfirmReset(false)}
      />

      <ConfirmDialog
        open={confirmClear}
        title="Clear all local data?"
        description="Every product, ingredient, recipe, sale and closing record will be permanently removed from this browser."
        confirmLabel="Clear Everything"
        onConfirm={() => {
          clearAll();
          push("Local data cleared.", "good");
        }}
        onClose={() => setConfirmClear(false)}
      />
    </div>
  );
}
