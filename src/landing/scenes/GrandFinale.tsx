import { useEffect, useRef } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useMagnetic, useVisibility } from "../hooks";
import { LOGO_SRC } from "../brand";

/** Lightweight 2D golden dust for the finale (mirrors the loader's particles). */
function useFinaleParticles(canvasRef: { current: HTMLCanvasElement | null }, enabled: boolean) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !enabled) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let items: { x: number; y: number; r: number; s: number; a: number }[] = [];

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = w < 720 ? 46 : 96;
      items = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.7 + Math.random() * 1.9,
        s: 0.12 + Math.random() * 0.5,
        a: Math.random() * Math.PI * 2,
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      for (const p of items) {
        p.a += 0.01;
        p.x += Math.cos(p.a) * 0.16 - (p.x - cx) * 0.0016;
        p.y += Math.sin(p.a) * 0.16 - 0.18 - (p.y - cy) * 0.0016;
        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }
        ctx.beginPath();
        ctx.fillStyle = `rgba(242, 212, 84, ${(0.25 + 0.5 * Math.abs(Math.sin(p.a))).toFixed(3)})`;
        ctx.shadowColor = "rgba(230, 197, 71, 0.85)";
        ctx.shadowBlur = 10;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef, enabled]);
}

/** Scene 10 — grand finale with the demo entry. */
export function GrandFinale({ onEnterDemo }: { onEnterDemo: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { ref, visible } = useVisibility<HTMLElement>("40% 0px");
  const cta = useMagnetic<HTMLButtonElement>(0.32);
  useFinaleParticles(canvasRef, visible);

  return (
    <section className="finale" id="finale" ref={ref}>
      <canvas ref={canvasRef} className="finale__canvas" aria-hidden="true" />
      <div className="finale__inner">
        <img className="finale__logo" src={LOGO_SRC} alt="FoodWise PH" />
        <h2 className="finale__headline">
          Less guesswork.
          <br />
          <span className="lp-gold">Smarter preparation.</span>
        </h2>
        <p className="finale__ask">Ready to experience FoodWise?</p>
        <button
          ref={cta.ref}
          type="button"
          className="lp-btn lp-btn--gold lp-btn--lg magnetic finale__cta"
          onMouseMove={cta.onMouseMove}
          onMouseLeave={cta.onMouseLeave}
          onClick={onEnterDemo}
        >
          <span className="lp-btn__inner">
            <Sparkles className="ico" size={18} />
            Enter the Interactive Demo
            <ArrowRight className="ico" size={18} />
          </span>
        </button>
      </div>
    </section>
  );
}

export function LandingFooter({ onEnterDemo }: { onEnterDemo: () => void }) {
  return (
    <footer className="foot">
      <div className="lp-wrap foot__row">
        <div className="foot__brand">
          <img src={LOGO_SRC} alt="" />
          <span>
            <b>FoodWise PH</b>
            <small>Prepare smarter. Waste less.</small>
          </span>
        </div>
        <nav className="foot__links" aria-label="Footer">
          <a href="#story" onClick={(e) => { e.preventDefault(); document.getElementById("story")?.scrollIntoView({ behavior: "smooth" }); }}>
            About
          </a>
          <a href="#how" onClick={(e) => { e.preventDefault(); document.getElementById("how")?.scrollIntoView({ behavior: "smooth" }); }}>
            How It Works
          </a>
          <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }); }}>
            Features
          </a>
          <a href="#finale" onClick={(e) => { e.preventDefault(); onEnterDemo(); }}>
            Explore Demo
          </a>
        </nav>
        <small className="foot__meta">
          Frontend prototype · Data stays in your browser · No account required
        </small>
      </div>
    </footer>
  );
}
