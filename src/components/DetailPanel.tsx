import type { ReactNode } from "react";
import { Drawer } from "./overlays";

/**
 * Pane-inspired right-side detail panel (PRD v2.2 §4/§6).
 * Every module reuses this so inspecting a product, an ingredient, a
 * forecast or a receipt feels identical: same width, header, close control
 * and action placement. On mobile it becomes a full-height drawer.
 */
export function DetailPanel({
  open,
  onClose,
  eyebrow,
  title,
  subtitle,
  media,
  footer,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  media?: ReactNode;
  footer?: ReactNode;
  size?: "md" | "wide";
  children: ReactNode;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      label={title}
      className={size === "wide" ? "drawer--wide" : undefined}
    >
      <article className="dpanel">
        <header className="dpanel__head">
          {eyebrow ? <span className="dpanel__eyebrow">{eyebrow}</span> : null}
          <h2 className="dpanel__title">{title}</h2>
          {subtitle ? <p className="dpanel__sub">{subtitle}</p> : null}
        </header>

        {media ? <div className="dpanel__media">{media}</div> : null}

        <div className="dpanel__body">{children}</div>

        {footer ? <footer className="dpanel__foot">{footer}</footer> : null}
      </article>
    </Drawer>
  );
}

/** Labelled key/value rows used inside detail panels. */
export function DetailRows({ rows }: { rows: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="drows">
      {rows.map((row) => (
        <div className="drows__row" key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DetailSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="dsect">
      <header className="dsect__head">
        <h3>{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}
