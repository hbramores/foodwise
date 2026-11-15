export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      {/* An open plate rim frames a geometric F: food, portion, and forward motion. */}
      <path d="M17.8 3.5A10 10 0 1 0 21.5 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 7h10v2.5h-7.3v3H16V15h-5.3v4H8Z" fill="currentColor" stroke="none" />
      <circle cx="21" cy="8" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LogoWordmark({ subtitle = "Forecasting" }: { subtitle?: string }) {
  return (
    <span className="wordmark">
      <span className="wordmark__mark">
        <BrandMark size={26} />
      </span>
      <span className="wordmark__txt">
        <b>FoodWise PH</b>
        <small>{subtitle}</small>
      </span>
    </span>
  );
}
