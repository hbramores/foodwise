export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      {/* steam */}
      <path d="M9.2 3.2c.9 1 .9 2 0 3" />
      <path d="M12.6 2.6c.9 1 .9 2 0 3" />
      <path d="M16 3.4c.9 1 .9 2 0 3" />
      {/* bowl */}
      <path d="M3.6 11h16.8a8.4 8.4 0 0 1-8.4 8.4A8.4 8.4 0 0 1 3.6 11Z" />
      <path d="M2.2 21h19.6" />
      {/* leaf tucked in the bowl */}
      <path d="M13.9 9.6c1.6-1.9 3.4-2 4.6-1.4-.2 1.7-1.5 3.2-3.6 3.2" />
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
