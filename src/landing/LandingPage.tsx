import { useEffect, useRef, useState } from "react";
import "./landing.css";
import { CinematicLoader } from "./CinematicLoader";
import { LandingNavbar } from "./LandingNavbar";
import { Hero } from "./scenes/Hero";
import { ProblemSection, SolutionReveal } from "./scenes/Story";
import { ForecastDemo } from "./scenes/ForecastDemo";
import { ProductShowcase } from "./scenes/ProductShowcase";
import { FeatureShowcase, HowItWorks, VisionSection } from "./scenes/SupportSections";
import { GrandFinale, LandingFooter } from "./scenes/GrandFinale";
import { navigate, DEMO_PATH } from "./router";
import { hasVisited, markVisited, usePrefersReducedMotion } from "./hooks";
import { ScrollTrigger } from "./gsap";

const INTRO_KEY = "foodwise-ph:intro-played";

export function LandingPage() {
  const reduced = usePrefersReducedMotion();
  const skipIntro = reduced || hasVisited(INTRO_KEY);
  const [loading, setLoading] = useState(!skipIntro);
  const [ready, setReady] = useState(skipIntro);
  const [gate, setGate] = useState(false);
  const progressRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    document.body.style.overflow = loading ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [loading]);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      progressRef.current?.style.setProperty("--p", p.toFixed(3));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 320);
    return () => window.clearTimeout(t);
  }, [ready]);

  useEffect(() => {
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  function finishIntro() {
    setLoading(false);
    setReady(true);
    markVisited(INTRO_KEY);
  }

  function enterDemo() {
    if (reduced) {
      navigate(DEMO_PATH);
      return;
    }
    setGate(true);
    window.setTimeout(() => navigate(DEMO_PATH), 840);
  }

  return (
    <div className="lp">
      <div className="lp__glow" aria-hidden="true" />
      <div className="lp__grain" aria-hidden="true" />

      {loading ? <CinematicLoader reduced={reduced} onDone={finishIntro} /> : null}

      <LandingNavbar onEnterDemo={enterDemo} />

      <main>
        <Hero ready={ready} onEnterDemo={enterDemo} />
        <ProblemSection />
        <SolutionReveal />
        <ForecastDemo />
        <ProductShowcase />
        <FeatureShowcase />
        <HowItWorks />
        <VisionSection />
        <GrandFinale onEnterDemo={enterDemo} />
      </main>

      <LandingFooter onEnterDemo={enterDemo} />

      <div className="progress" aria-hidden="true">
        <i ref={progressRef} />
      </div>

      <div className={`gate${gate ? " is-open" : ""}`} aria-hidden="true">
        <span>Entering FoodWise PH…</span>
      </div>
    </div>
  );
}
