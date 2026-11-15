import { useEffect, useState, type ReactNode } from "react";
import {
  ClipboardList,
  History as HistoryIcon,
  LayoutGrid,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
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

/* Mobile bottom navigation: Daily Recording · Menu · History, with Menu centered. */
const MOBILE_NAV = [
  { key: "record" as RouteKey, label: "Daily Recording", icon: ClipboardList },
  { key: "menu" as RouteKey, label: "Menu", icon: LayoutGrid },
  { key: "history" as RouteKey, label: "History", icon: HistoryIcon },
];

export const SECTION_LABEL: Record<RouteKey, string> = {
  menu: "Menu",
  record: "Daily Recording",
  history: "History",
  settings: "Settings",
};

const SIDEBAR_KEY = "foodwise-ph:sidebar";

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === "collapsed";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "collapsed" : "expanded");
    } catch {
      /* Storage unavailable; the in-session state still applies. */
    }
  }, [collapsed]);
  return [collapsed, setCollapsed] as const;
}

function usePendingToday(): number {
  const { activeDishes, recordFor } = useData();
  const today = todayISO();
  return activeDishes.filter((d) => !recordFor(d.id, today)).length;
}

/* ------------------------------------------------------------------ Sidebar */

function Sidebar({
  route,
  navigate,
  collapsed,
  onToggleCollapse,
  onNavigate,
}: {
  route: RouteKey;
  navigate: (r: RouteKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
}) {
  const { data } = useData();
  const pending = usePendingToday();
  const collapseLabel = collapsed ? "Expand navigation" : "Collapse navigation";

  return (
    <aside className="side" aria-label="Primary">
      <div className="side__top">
        <span className="brand">
          <span className="brand__mark">
            <BrandMark size={22} />
          </span>
          <span className="brand__name">
            FoodWise PH
            <small>Sales to servings</small>
          </span>
        </span>
        <button
          type="button"
          className="side__collapse"
          aria-label={collapseLabel}
          aria-pressed={collapsed}
          title={collapseLabel}
          onClick={onToggleCollapse}
        >
          {collapsed ? <PanelLeftOpen className="ico" /> : <PanelLeftClose className="ico" />}
        </button>
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
              title={collapsed ? item.label : undefined}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.key);
                onNavigate?.();
              }}
            >
              <Icon className="ico" aria-hidden="true" />
              <span className="nav__label">{item.label}</span>
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
      {MOBILE_NAV.map((item) => {
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
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  return (
    <div
      className={`app${sideOpen ? " side-open" : ""}${collapsed ? " app--collapsed" : ""}`}
    >
      <Sidebar
        route={route}
        navigate={navigate}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onNavigate={() => setSideOpen(false)}
      />

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
            <IconButton
              label="Settings"
              ghost
              className="top__settings"
              onClick={() => navigate("settings")}
            >
              <SettingsIcon className="ico" />
            </IconButton>
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
