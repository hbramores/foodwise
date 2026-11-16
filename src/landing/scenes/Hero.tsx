import { lazy, Suspense, useEffect, useRef, type CSSProperties } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { gsap } from "../gsap";
import { useMagnetic, usePrefersReducedMotion, useVisibility } from "../hooks";
import { HeroPlatter } from "./HeroPlatter";

const HeroScene3D = lazy(() => import("../three/HeroScene3D"));

const STATS = [
  { value: "6", label: "Sample dishes" },
  { value: "5", label: "Day sales history" },
  { value: "42", label: "Example recommendation" },
];

function delay(ms: number): CSSProperties {
  return { ["--d" as string]: `${ms}ms` } as CSSProperties;
}

export function Hero({ ready, onEnterDemo }: { ready: boolean; onEnterDemo: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef(0);
  const reduced = usePrefersReducedMotion();
  const { ref: stageRef, visible } = useVisibility<HTMLDivElement>("120% 0px");
  const toDemo = useMagnetic<HTMLButtonElement>(0.28, reduced);

  const isMobile =
    typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches;

  useEffect(() => {
    if (reduced) return;
    const ctx = gsap.context(() => {
      gsap.to(".hero__inner", {
        yPercent: -18,
        opacity: 0.05,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
          onUpdate: (self) => {
            scrollRef.current = self.progress;
          },
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, [reduced]);

  const on = ready;

  return (
    <section className="hero" id="hero" ref={sectionRef}>
      <div className={`hero__stage${visible && on ? " is-ready" : ""}`} ref={stageRef} aria-hidden="true">
        {visible ? (
          <Suspense fallback={<div className="hero__fallback" />}>
            <HeroScene3D scroll={scrollRef} quality={isMobile ? "low" : "high"} />
          </Suspense>
        ) : (
          <div className="hero__fallback" />
        )}
        <HeroPlatter />
      </div>

      <div className="hero__scrim" aria-hidden="true" />

      <div className="hero__inner">
        <span className={`lp-eyebrow rv${on ? " is-in" : ""}`} style={delay(80)}>
          Introducing FoodWise PH
        </span>

        <h1 className="hero__headline">
          <span className={`rv-mask${on ? " is-in" : ""}`} style={delay(160)}>
            <span>Prepare <em>smarter.</em></span>
          </span>
          <span className={`rv-mask${on ? " is-in" : ""}`} style={delay(300)}>
            <span>Waste <em>less.</em></span>
          </span>
        </h1>

        <p className={`lp-lead rv${on ? " is-in" : ""}`} style={delay(460)}>
          Turn everyday restaurant sales into smarter food preparation decisions.
        </p>

        <div className={`hero__actions rv${on ? " is-in" : ""}`} style={delay(580)}>
          <button
            ref={toDemo.ref}
            type="button"
            className="lp-btn lp-btn--gold magnetic"
            onMouseMove={toDemo.onMouseMove}
            onMouseLeave={toDemo.onMouseLeave}
            onClick={onEnterDemo}
          >
            <span className="lp-btn__inner">
              <Sparkles className="ico" size={17} />
              Explore the Demo
              <ArrowRight className="ico" size={17} />
            </span>
          </button>
          <button
            type="button"
            className="lp-btn lp-btn--ghost"
            onClick={() => document.getElementById("story")?.scrollIntoView({ behavior: "smooth" })}
          >
            <span className="lp-btn__inner">Discover FoodWise</span>
          </button>
        </div>

        <dl className={`hero__stats rv${on ? " is-in" : ""}`} style={delay(700)}>
          {STATS.map((s) => (
            <div className="hero__stat" key={s.label}>
              <b>{s.value}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </dl>
      </div>

      <div className="hero__scroll" aria-hidden="true">
        <span>Scroll</span>
        <i />
      </div>
    </section>
  );
}
