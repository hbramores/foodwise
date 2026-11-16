import logoUrl from "../logo/foodwise-mark.png";

/** FoodWise brand mark — the supplied chef-mouse logo (green + gold). */
export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <img
      className="brandmark"
      src={logoUrl}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}

export function LogoWordmark({ subtitle = "Forecasting" }: { subtitle?: string }) {
  return (
    <span className="wordmark">
      <span className="wordmark__mark">
        <BrandMark size={26} />
      </span>
      <span className="wordmark__txt">
        <b>FoodWise</b>
        <small>{subtitle}</small>
      </span>
    </span>
  );
}
