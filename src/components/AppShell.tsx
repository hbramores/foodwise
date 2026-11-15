import type { ReactNode } from "react";
import {
  ClipboardList,
  History as HistoryIcon,
  LayoutGrid,
  PanelLeft,
  Settings as SettingsIcon,
  Store,
} from "lucide-react";
import { BrandMark } from "./Brand";
import { IconButton } from "./ui";
import { useData } from "../data/store";
import { ROUTES, type RouteKey } from "../hooks";
import { todayISO } from "../lib/date";

const NAV = [
  { key: "menu" as RouteKey, label: "Menu", icon: LayoutGrid },
  { key: "record" as RouteKey, label: "Daily Recording", icon: ClipboardList },
  { key: "history" as RouteKey, label: "History", icon: HistoryIcon },
  { key: "settings" as RouteKey, label: "Settings", icon: SettingsIcon },
];

export const SECTION_LABEL: Record<RouteKey, string> = {
  menu: "Menu",
  record: "Daily Recording",
  history: "History",
  settings: "Settings",
};

function usePendingToday(): number {
  const { activeDishes, recordFor } = useData();
  const today = todayISO();
  return activeDishes.filter((d) => !recordFor(d.id, today)).length;
}

/* ------------------------------------------------------------------ Sidebar */

function Sidebar({
  route,
  navigate,
  onNavigate,
}: {
  route: RouteKey;
  navigate: (r: RouteKey) => void;
  onNavigate?: () => void;
}) {
  const { data } = useData();
  const pending = usePendingToday();

  return (
    <aside className="side" aria-label="Primary">
      <div className="side__top">
        <span className="brand">
          <span className="brand__mark">
            <BrandMark size={22} />
          </span>
          <span className="brand__name">
            FoodWise PH
            <small>Kitchen, in balance</small>
          </span>
        </span>
      </div>

      <nav className="side__nav">
        <div className="side__group">Workspace</div>
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.key}
              href={`#/${item.key}`}
              className="nav"
              data-route={item.key}
              aria-current={route === item.key ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.key);
                onNavigate?.();
              }}
            >
              <Icon className="ico" aria-hidden="true" />
              <span>{item.label}</span>
              {item.key === "record" && pending > 0 ? (
                <span className="nav__badge">{pending}</span>
              ) : null}
            </a>
          );
        })}
      </nav>

      <div className="side__foot">
        <b>{data.restaurant?.name ?? "Your restaurant"}</b>
        <small>{data.restaurant?.type || "Set a restaurant type in Settings"}</small>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------- MobileTabBar */

function MobileTabBar({
  route,
  navigate,
}: {
  route: RouteKey;
  navigate: (r: RouteKey) => void;
}) {
  const pending = usePendingToday();
  return (
    <nav className="tabbar" aria-label="Primary">
      {NAV.map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.key}
            href={`#/${item.key}`}
            className="tabbar__item"
            aria-current={route === item.key ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault();
              navigate(item.key);
            }}
          >
            <Icon className="ico" aria-hidden="true" />
            <span>{item.label}</span>
            {item.key === "record" && pending > 0 ? (
              <i className="tabbar__badge" aria-hidden="true">
                {pending}
              </i>
            ) : null}
          </a>
        );
      })}
    </nav>
  );
}

/* ---------------------------------------------------------------- AppShell */

export function AppShell({
  route,
  navigate,
  sideOpen,
  setSideOpen,
  children,
}: {
  route: RouteKey;
  navigate: (r: RouteKey) => void;
  sideOpen: boolean;
  setSideOpen: (v: boolean) => void;
  children: ReactNode;
}) {
  const { data } = useData();
  const restaurantName = data.restaurant?.name ?? "FoodWise PH";

  return (
    <div className={sideOpen ? "app side-open" : "app"}>
      <Sidebar route={route} navigate={navigate} onNavigate={() => setSideOpen(false)} />

      {sideOpen ? (
        <div className="side-scrim" onClick={() => setSideOpen(false)} aria-hidden="true" />
      ) : null}

      <div className="frame">
        <header className="top">
          <IconButton
            label="Open navigation"
            ghost
            className="top__menu"
            onClick={() => setSideOpen(true)}
          >
            <PanelLeft className="ico" />
          </IconButton>

          <div className="top__crumb">
            <Store className="ico" aria-hidden="true" />
            <span>{restaurantName}</span>
          </div>

          <div className="top__actions">
            <span className="live" title="Records are saved in this browser">
              <i aria-hidden="true" />
              Saved on this device
            </span>
          </div>
        </header>

        <main className="page" id="main">
          {children}
        </main>
      </div>

      <MobileTabBar route={route} navigate={navigate} />
    </div>
  );
}

export { ROUTES };
