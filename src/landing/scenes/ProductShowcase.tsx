import { useEffect, useRef, useState } from "react";
import {
  Boxes,
  ChefHat,
  LayoutDashboard,
  Package,
  Plus,
  Search,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { gsap, ScrollTrigger } from "../gsap";
import { usePrefersReducedMotion } from "../hooks";
import { LANDING_DISHES, forecastFrom } from "../data";

const TABS = ["POS Selling", "Forecasting", "Inventory", "Dashboard"] as const;
type Tab = (typeof TABS)[number];

const PRICES = [185, 265, 160, 145, 120, 95];
const STOCK_ROWS = [
  { name: "Chicken pieces", stock: "18 kg", level: "normal" },
  { name: "Fresh Squid", stock: "4 kg", level: "low" },
  { name: "Cooking oil", stock: "12 L", level: "normal" },
  { name: "Fresh Milk", stock: "0 L", level: "out" },
];

function recommended(sales: number[]): number {
  return forecastFrom(sales).recommended ?? 0;
}

function PosMini() {
  return (
    <div className="mini mini--split">
      <div className="mini__col">
        <div className="mini__head">
          <span className="mini__title">POS Selling</span>
          <span className="mini__sub">Friday · 11/14</span>
        </div>
        <div className="mini__search">
          <Search size={13} />
          <span>Search dishes</span>
        </div>
        <div className="mini__chips">
          <span className="mini__chip is-on">All</span>
          <span className="mini__chip">Appetizer</span>
          <span className="mini__chip">Main Course</span>
        </div>
        <div className="mini__posgrid">
          {LANDING_DISHES.slice(0, 4).map((d, i) => (
            <div className="mini__poscard" key={d.id}>
              <img className="mini__posimg" src={d.image} alt="" loading="lazy" />
              <b>{d.name}</b>
              <small>₱{PRICES[i]}</small>
              <span className="mini__add" aria-hidden="true">
                <Plus size={11} />
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mini__cart">
        <span className="mini__cart-title">
          <ShoppingCart size={12} /> Current order
        </span>
        <div className="mini__cartrow">
          <span>Fried Chicken</span>
          <b>₱265</b>
        </div>
        <div className="mini__cartrow">
          <span>Affogato</span>
          <b>₱120</b>
        </div>
        <span className="mini__carttotal">
          Total <b>₱385</b>
        </span>
        <span className="mini__checkout">Charge order</span>
      </div>
    </div>
  );
}

function ForecastMini() {
  return (
    <div className="mini">
      <div className="mini__head">
        <span className="mini__title">Forecasting</span>
        <span className="mini__sub">Recommended servings · last 5 recorded days</span>
      </div>
      <div className="mini__cards">
        {LANDING_DISHES.slice(0, 4).map((d) => (
          <div className="mini__fcard" key={d.id}>
            <img className="mini__thumb" src={d.image} alt="" loading="lazy" />
            <span className="mini__name">
              <b>{d.name}</b>
              <small>{d.category}</small>
            </span>
            <span className="mini__fbar" aria-hidden="true">
              {d.sales.map((v, i) => (
                <i key={i} style={{ height: `${Math.max(18, (v / 50) * 100)}%` }} />
              ))}
            </span>
            <span className="mini__rec">
              <small>Prepare</small>
              <b>{recommended(d.sales)}</b>
            </span>
          </div>
        ))}
      </div>
      <p className="mini__note">
        Recorded sales ÷ recorded days, rounded to a whole serving. Missing days are skipped.
      </p>
    </div>
  );
}

function InventoryMini() {
  return (
    <div className="mini">
      <div className="mini__head">
        <span className="mini__title">Inventory</span>
        <span className="mini__sub">Raw ingredients consumed at preparation</span>
      </div>
      <div className="mini__kpis">
        <span>
          <Boxes size={12} /> <b>24</b> ingredients
        </span>
        <span className="is-low">
          <TriangleMini /> <b>3</b> low
        </span>
        <span className="is-out">
          <TriangleMini /> <b>1</b> out
        </span>
      </div>
      <div className="mini__tablewrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Ingredient</th>
              <th scope="col">Category</th>
              <th scope="col">In stock</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {STOCK_ROWS.map((row) => (
              <tr key={row.name}>
                <th scope="row">{row.name}</th>
                <td>Dry Goods</td>
                <td>{row.stock}</td>
                <td>
                  <span className={`mini__status mini__status--${row.level}`}>{row.level}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TriangleMini() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path d="M6 1.2 11 10.5H1L6 1.2Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 4.4v2.8M6 8.6v.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function DashboardMini() {
  return (
    <div className="mini">
      <div className="mini__head">
        <span className="mini__title">Operations</span>
        <span className="mini__sub">This month</span>
      </div>
      <div className="mini__dashkpis">
        <span>
          <small>Total Sales</small>
          <b>₱84,260</b>
        </span>
        <span>
          <small>Servings Prepared</small>
          <b>612</b>
        </span>
        <span>
          <small>Servings Sold</small>
          <b>548</b>
        </span>
      </div>
      <div className="mini__dashgrid">
        <div className="mini__dashpanel">
          <b>
            <ChefHat size={12} /> Prepared vs. Sold
          </b>
          <span className="mini__vs">
            <i style={{ width: "100%" }} />
          </span>
          <span className="mini__vs mini__vs--green">
            <i style={{ width: "88%" }} />
          </span>
        </div>
        <div className="mini__dashpanel">
          <b>
            <Package size={12} /> Ingredient Stock
          </b>
          <span className="mini__status mini__status--low">3 low</span>
          <span className="mini__status mini__status--out">1 out</span>
        </div>
        <div className="mini__dashpanel">
          <b>
            <TrendingUp size={12} /> FoodWise Insight
          </b>
          <small>Rule-based observations from your recorded operations.</small>
        </div>
        <div className="mini__dashpanel">
          <b>
            <LayoutDashboard size={12} /> Food Waste Summary
          </b>
          <small>Discarded servings come from completed Wrap Up records.</small>
        </div>
      </div>
    </div>
  );
}

const POINTS = [
  { t: "Real screens", d: "POS Selling, Forecasting, Inventory and Dashboard from the demo." },
  { t: "Real workflow", d: "Sales are recorded by the POS — no separate daily sales sheet." },
  { t: "Real numbers", d: "Recommendations and stock status are derived from actual app data." },
];

/** Scene 6 — cinematic product showcase inside a floating browser. */
export function ProductShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const manual = useRef(false);
  const [tab, setTab] = useState<Tab>("POS Selling");
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".mock",
        { rotateY: 9, rotateX: 7, y: 46 },
        {
          rotateY: -5,
          rotateX: 2,
          y: -18,
          ease: "none",
          scrollTrigger: {
            trigger: stageRef.current,
            start: "top 88%",
            end: "bottom 34%",
            scrub: 1,
          },
        }
      );
      ScrollTrigger.create({
        trigger: stageRef.current,
        start: "top 58%",
        end: "bottom 42%",
        onUpdate: (self) => {
          if (manual.current) return;
          const p = self.progress;
          const next = TABS[Math.min(TABS.length - 1, Math.floor(p * TABS.length))];
          setTab(next);
        },
        onLeave: () => {
          manual.current = false;
        },
        onLeaveBack: () => {
          manual.current = false;
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section className="showcase lp-section" id="showcase" ref={sectionRef}>
      <div className="lp-wrap">
        <div className="showcase__head">
          <span className="lp-eyebrow">Product</span>
          <h2 className="lp-h2">
            One workflow,
            <br />
            from preparation to waste.
          </h2>
          <p className="lp-lead">
            FoodWise connects the counter and the kitchen: sell prepared servings, see what stock is
            left, and turn recorded sales into the next preparation plan.
          </p>
        </div>

        <div className="showcase__tabs" role="tablist" aria-label="Application screens">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className="showcase__tab"
              onClick={() => {
                manual.current = true;
                setTab(t);
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div ref={stageRef} className="showcase__stage">
          <div className="mock">
            <div className="mock__chrome">
              <span className="mock__dot" />
              <span className="mock__dot" />
              <span className="mock__dot" />
              <span className="mock__url">foodwise.ph/demo</span>
            </div>
            <div className="mock__screen" role="tabpanel" aria-label={tab}>
              {tab === "POS Selling" ? <PosMini /> : null}
              {tab === "Forecasting" ? <ForecastMini /> : null}
              {tab === "Inventory" ? <InventoryMini /> : null}
              {tab === "Dashboard" ? <DashboardMini /> : null}
            </div>
          </div>
        </div>

        <div className="showcase__points">
          {POINTS.map((p) => (
            <div className="showcase__point" key={p.t}>
              <b>{p.t}</b>
              <span>{p.d}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
