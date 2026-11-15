import { useCallback, useRef, useState } from "react";
import { DataProvider, useData } from "./data/store";
import { ToastProvider } from "./data/toast";
import { NavGuardContext } from "./data/nav";
import { useRoute, type RouteKey } from "./hooks";
import { AppShell } from "./components/AppShell";
import { ConfirmDialog } from "./components/overlays";
import { Welcome } from "./pages/Welcome";
import { Menu } from "./pages/Menu";
import { Record as RecordPage } from "./pages/Record";
import { History } from "./pages/History";
import { Settings } from "./pages/Settings";

function Root() {
  const { hasRestaurant } = useData();
  const { route, navigate: rawNavigate } = useRoute();
  const [sideOpen, setSideOpen] = useState(false);
  const [pending, setPending] = useState<RouteKey | null>(null);
  const guardRef = useRef<(() => boolean) | null>(null);

  const register = useCallback((fn: (() => boolean) | null) => {
    guardRef.current = fn;
  }, []);

  const navigate = useCallback(
    (next: RouteKey) => {
      if (next === route) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (guardRef.current?.()) {
        setPending(next);
        return;
      }
      rawNavigate(next);
    },
    [route, rawNavigate]
  );

  if (!hasRestaurant) {
    return <Welcome />;
  }

  return (
    <NavGuardContext.Provider value={{ register }}>
      <AppShell
        route={route}
        navigate={navigate}
        sideOpen={sideOpen}
        setSideOpen={setSideOpen}
      >
        {route === "menu" ? <Menu navigate={navigate} /> : null}
        {route === "record" ? <RecordPage navigate={navigate} /> : null}
        {route === "history" ? <History navigate={navigate} /> : null}
        {route === "settings" ? <Settings /> : null}
      </AppShell>

      <ConfirmDialog
        open={pending !== null}
        title="Discard unsaved changes?"
        description="You have records you haven't saved yet. Leaving now will discard them."
        confirmLabel="Discard and leave"
        cancelLabel="Stay here"
        tone="danger"
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (pending) rawNavigate(pending);
        }}
      />
    </NavGuardContext.Provider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <DataProvider>
        <Root />
      </DataProvider>
    </ToastProvider>
  );
}
