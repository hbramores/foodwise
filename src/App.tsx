import { useCallback, useRef, useState } from "react";
import { DataProvider } from "./data/store";
import { ToastProvider } from "./data/toast";
import { NavGuardContext } from "./data/nav";
import { useRoute, type RouteKey } from "./hooks";
import { AppShell } from "./components/AppShell";
import { ConfirmDialog } from "./components/overlays";
import { Menu } from "./pages/Menu";
import { Record as RecordPage } from "./pages/Record";
import { History } from "./pages/History";
import { Settings } from "./pages/Settings";

function Root() {
  const [recordDate, setRecordDate] = useState<string | null>(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [pending, setPending] = useState<RouteKey | null>(null);
  const guardRef = useRef<(() => boolean) | null>(null);
  const { route, navigate: rawNavigate } = useRoute(next => {
    if (guardRef.current?.()) {setPending(next); return false;}
    return true;
  });

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

  return (
    <NavGuardContext.Provider value={{ register }}>
      <AppShell
        route={route}
        navigate={navigate}
        sideOpen={sideOpen}
        setSideOpen={setSideOpen}
      >
        {route === "menu" ? <Menu /> : null}
        {route === "record" ? <RecordPage navigate={navigate} initialDate={recordDate} /> : null}
        {route === "history" ? <History onRecordDate={date => {setRecordDate(date); navigate("record");}} /> : null}
        {route === "settings" ? <Settings /> : null}
      </AppShell>

      <ConfirmDialog
        open={pending !== null}
        title="You have unsaved changes. Leave without saving?"
        description="You have records you haven't saved yet. Leaving now will discard them."
        confirmLabel="Leave Without Saving"
        cancelLabel="Stay"
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
