import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LayoutGrid, ClipboardList, LineChart, Check, Leaf, Gauge, Recycle } from "lucide-react";
import { gsap, ScrollTrigger } from "../gsap";
import { useInView, usePrefersReducedMotion } from "../hooks";
import { LANDING_DISHES, forecastFrom } from "../data";
import { LOGO_SRC } from "../brand";

/* ---------------------------------------------------------------- Features */

const FEATURES = [
  {
    key: "menu",
    icon: <LayoutGrid size={20} />,
    title: "Your menu. Organized.",
    body: "Keep your dishes, categories, and ingredients in one convenient place.",
  },
  {
    key: "record",
    icon: <ClipboardList size={20} />,
    title: "Record what sells.",
    body: "Enter the number of servings sold each day using a simple recording interface.",
  },
  {
    key: "prepare",
    icon: <LineChart size={20} />,
    title: "Know what to prepare.",
    body: "Use recent sales averages to guide your next preparation quantities.",
  },
] as const;

function FeatureArt({ kind }: { kind: (typeof FEATURES)[number]["key"] }) {
  if (kind === "menu") {
    return (
      <div className="feature__tilt">
        {LANDING_DISHES.slice(0, 3).map((d) => (
          <div className="feature__tilt-row" key={d.id}>
            {d.name} · {d.category}
          </div>
        ))}
      </div>
    );
  }
  if (kind === "record") {
    return (
      <div className="feature__slider">
        {[64, 46, 78].map((w, i) => (
          <span key={w}>
            <i style={{ "--w": `${w}%`, "--i": i } as CSSProperties} />
          </span>
        ))}
      </div>
    );
  }
  const sales = LANDING_DISHES[1].sales;
  return (
    <div className="feature__bars" aria-hidden="true">
      {sales.map((v, i) => (
        <i key={i} style={{ "--h": (v / 50).toFixed(2), "--i": i } as CSSProperties} />
      ))}
    </div>
  );
}

function Feature({ feature, index }: { feature: (typeof FEATURES)[number]; index: number }) {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <article
      ref={ref}
      className={`feature rv${inView ? " is-in" : ""}`}
      style={{ ["--d" as string]: `${index * 110}ms` } as CSSProperties}
    >
      <span className="feature__icon">{feature.icon}</span>
      <h3 className="lp-h3">{feature.title}</h3>
      <p>{feature.body}</p>
      <div className="feature__art">
        <FeatureArt kind={feature.key} />
      </div>
    </article>
  );
}

/** Scene 7 — feature showcase. */
export function FeatureShowcase() {
  return (
    <section className="features lp-section" id="features">
      <div className="lp-wrap">
        <div className="features__head">
          <span className="lp-eyebrow">Capabilities</span>
          <h2 className="lp-h2">Everything starts with better planning.</h2>
          <p className="lp-lead">
            Three small, focused tools — and one number that ties them together.
          </p>
        </div>
        <div className="features__grid">
          {FEATURES.map((f, i) => (
            <Feature key={f.key} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- HowItWorks */

const STEPS = [
  { n: "01", title: "Build your menu", body: "Add dishes, categories, and ingredients in a minute." },
  { n: "02", title: "Record daily sales", body: "Enter the servings sold for each dish at close." },
  { n: "03", title: "Prepare with guidance", body: "Prepare against the recommended servings for each dish." },
];

/** Scene 8 — three steps, smarter preparation. */
export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      setActive(2);
      return;
    }
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top 65%",
        end: "bottom 60%",
        onUpdate: (self) => {
          const p = self.progress;
          setActive(p < 0.34 ? 0 : p < 0.67 ? 1 : 2);
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section className="steps lp-section" id="how" ref={sectionRef}>
      <div className="lp-wrap">
        <div className="steps__head">
          <span className="lp-eyebrow">How it works</span>
          <h2 className="lp-h2">Three steps. Smarter preparation.</h2>
        </div>
        <div className="steps__track">
          {STEPS.map((s, i) => (
            <button
              key={s.n}
              type="button"
              className={`step${active === i ? " is-active" : ""}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
            >
              <span className="step__num">{s.n}</span>
              <h3 className="lp-h3">{s.title}</h3>
              <p>{s.body}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Vision */

const VISION_POINTS = [
  { icon: <Gauge size={17} />, text: "Prepare with a little more confidence and a little less guesswork." },
  { icon: <Recycle size={17} />, text: "Work toward reducing avoidable food waste from overproduction." },
  { icon: <Leaf size={17} />, text: "Keep the whole idea simple enough for a busy Filipino kitchen." },
];

/** Scene 9 — FoodWise vision. */
export function VisionSection() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const example = forecastFrom(LANDING_DISHES[1].sales);
  return (
    <section className="vision lp-section" id="vision" ref={ref}>
      <div className="lp-wrap vision__grid">
        <div className="vision__copy">
          <span className={`lp-eyebrow rv${inView ? " is-in" : ""}`}>Vision</span>
          <h2 className={`lp-h2 rv${inView ? " is-in" : ""}`} style={{ ["--d" as string]: "90ms" } as CSSProperties}>
            A smarter future for restaurant food preparation.
          </h2>
          <p className={`lp-lead rv${inView ? " is-in" : ""}`} style={{ ["--d" as string]: "180ms" } as CSSProperties}>
            FoodWise PH explores how simple sales information can help restaurants make better
            preparation decisions and work toward reducing avoidable food waste.
          </p>
          <ul className="vision__list">
            {VISION_POINTS.map((p, i) => (
              <li
                key={p.text}
                className={`rv${inView ? " is-in" : ""}`}
                style={{ ["--d" as string]: `${260 + i * 90}ms` } as CSSProperties}
              >
                <Check size={16} />
                <span>{p.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`vision__orbit rv${inView ? " is-in" : ""}`} style={{ ["--d" as string]: "120ms" } as CSSProperties} aria-hidden="true">
          <span className="vision__dots">
            <span className="orbit-dot" style={{ top: "4%", left: "46%" }} />
            <span className="orbit-dot" style={{ top: "74%", left: "12%" }} />
          </span>
          <span className="vision__dots vision__dots--b">
            <span className="orbit-dot" style={{ top: "80%", left: "76%" }} />
            <span className="orbit-dot" style={{ top: "28%", left: "90%" }} />
          </span>
          <span className="vision__center">
            <img src={LOGO_SRC} alt="" />
            <b style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--gold)" }}>
              {example.recommended} servings
            </b>
            <small style={{ color: "var(--muted)" }}>recommended for {LANDING_DISHES[1].name}</small>
          </span>
        </div>
      </div>
    </section>
  );
}
