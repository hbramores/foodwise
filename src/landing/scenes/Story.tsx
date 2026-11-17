import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { gsap, ScrollTrigger } from "../gsap";
import { useCountUp, useInView, usePrefersReducedMotion } from "../hooks";
import { PROBLEM } from "../data";
import { LOGO_SRC } from "../brand";

const PLATES = Array.from({ length: PROBLEM.prepared }, (_, i) => i);

function Counter({
  target,
  active,
  valueClass,
  label,
  reduced,
  onSelect,
  pressed,
}: {
  target: number;
  active: boolean;
  valueClass?: string;
  label: string;
  reduced: boolean;
  onSelect?: () => void;
  pressed?: boolean;
}) {
  const value = useCountUp(target, active, 1100, reduced);
  const className = `counter${active ? " is-active" : ""}${valueClass ? ` ${valueClass}` : ""}${
    onSelect ? " counter--action" : ""
  }`;
  const content = (
    <>
      <b>{Math.round(value)}</b>
      <span>{label}</span>
    </>
  );

  if (!onSelect) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onSelect}
      aria-pressed={pressed}
      aria-label={`Highlight ${label.toLowerCase()} plates`}
    >
      {content}
    </button>
  );
}

/** Scene 3 — the restaurant overproduction problem, scroll-driven and interactive. */
export function ProblemSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [stage, setStage] = useState(0);
  const [manualSold, setManualSold] = useState<number | null>(null);
  const [focus, setFocus] = useState<"sold" | "unsold" | null>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      setStage(4);
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".problem__head > *",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.12,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 78%" },
        }
      );
      gsap.fromTo(
        ".plates",
        { rotateX: 14, y: 60, opacity: 0 },
        {
          rotateX: 0,
          y: 0,
          opacity: 1,
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: { trigger: ".plates", start: "top 88%" },
        }
      );
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top 62%",
        end: "bottom 58%",
        onUpdate: (self) => {
          const p = self.progress;
          const next = p < 0.1 ? 1 : p < 0.33 ? 2 : p < 0.58 ? 3 : 4;
          setStage((prev) => (prev === next ? prev : next));
        },
        onEnter: () => setStage((prev) => (prev < 1 ? 1 : prev)),
      });
    }, sectionRef);
    return () => ctx.revert();
  }, [reduced]);

  const sold = manualSold ?? PROBLEM.sold;
  const unsold = Math.max(0, PROBLEM.prepared - sold);

  function exploreSold(next: number) {
    setManualSold(next);
  }

  return (
    <section className={`problem lp-section${stage >= 4 ? " is-dim" : ""}`} id="story" ref={sectionRef}>
      <div className="lp-wrap">
        <div className="problem__head">
          <span className="lp-eyebrow">The problem</span>
          <h2 className="lp-h2">Every serving counts.</h2>
          <p className="lp-lead">
            Preparing more than customers buy can create unnecessary costs and unsold food. It is an
            easy habit to fall into when the plan is a guess.
          </p>
        </div>

        <div
          className={`plates${stage >= 1 ? " is-in" : ""}${focus === "sold" ? " is-focus-sold" : ""}${
            focus === "unsold" ? " is-focus-unsold" : ""
          }`}
          onMouseLeave={() => setFocus(null)}
          aria-hidden="true"
        >
          {PLATES.map((i) => (
            <span
              key={i}
              className={`plate${i < sold ? " is-sold" : " is-unsold"}`}
              style={{ ["--i" as string]: `${i % 12}` } as CSSProperties}
              onMouseEnter={() => setFocus(i < sold ? "sold" : "unsold")}
            />
          ))}
        </div>

        <div className="problem__counters">
          <Counter
            target={PROBLEM.prepared}
            active={stage >= 1}
            label="Servings prepared"
            reduced={reduced}
            onSelect={() => setFocus(null)}
            pressed={focus === null}
          />
          <Counter
            target={sold}
            active={stage >= 2}
            valueClass="is-sold"
            label="Servings sold"
            reduced={reduced}
            onSelect={() => setFocus("sold")}
            pressed={focus === "sold"}
          />
          <Counter
            target={unsold}
            active={stage >= 3}
            valueClass="is-unsold"
            label="Servings unsold"
            reduced={reduced}
            onSelect={() => setFocus("unsold")}
            pressed={focus === "unsold"}
          />
        </div>

        <div className="problem__explore">
          <label htmlFor="problem-sold">Explore the same 70 plates</label>
          <input
            id="problem-sold"
            type="range"
            min={0}
            max={PROBLEM.prepared}
            step={5}
            value={sold}
            onChange={(e) => exploreSold(Number(e.target.value))}
          />
          <output htmlFor="problem-sold">
            {sold} sold · {unsold} unsold
          </output>
        </div>

        <p className="problem__note">
          In this illustration, {unsold} plate{unsold === 1 ? " is" : "s are"} left unsold
          ({PROBLEM.prepared} − {sold} = {unsold}). Unsold servings are not automatically waste —
          they might be kept, shared, or repurposed. But they still represent food prepared on a
          guess.
        </p>

        <p className="problem__closing">
          What if preparation started with better information?
        </p>
      </div>
    </section>
  );
}

