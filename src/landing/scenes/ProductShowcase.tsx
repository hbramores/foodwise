import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { gsap, ScrollTrigger } from "../gsap";
import { usePrefersReducedMotion } from "../hooks";
import { LANDING_DISHES, forecastFrom } from "../data";

const TABS = ["Menu", "Daily Recording", "History"] as const;
type Tab = (typeof TABS)[number];

const DATES = ["11/10", "11/11", "11/12", "11/13", "11/14"];

function recommended(sales: number[]): number {
  return forecastFrom(sales).recommended ?? 0;
}

function MenuMini() {
  return (
    <div className="mini">
      <div className="mini__head">
        <span className="mini__title">Menu</span>
        <span className="mini__sub">Your dishes &amp; recommended servings</span>
      </div>
      <div className="mini__search">
        <Search size={13} />
        <span>Search dishes</span>
      </div>
      <div className="mini__chips">
        <span className="mini__chip is-on">All</span>
        <span className="mini__chip">Appetizer</span>
        <span className="mini__chip">Main Course</span>
        <span className="mini__chip">Soup</span>
      </div>
      <div className="mini__list">
        {LANDING_DISHES.map((d) => (
          <div className="mini__card" key={d.id}>
            <img className="mini__thumb" src={d.image} alt="" loading="lazy" />
            <span className="mini__name">
              <b>{d.name}</b>
              <small>{d.category}</small>
            </span>
            <span className="mini__rec">
              <small>Prepare</small>
              <b>{recommended(d.sales)}</b>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecordMini() {
  return (
    <div className="mini">
      <div className="mini__head">
        <span className="mini__title">Daily Recording</span>
        <span className="mini__sub">Friday · 11/14</span>
      </div>
      <div className="mini__list">
        {LANDING_DISHES.map((d) => (
          <div className="mini__row" key={d.id}>
            <img className="mini__thumb" src={d.image} alt="" loading="lazy" />
            <span className="mini__name">
              <b>{d.name}</b>
              <small>{d.category}</small>
            </span>
            <input
              className="mini__input"
              defaultValue={d.sales[d.sales.length - 1]}
              inputMode="numeric"
              aria-label={`${d.name} servings sold`}
              readOnly
              tabIndex={-1}
            />
          </div>
        ))}
      </div>
      <span className="mini__save">Save Daily Sales</span>
    </div>
  );
}

function HistoryMini() {
  return (
    <div className="mini">
      <div className="mini__head">
        <span className="mini__title">History</span>
        <span className="mini__sub">Five most recent sales days</span>
      </div>
      <div className="mini__tablewrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Dish</th>
              {DATES.map((d, i) => (
                <th scope="col" key={d}>
                  D{i + 1}
                </th>
              ))}
              <th scope="col" className="mini__avg-head">
                Avg
              </th>
            </tr>
          </thead>
          <tbody>
            {LANDING_DISHES.map((d) => (
              <tr key={d.id}>
                <th scope="row">{d.name}</th>
                {d.sales.map((v, i) => (
                  <td key={i}>{v}</td>
                ))}
                <td className="mini__avg">{recommended(d.sales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span className="mini__sub">Average is highlighted in gold, just like the app.</span>
    </div>
  );
}

const POINTS = [
  { t: "Real screens", d: "Menu, Daily Recording, and History exactly as they work in the demo." },
  { t: "Real numbers", d: "The same six dishes and five-day sample sales you will find inside." },
  { t: "Real averages", d: "Recommendations come from the recorded sales, never hard-coded." },
];

/** Scene 6 — cinematic product showcase inside a floating browser. */
export function ProductShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const manual = useRef(false);
  const [tab, setTab] = useState<Tab>("Menu");
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
          setTab(p < 0.34 ? "Menu" : p < 0.67 ? "Daily Recording" : "History");
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
            Simple to use.
            <br />
            Powerful in practice.
          </h2>
          <p className="lp-lead">
            No dashboards to learn. FoodWise keeps the workflow small: your menu, today&apos;s sales,
            and a clear five-day picture.
          </p>
        </div>

        <div className="showcase__tabs" role="tablist" aria-label="Application screens">
          {TABS.map((t) => (
            <button
              key={t}
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
              {tab === "Menu" ? <MenuMini /> : null}
              {tab === "Daily Recording" ? <RecordMini /> : null}
              {tab === "History" ? <HistoryMini /> : null}
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
