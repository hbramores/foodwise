import { useEffect, useState, type ReactNode } from "react";
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Settings as SettingsIcon,
  ShoppingCart,
  TrendingUp,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { BrandMark } from "./Brand";
import { Assistant } from "./Assistant";
import { IconButton } from "./ui";
import { useStore } from "../data/store";
import { ROUTES, type RouteKey } from "../hooks";
import { manilaToday } from "../lib/date";
import { formatLong } from "../lib/date";
import { availableServings } from "../lib/calc";

const NAV: Array<{ key: RouteKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "pos", label: "POS Selling", icon: ShoppingCart },
  { key: "forecast", label: "Forecasting", icon: TrendingUp },
  { key: "inventory", label: "Inventory", icon: Boxes },
  { key: "menu", label: "Menu & Recipes", icon: UtensilsCrossed },
];

const PRIMARY_TABS: RouteKey[] = ["dashboard", "pos", "forecast", "inventory"];

export const SECTION_LABEL: Record<RouteKey, string> = {
  dashboard: "Dashboard",
  pos: "POS Selling",
  forecast: "Forecasting",
  inventory: "Inventory",
  menu: "Menu & Recipes",
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
      /* storage unavailable */
    }
  }, [collapsed]);
  return [collapsed, setCollapsed] as const;
}

/* ------------------------------------------------------------------ Sidebar */

function Sidebar({
  route,
  navigate,
  collapsed,
  onToggleCollapse,
  onLogout,
  onNavigate,
}: {
  route: RouteKey;
  navigate: (r: RouteKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  const { data } = useStore();
  const collapseLabel = collapsed ? "Expand navigation" : "Collapse navigation";

  const pending = data.products
    .filter((p) => p.status === "active")
    .reduce((sum, p) => sum + availableServings(data, p.id), 0);

  return (
    <aside className="side" aria-label="Primary">
      <div className="side__top">
        <span className="brand">
          <span className="brand__mark">
            <BrandMark size={30} />
          </span>
          <span className="brand__name">
            FoodWise
            <small>{data.settings.restaurantName || "Restaurant workspace"}</small>
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

      <nav className="side__nav" aria-label="Main">
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
              {item.key === "pos" && pending > 0 ? <span className="nav__badge">{pending}</span> : null}
            </a>
          );
        })}

        <div className="side__group side__group--gap">System</div>
        <a
          href="#/settings"
          className="nav"
          data-route="settings"
          aria-current={route === "settings" ? "page" : undefined}
          title={collapsed ? "Settings" : undefined}
          onClick={(e) => {
            e.preventDefault();
            navigate("settings");
            onNavigate?.();
          }}
        >
          <SettingsIcon className="ico" aria-hidden="true" />
          <span className="nav__label">Settings</span>
        </a>
      </nav>

      <button type="button" className="side__logout" aria-label="Log out" title="Log out" onClick={onLogout}>
        <LogOut className="ico" aria-hidden="true" />
        <span className="nav__label">Log out</span>
      </button>

      <div className="side__foot">
        <b>{data.settings.restaurantName || "Your restaurant"}</b>
        <small>{formatLong(manilaToday())}</small>
      </div>
    </aside>
  );
}

/* --------------------------------------------------------------- Mobile nav */

function MobileTabBar({ route, navigate }: { route: RouteKey; navigate: (r: RouteKey) => void }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const overflowActive = route === "menu" || route === "settings";

  return (
    <>
      {moreOpen ? (
        <div className="moresheet" role="dialog" aria-label="More sections">
          <button
            type="button"
            className="moresheet__scrim"
            aria-label="Close"
            onClick={() => setMoreOpen(false)}
          />
          <div className="moresheet__panel">
            <header className="moresheet__head">
              <b>More</b>
              <IconButton label="Close" ghost size="sm" onClick={() => setMoreOpen(false)}>
                <X className="ico" />
              </IconButton>
            </header>
            {NAV.filter((n) => !PRIMARY_TABS.includes(n.key))
              .concat([{ key: "settings", label: "Settings", icon: SettingsIcon }])
              .map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className="moresheet__item"
                    aria-current={route === item.key ? "page" : undefined}
                    onClick={() => {
                      navigate(item.key);
                      setMoreOpen(false);
                    }}
                  >
                    <Icon className="ico" aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}
          </div>
        </div>
      ) : null}

      <nav className="tabbar" aria-label="Primary">
        {NAV.filter((item) => PRIMARY_TABS.includes(item.key)).map((item) => {
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
              <span>{item.label.replace(" Selling", "").replace(" & Recipes", "")}</span>
            </a>
          );
        })}
        <button
          type="button"
          className="tabbar__item"
          aria-current={overflowActive ? "page" : undefined}
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((v) => !v)}
        >
          <MoreHorizontal className="ico" aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}

/* ---------------------------------------------------------------- AppShell */

export function AppShell({
  route,
  navigate,
  onLogout,
  children,
}: {
  route: RouteKey;
  navigate: (r: RouteKey) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const { data } = useStore();
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const [sideOpen, setSideOpen] = useState(false);

  useEffect(() => {
    document.title = `FoodWise — ${SECTION_LABEL[route]}`;
  }, [route]);

  return (
    <div className={`app${sideOpen ? " side-open" : ""}${collapsed ? " app--collapsed" : ""}`}>
      <div className="appwall" aria-hidden="true" />
      <div className="appwall__fade" aria-hidden="true" />

      <Sidebar
        route={route}
        navigate={navigate}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onLogout={onLogout}
        onNavigate={() => setSideOpen(false)}
      />

      {sideOpen ? <div className="side-scrim" onClick={() => setSideOpen(false)} aria-hidden="true" /> : null}

      <div className="frame">
        <header className="top">
          <IconButton label="Open navigation" ghost className="top__menu" onClick={() => setSideOpen(true)}>
            <PanelLeft className="ico" />
          </IconButton>

          <span className="top__brand">
            <span className="top__brand-mark">
              <BrandMark size={26} />
            </span>
            <b>FoodWise</b>
          </span>

          <div className="top__crumb">
            <span>{data.settings.restaurantName || "Restaurant"}</span>
            <i aria-hidden="true">·</i>
            <b>{SECTION_LABEL[route]}</b>
          </div>

          <div className="top__actions">
            <span className="live" title="Records are stored in this browser">
              <i aria-hidden="true" />
              Saved locally
            </span>
            <IconButton label="Settings" ghost className="top__settings" onClick={() => navigate("settings")}>
              <SettingsIcon className="ico" />
            </IconButton>
          </div>
        </header>

        <main className={`page${route === "pos" ? " page--wide" : ""}`} id="main">
          {children}
        </main>
      </div>

      <MobileTabBar route={route} navigate={navigate} />

      <Assistant route={route} />
    </div>
  );
}

export { ROUTES };
