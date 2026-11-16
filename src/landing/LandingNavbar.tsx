import { useEffect, useState } from "react";
import { ArrowRight, X, Menu as MenuIcon } from "lucide-react";
import { LOGO_SRC } from "./brand";

const LINKS = [
  { href: "#story", label: "About" },
  { href: "#how", label: "How It Works" },
  { href: "#features", label: "Features" },
];

export function LandingNavbar({ onEnterDemo }: { onEnterDemo: () => void }) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function go(href: string) {
    setOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <header className={`lp-nav${solid ? " is-solid" : ""}`}>
        <div className="lp-nav__bar">
          <a
            className="lp-nav__brand"
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <img className="lp-nav__logo" src={LOGO_SRC} alt="" />
            <span>FoodWise PH</span>
          </a>

          <nav className="lp-nav__links" aria-label="Sections">
            {LINKS.map((l) => (
              <a
                key={l.href}
                className="lp-nav__link"
                href={l.href}
                onClick={(e) => {
                  e.preventDefault();
                  go(l.href);
                }}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <button type="button" className="lp-btn lp-btn--gold lp-nav__cta" onClick={onEnterDemo}>
            <span className="lp-btn__inner">
              Explore Demo
              <ArrowRight className="ico" size={16} />
            </span>
          </button>

          <button
            type="button"
            className="lp-nav__burger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </header>

      {open ? (
        <div className="lp-nav__mobile" role="dialog" aria-label="Navigation">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => {
                e.preventDefault();
                go(l.href);
              }}
            >
              {l.label}
            </a>
          ))}
          <button
            type="button"
            className="lp-btn lp-btn--gold lp-nav__mobile-cta"
            onClick={() => {
              setOpen(false);
              onEnterDemo();
            }}
          >
            <span className="lp-btn__inner">
              Explore Demo
              <ArrowRight className="ico" size={16} />
            </span>
          </button>
        </div>
      ) : null}
    </>
  );
}
