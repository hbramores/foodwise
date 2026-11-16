import { useEffect, useRef, useState } from "react";
import { LOGO_SRC } from "./brand";

const WORDS = "FOODWISE PH";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  r: number;
  t: number;
}

/**
 * Scene 1 — cinematic loading experience.
 * A golden spark gathers drifting particles which assemble around the mark,
 * the wordmark shimmers in, then an expanding golden light hands off to the
 * hero. Skippable, and never replayed within a session.
 */
export function CinematicLoader({
  onDone,
  reduced,
}: {
  onDone: () => void;
  reduced: boolean;
}) {
  const [phase, setPhase] = useState<"gather" | "reveal" | "out">("gather");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let particles: Particle[] = [];

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cx = w / 2;
      const cy = h / 2;
      const ring = Math.min(w, h) * 0.17;
      const count = w * h > 700000 ? 260 : 150;
      particles = Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        const jitter = 0.55 + Math.random() * 0.9;
        const startA = Math.random() * Math.PI * 2;
        const dist = Math.max(w, h) * (0.5 + Math.random() * 0.5);
        return {
          x: cx + Math.cos(startA) * dist,
          y: cy + Math.sin(startA) * dist,
          vx: 0,
          vy: 0,
          tx: cx + Math.cos(a) * ring * jitter,
          ty: cy + Math.sin(a) * ring * jitter,
          r: 0.7 + Math.random() * 1.8,
          t: Math.random() * Math.PI * 2,
        };
      });
    };

    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = performance.now();
    let elapsed = 0;

    const draw = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      elapsed += dt;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);
      const progress = Math.min(1, elapsed / 1500);
      const ease = 1 - Math.pow(1 - progress, 3);
      const pull = 0.0016 + ease * 0.02;

      for (const p of particles) {
        p.t += dt * 0.002;
        p.vx += (p.tx - p.x) * pull * (reduced ? 3 : 1);
        p.vy += (p.ty - p.y) * pull * (reduced ? 3 : 1);
        p.vx *= 0.9;
        p.vy *= 0.9;
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;

        const twinkle = 0.55 + 0.45 * Math.sin(p.t);
        const alpha = (0.25 + ease * 0.75) * twinkle;
        ctx.beginPath();
        ctx.fillStyle = `rgba(242, 212, 84, ${alpha.toFixed(3)})`;
        ctx.shadowColor = "rgba(230, 197, 71, 0.9)";
        ctx.shadowBlur = 12;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const glow = Math.max(0, ease - 0.35) / 0.65;
      if (glow > 0) {
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.32 * glow);
        grad.addColorStop(0, `rgba(255, 245, 200, ${0.55 * glow})`);
        grad.addColorStop(0.4, `rgba(230, 197, 71, ${0.3 * glow})`);
        grad.addColorStop(1, "rgba(230, 197, 71, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reduced]);

  useEffect(() => {
    if (reduced) {
      setPhase("reveal");
      const out = window.setTimeout(() => finish(), 700);
      return () => window.clearTimeout(out);
    }
    const reveal = window.setTimeout(() => setPhase("reveal"), 1250);
    const out = window.setTimeout(() => setPhase("out"), 2150);
    const done = window.setTimeout(() => finish(), 2600);
    return () => {
      window.clearTimeout(reveal);
      window.clearTimeout(out);
      window.clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish() {
    doneRef.current();
  }

  return (
    <div
      className={`loader${phase === "reveal" ? " is-reveal" : ""}${phase === "out" ? " is-out" : ""}`}
      role="status"
      aria-live="polite"
    >
      <canvas ref={canvasRef} className="loader__canvas" aria-hidden="true" />
      <div className="loader__core">
        <img className="loader__logo" src={LOGO_SRC} alt="" />
        <div className="loader__word" aria-label="FoodWise PH">
          {WORDS.split("").map((ch, i) => (
            <span key={`${ch}-${i}`} style={{ animationDelay: `${0.85 + i * 0.045}s` }} aria-hidden="true">
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))}
        </div>
        <p className="loader__tag">Smarter Food Preparation.</p>
      </div>
      <button type="button" className="loader__skip" onClick={finish}>
        Skip intro
      </button>
    </div>
  );
}
