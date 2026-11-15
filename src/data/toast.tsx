import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, TriangleAlert } from "lucide-react";

type ToastTone = "default" | "good" | "danger";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  push: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const push = useCallback((message: string, tone: ToastTone = "default") => {
    seq.current += 1;
    const id = seq.current;
    setItems((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setItems((current) => current.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="false">
        {items.map((t, i) => (
          <div
            key={t.id}
            className={`toast ${t.tone === "good" ? "toast--good" : ""} ${
              t.tone === "danger" ? "toast--danger" : ""
            }`}
            style={{ bottom: `calc(26px + ${i * 52}px)` }}
            role="status"
          >
            <span className="toast__ico">
              {t.tone === "good" ? (
                <CheckCircle2 className="ico" />
              ) : t.tone === "danger" ? (
                <TriangleAlert className="ico" />
              ) : (
                <Info className="ico" />
              )}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
