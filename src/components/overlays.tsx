import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { Button, IconButton } from "./ui";
import { useBodyScrollLock, useEscape } from "../hooks";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function useEnter(open: boolean): boolean {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);
  return entered;
}

function useDialogFocus(panelRef: {current: HTMLDivElement | null}, open: boolean) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    if (!panel) return;
    const selector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]';
    (panel.querySelector<HTMLElement>(selector) ?? panel).focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const elements = [...panel.querySelectorAll<HTMLElement>(selector)].filter(el => el.getClientRects().length > 0);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) {event.preventDefault(); panel.focus(); return;}
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {event.preventDefault(); last.focus();}
      if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
    };
    panel.addEventListener("keydown", onKey);
    return () => {panel.removeEventListener("keydown", onKey); if (previous?.isConnected) previous.focus();};
  }, [open, panelRef]);
}

/* -------------------------------------------------------------------- Modal */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  labelledById,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  labelledById?: string;
}) {
  const entered = useEnter(open);
  const panelRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(open);
  useEscape(onClose, open);

  useDialogFocus(panelRef, open);

  if (!open) return null;

  return createPortal(
    <>
      <div className={cx("scrim", entered && "is-open")} onClick={onClose} aria-hidden="true" />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 56,
          display: "grid",
          placeItems: "center",
          padding: 12,
          pointerEvents: "none",
        }}
      >
        <div
          ref={panelRef}
          className={cx("modal", entered && "is-open")}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledById}
          aria-label={labelledById ? undefined : title}
          tabIndex={-1}
          style={{ pointerEvents: "auto", maxHeight: "92dvh", overflowY: "auto" }}
        >
          <div className="mform">
            <header className="mform__head">
              <div>
                <h2 className="mform__title" id={labelledById}>
                  {title}
                </h2>
                {subtitle ? <p className="mform__sub">{subtitle}</p> : null}
              </div>
              <IconButton label="Close" ghost size="sm" onClick={onClose}>
                <X className="ico" />
              </IconButton>
            </header>
            {children}
            {footer ? <footer className="mform__foot">{footer}</footer> : null}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

/* ------------------------------------------------------------------- Drawer */

export function Drawer({
  open,
  onClose,
  label,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const entered = useEnter(open);
  const panelRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(open);
  useEscape(onClose, open);

  useDialogFocus(panelRef, open);

  if (!open) return null;

  return createPortal(
    <>
      <div className={cx("scrim", entered && "is-open")} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={cx("drawer", className, entered && "is-open")}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
      >
        <div className="drawer__inner">
          <div className="drawer__close">
            <IconButton label="Close" ghost size="sm" onClick={onClose}>
              <X className="ico" />
            </IconButton>
          </div>
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}

/* ----------------------------------------------------------- ConfirmDialog */

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "accent" | "primary";
  onConfirm: () => void;
  onClose: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && cancelRef.current) cancelRef.current.focus();
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button ref={cancelRef} type="button" className="btn btn--ghost" onClick={onClose}>
            {cancelLabel}
          </button>
          <Button
            variant={tone === "danger" ? "danger" : tone === "accent" ? "accent" : "primary"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ color: "var(--color-muted)", fontSize: 14, lineHeight: 1.6 }}>{description}</p>
    </Modal>
  );
}

/* ------------------------------------------------------------- PopoverMenu */

export function PopoverMenu({
  trigger,
  label,
  children,
  align = "right",
}: {
  trigger: ReactNode;
  label: string;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <span
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        {trigger}
      </span>
      {open ? (
        <div
          role="menu"
          aria-label={label}
          className="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            [align]: 0,
            zIndex: 70,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {children(close)}
        </div>
      ) : null}
    </div>
  );
}
