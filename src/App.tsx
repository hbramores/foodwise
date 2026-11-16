import { AppShell } from "./components/AppShell";
import { DataProvider, useStore } from "./data/store";
import { ToastProvider } from "./data/toast";
import { useRoute } from "./hooks";
import { Dashboard } from "./pages/Dashboard";
import { Forecasting } from "./pages/Forecasting";
import { Inventory } from "./pages/Inventory";
import { MenuRecipes } from "./pages/MenuRecipes";
import { POS } from "./pages/POS";
import { Settings } from "./pages/Settings";
import { BrandMark } from "./components/Brand";

function Splash() {
  return (
    <div className="splash">
      <span className="splash__mark">
        <BrandMark size={44} />
      </span>
      <b>FoodWise</b>
      <small>Loading your workspace…</small>
    </div>
  );
}

function Workspace({ onLogout }: { onLogout: () => void }) {
  const { route, navigate } = useRoute();
  const { ready } = useStore();

  if (!ready) {
    return (
      <div className="app">
        <div className="appwall" aria-hidden="true" />
        <div className="appwall__fade" aria-hidden="true" />
        <Splash />
      </div>
    );
  }

  return (
    <AppShell route={route} navigate={navigate} onLogout={onLogout}>
      {route === "dashboard" ? <Dashboard navigate={navigate} /> : null}
      {route === "pos" ? <POS /> : null}
      {route === "forecast" ? <Forecasting /> : null}
      {route === "inventory" ? <Inventory /> : null}
      {route === "menu" ? <MenuRecipes /> : null}
      {route === "settings" ? <Settings /> : null}
    </AppShell>
  );
}

export default function App({ onLogout }: { onLogout?: () => void }) {
  return (
    <ToastProvider>
      <DataProvider>
        <Workspace onLogout={onLogout ?? (() => undefined)} />
      </DataProvider>
    </ToastProvider>
  );
}
