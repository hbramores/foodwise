import type { ButtonHTMLAttributes, ReactNode } from "react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* --------------------------------------------------------------------- Button */

type Variant = "primary" | "accent" | "ghost" | "soft" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "sm";
  block?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  block,
  icon,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "btn",
        `btn--${variant}`,
        size === "sm" && "btn--sm",
        block && "btn--block",
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: "md" | "sm";
  ghost?: boolean;
}

export function IconButton({
  label,
  size = "md",
  ghost,
  className,
  children,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx("ibtn", ghost && "ibtn--ghost", size === "sm" && "ibtn--sm", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------------- Badge */

type Tone = "caramel" | "sage" | "good" | "amber" | "danger" | "plain";

export function Badge({
  tone = "plain",
  icon,
  children,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className={cx("badge", `badge--${tone}`)}>
      {icon}
      {children}
    </span>
  );
}

export function StatusPill({
  tone = "plain",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return <span className={cx("status", tone !== "plain" && `status--${tone}`)}>{children}</span>;
}

/* ----------------------------------------------------------------------- Chip */

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className="chip" aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  );
}

/* ----------------------------------------------------------------- Segmented */

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: Array<{ value: T; label: ReactNode }>;
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="seg" role="group" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          className="seg__btn"
          aria-pressed={opt.value === value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------- Field */

export function Field({
  label,
  hint,
  error,
  htmlFor,
  wide,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  htmlFor?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cx("field", error && "is-invalid", wide && "field--wide")}>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <span className="field__err" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="field__hint">{hint}</span>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------- Card */

export function Card({
  title,
  icon,
  tools,
  sub,
  className,
  children,
}: {
  title?: ReactNode;
  icon?: ReactNode;
  tools?: ReactNode;
  sub?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cx("card", className)}>
      {(title || tools) && (
        <header className="card__head">
          <h2 className="card__title">
            {icon}
            {title}
          </h2>
          {tools ? <div className="card__tools">{tools}</div> : null}
        </header>
      )}
      {sub ? <p className="card__sub" style={{ marginTop: title ? -6 : 0, marginBottom: 12 }}>{sub}</p> : null}
      {children}
    </section>
  );
}

/* ----------------------------------------------------------------- EmptyState */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty__art">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action ? <div style={{ marginTop: 10 }}>{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ Ring/Meter */

export function Ring({
  value,
  label,
  tone = "caramel",
}: {
  value: number;
  label?: string;
  tone?: "caramel" | "good" | "amber" | "danger";
}) {
  const pct = Math.max(0, Math.min(1, value));
  const color =
    tone === "good"
      ? "var(--color-good)"
      : tone === "amber"
        ? "var(--color-amber)"
        : tone === "danger"
          ? "var(--color-danger)"
          : "var(--color-caramel)";
  return (
    <span className="ring" style={{ ["--v" as string]: `${pct * 100}` }}>
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="15.5" />
        <circle className="ring__v" cx="18" cy="18" r="15.5" style={{ stroke: color }} />
      </svg>
      <b>{label ?? `${Math.round(pct * 100)}%`}</b>
    </span>
  );
}

export function Meter({
  value,
  tone = "caramel",
}: {
  value: number;
  tone?: "caramel" | "good" | "amber" | "danger";
}) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <span className="meter">
      <span
        className={cx("meter__fill", tone !== "caramel" && `meter__fill--${tone}`)}
        style={{ transform: `scaleX(${pct})` }}
      />
    </span>
  );
}
