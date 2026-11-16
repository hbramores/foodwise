import chickenDrummette from "../../images/hero-chicken.webp";

/**
 * Hero platter: the transparent fried-chicken drumettes suspended inside
 * gold decorative rings, with delicate steam rising off the food.
 *
 * Everything is DOM/CSS so the PNG/WebP keeps its alpha, `object-fit:
 * contain` holds the natural proportions, and the steam stays locked to the
 * food when the composition scales.
 */
export function HeroPlatter() {
  return (
    <div className="platter" aria-hidden="true">
      <div className="platter__rings">
        <svg viewBox="0 0 100 100" role="presentation" focusable="false">
          <defs>
            <linearGradient id="fw-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f8e9b0" />
              <stop offset="42%" stopColor="#e6c547" stopOpacity="0.55" />
              <stop offset="72%" stopColor="#f2d454" />
              <stop offset="100%" stopColor="#e6c547" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="48.4" fill="none" stroke="url(#fw-ring)" strokeWidth="0.7" />
          <circle cx="50" cy="50" r="41" fill="none" stroke="url(#fw-ring)" strokeWidth="0.32" opacity="0.6" />
          <circle
            className="platter__dash"
            cx="50"
            cy="50"
            r="44.8"
            fill="none"
            stroke="#e6c547"
            strokeWidth="0.45"
            strokeDasharray="0.9 7"
            strokeLinecap="round"
            opacity="0.55"
          />
        </svg>
      </div>

      <div className="platter__glow" />

      <div className="platter__food">
        <img
          className="platter__chicken"
          src={chickenDrummette}
          alt="Two crispy fried chicken drumettes"
          width={1000}
          height={717}
          draggable={false}
        />

        <div className="platter__steam">
          <i style={{ ["--x" as string]: "34%", ["--y" as string]: "26%", ["--dur" as string]: "5.4s", ["--delay" as string]: "0s", ["--drift" as string]: "10px" }} />
          <i style={{ ["--x" as string]: "45%", ["--y" as string]: "18%", ["--dur" as string]: "6.6s", ["--delay" as string]: "0.9s", ["--drift" as string]: "-9px" }} />
          <i style={{ ["--x" as string]: "57%", ["--y" as string]: "24%", ["--dur" as string]: "4.8s", ["--delay" as string]: "1.7s", ["--drift" as string]: "12px" }} />
          <i style={{ ["--x" as string]: "67%", ["--y" as string]: "34%", ["--dur" as string]: "6.1s", ["--delay" as string]: "2.6s", ["--drift" as string]: "-7px" }} />
          <i style={{ ["--x" as string]: "40%", ["--y" as string]: "44%", ["--dur" as string]: "5.9s", ["--delay" as string]: "3.4s", ["--drift" as string]: "8px" }} />
        </div>
      </div>
    </div>
  );
}