const CHAIN = [
  { code: "41 · 47 · 36 · 44 · 42", tag: "Five days of sales", detail: "Completed POS sales, newest first." },
  { code: "210 ÷ 5 days", tag: "Average of recorded days", detail: "Missing days are skipped, not counted as zero." },
  { code: "42 servings", tag: "Recommended preparation", detail: "One practical number to prepare against." },
];

/** Scene 4 — from guesswork to guidance. */
export function SolutionReveal() {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <section className="solution lp-section" id="solution">
      <div className="lp-wrap solution__grid">
        <div className="solution__copy">
          <span className={`lp-eyebrow rv${inView ? " is-in" : ""}`}>The solution</span>
          <h2 className="lp-h2">
            <span className={`rv-mask${inView ? " is-in" : ""}`}>
              <span>From guesswork</span>
            </span>
            <span className={`rv-mask${inView ? " is-in" : ""}`} style={{ ["--d" as string]: "120ms" } as CSSProperties}>
              <span>to <span className="lp-gold">guidance.</span></span>
            </span>
          </h2>
          <p className={`lp-lead rv${inView ? " is-in" : ""}`} style={{ ["--d" as string]: "220ms" } as CSSProperties}>
            FoodWise transforms recorded sales into practical preparation recommendations — one clear
            number you can prepare against.
          </p>
          <ul className="vision__list">
            {[
              { icon: <TrendingUp size={16} />, text: "Recorded POS sales, not feelings, drive the plan." },
              { icon: <Sparkles size={16} />, text: "A plain average rounds to a whole, usable number." },
              { icon: <ArrowRight size={16} />, text: "Every dish gets its own recommendation." },
            ].map((row, i) => (
              <li
                key={row.text}
                className={`rv${inView ? " is-in" : ""}`}
                style={{ ["--d" as string]: `${300 + i * 90}ms` } as CSSProperties}
              >
                {row.icon}
                <span>{row.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div
          className={`solution__stack${inView ? " is-in" : ""}`}
          ref={ref}
          aria-label="How the recommendation is built"
        >
          {CHAIN.map((row, i) => (
            <div
              className="solution__panel"
              key={row.code}
              style={{ ["--d" as string]: `${i * 170}ms` } as CSSProperties}
            >
              <span className="solution__step">{i + 1}</span>
              <code>{row.code}</code>
              <span className="solution__meta">
                <b>{row.tag}</b>
                <small>{row.detail}</small>
              </span>
              {i === CHAIN.length - 1 ? (
                <span className="solution__badge">
                  <img src={LOGO_SRC} alt="" width={22} height={22} />
                  FoodWise PH
                </span>
              ) : null}
            </div>
          ))}
          <span className="solution__flow" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
