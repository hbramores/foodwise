import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { RotateCcw, Calculator } from "lucide-react";
import { gsap } from "../gsap";
import { usePrefersReducedMotion } from "../hooks";
import { FORECAST_EXAMPLE, forecastFrom } from "../data";

const DAYS = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];

function parseSales(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function delay(ms: number): CSSProperties {
  return { ["--d" as string]: `${ms}ms` } as CSSProperties;
}

/** Scene 5 — the interactive five-day forecasting demonstration. */
export function ForecastDemo() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const [values, setValues] = useState<(number | null)[]>(() => [...FORECAST_EXAMPLE.values]);

  const result = useMemo(() => forecastFrom(values), [values]);
  const display = (v: number | null) => (v === null ? "" : String(v));
  const averageText = result.average === null ? "—" : String(Number(result.average.toFixed(2)));

  useEffect(() => {
    if (reduced) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".fcard",
        { y: 74, rotateX: -20, opacity: 0 },
        {
          y: 0,
          rotateX: 0,
          opacity: 1,
          duration: 0.85,
          stagger: 0.09,
          ease: "power3.out",
          clearProps: "all",
          scrollTrigger: { trigger: ".forecast__cards", start: "top 86%" },
        }
      );
      gsap.fromTo(
        [".forecast__math", ".forecast__result"],
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          clearProps: "all",
          scrollTrigger: { trigger: ".forecast__math", start: "top 90%" },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, [reduced]);

  function set(index: number, raw: string) {
    setValues((prev) => prev.map((v, i) => (i === index ? parseSales(raw) : v)));
  }

  return (
    <section className="forecast lp-section" id="forecast" ref={sectionRef}>
      <div className="lp-wrap">
        <div className="forecast__head">
          <span className="lp-eyebrow">Try it now</span>
          <h2 className="lp-h2">
            Five days of sales.
            <br />
            One <span className="lp-gold">smarter decision.</span>
          </h2>
          <p className="lp-lead">
            This is the real calculation behind FoodWise. Edit any day and the recommendation
            recalculates instantly — {FORECAST_EXAMPLE.dish}, the same example used in the demo.
          </p>
        </div>

        <div className="forecast__cards" role="group" aria-label="Five days of sales, editable">
          {values.map((v, i) => (
            <div className="fcard" key={DAYS[i]}>
              <span className="fcard__day">{DAYS[i]}</span>
              <input
                className="fcard__input"
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label={`${DAYS[i]} servings sold`}
                placeholder="—"
                value={display(v)}
                onChange={(e) => set(i, e.target.value)}
              />
              <span className="fcard__label">servings sold</span>
            </div>
          ))}
        </div>

        <div className="forecast__math" aria-live="polite">
          <span>
            {values.map((v) => (v === null ? "—" : v)).join(" + ")} = {result.total}
          </span>
          <span className="op">÷</span>
          <span>{result.eligible} day{result.eligible === 1 ? "" : "s"}</span>
          <span className="op">=</span>
          <span>{averageText} average</span>
        </div>

        <div className="forecast__result">
          <motion.div
            key={result.recommended === null ? "none" : result.recommended}
            initial={{ scale: 0.82, opacity: 0.35 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="forecast__big"
          >
            {result.recommended === null ? "—" : result.recommended}
          </motion.div>
          <div>
            <div className="forecast__big-label">Recommended servings</div>
            <div className="forecast__hint">
              Rounded to the nearest whole serving. Blank days are skipped, exactly like the demo.
            </div>
          </div>
        </div>

        <div className="forecast__toolbar">
          <button
            type="button"
            className="lp-btn lp-btn--ghost"
            onClick={() => setValues([...FORECAST_EXAMPLE.values])}
          >
            <span className="lp-btn__inner">
              <RotateCcw className="ico" size={16} />
              Reset Example
            </span>
          </button>
          <span
            className={`lp-eyebrow rv${result.eligible < 5 ? " is-in" : ""}`}
            style={delay(0)}
            aria-hidden={result.eligible >= 5}
          >
            <Calculator size={15} />
            {result.eligible < 5 ? "Limited history" : "Five recorded days"}
          </span>
        </div>
      </div>
    </section>
  );
}
