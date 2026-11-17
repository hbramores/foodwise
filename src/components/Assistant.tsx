import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChevronDown, Send, X } from "lucide-react";
import { useStore } from "../data/store";
import { useEscape, useMediaQuery, type RouteKey } from "../hooks";
import mascotUrl from "../logo/foodwise-mark.png";
import type { AppData } from "../types";
import {
  closingDraft,
  closingFor,
  dayFor,
  forecastFor,
  kpis,
  periodRange,
  productFlow,
  stockState,
  wasteSummary,
} from "../lib/calc";
import { formatLong, manilaToday } from "../lib/date";
import { num, percent } from "../lib/format";
import { qtyLabel } from "../lib/units";

type TopicId = "servings" | "waste" | "stock" | "wrap" | "overproduction";

const QUICK_QUESTIONS: Array<{ id: TopicId; label: string }> = [
  { id: "servings", label: "How are recommended servings calculated?" },
  { id: "waste", label: "Why is my food waste high?" },
  { id: "stock", label: "How do I manage ingredient stock?" },
  { id: "wrap", label: "How does Wrap Up work?" },
  { id: "overproduction", label: "How can I reduce overproduction?" },
];

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

/** The supplied FoodWise chef-mouse mark, used by the dock and chat header. */
export function ChefMouse({ size = 72, className }: { size?: number; className?: string }) {
  return (
    <img
      className={`assistant-mouse${className ? ` ${className}` : ""}`}
      src={mascotUrl}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}

function matchTopic(raw: string): TopicId | null {
  const text = raw.toLowerCase();
  if (/servings|recommend|forecast|average|prepare/.test(text)) return "servings";
  if (/waste|discard/.test(text)) return "waste";
  if (/stock|ingredient|inventory|low|out of/.test(text)) return "stock";
  if (/wrap|close the day|reconcile|end of day/.test(text)) return "wrap";
  if (/overproduc|too much|excess|reduce|waste/.test(text)) return "overproduction";
  return null;
}

/** Rule-based answers computed from the workspace records — no external service. */
function answerFor(topic: TopicId, data: AppData): string {
  const today = manilaToday();
  const range = periodRange("month", today);

  if (topic === "servings") {
    const rows = data.products
      .filter((p) => p.status === "active")
      .map((p) => ({ product: p, forecast: forecastFor(data, p.id) }))
      .filter((row) => row.forecast.validDays > 0)
      .sort((a, b) => b.forecast.validDays - a.forecast.validDays);
    if (!rows.length) {
      return "There are no recorded sales yet, so there is nothing to average. Record a sale in POS Selling — completed sales become the daily history, and the recommended servings appear here automatically.";
    }
    const top = rows[0];
    const formula = `${top.forecast.values.join(" + ")} = ${num(top.forecast.total)} sold over ${top.forecast.validDays} recorded day${top.forecast.validDays === 1 ? "" : "s"}, divided and rounded to ${top.forecast.recommended} servings`;
    const others = rows
      .slice(1, 4)
      .map((row) => `${row.product.name}: ${row.forecast.recommended} servings`)
      .join(" · ");
    return `Recommended servings = recorded POS sales ÷ recorded days, rounded to the nearest whole serving. For ${top.product.name}: ${formula}.${others ? ` Other dishes this month — ${others}.` : ""}`;
  }

  if (topic === "waste") {
    const waste = wasteSummary(data, range);
    if (!waste.closedDays) {
      return "FoodWise only counts waste from completed Wrap Up records, and no day has been wrapped up this month yet. Wrap up the day in POS Selling and this answer will use your own numbers instead of an estimate.";
    }
    const top = productFlow(data, range)
      .filter((row) => row.discarded > 0)
      .sort((a, b) => b.discarded - a.discarded)
      .slice(0, 3);
    const detail = top.length
      ? ` Most discarded: ${top.map((row) => `${row.name} (${num(row.discarded)})`).join(", ")}.`
      : "";
    const rate = waste.rate === null ? "—" : percent(waste.rate);
    const heavy = waste.rate !== null && waste.rate > 0.1;
    return `This month you discarded ${num(waste.discarded)} serving(s) across ${waste.closedDays} closed day(s) — ${rate} of ${num(waste.prepared)} prepared.${detail} Discarded is calculated at Wrap Up as Prepared − Sold, so it reflects your records, not an estimate.${heavy ? " That is above one tenth of what you prepared — preparing closer to the recommended servings would cut it." : ""}`;
  }

  if (topic === "stock") {
    const stock = stockState(data);
    if (!stock.active.length) {
      return "There are no active ingredients yet. Add ingredients in Inventory, then FoodWise can track stock and warn you before the next preparation.";
    }
    const out = stock.out.length
      ? ` Out of stock: ${stock.out.map((i) => `${i.name} (${qtyLabel(i.stock)} ${i.unit})`).join(", ")}.`
      : "";
    const low = stock.low.length
      ? ` Running low: ${stock.low.slice(0, 5).map((i) => `${i.name} (${qtyLabel(i.stock)} ${i.unit})`).join(", ")}${stock.low.length > 5 ? ` +${stock.low.length - 5} more` : ""}.`
      : "";
    return `${stock.active.length} active ingredients — ${stock.out.length} out of stock, ${stock.low.length} running low, ${stock.normal.length} healthy.${out}${low} Ingredients are deducted when food is prepared, not when it is sold.`;
  }

  if (topic === "wrap") {
    const closing = closingFor(data, today);
    if (closing) {
      const discarded = closing.lines.reduce((sum, line) => sum + line.discarded, 0);
      return `Today (${formatLong(today)}) is already wrapped up, with ${num(discarded)} serving(s) recorded as discarded. If a record needs fixing, reopen the day from POS Selling before changing anything.`;
    }
    if (dayFor(data, today)?.status === "closed") {
      return `Today (${formatLong(today)}) is closed. Reopen it from POS Selling if you need to record more servings.`;
    }
    const draft = closingDraft(data, today);
    const remaining = draft.reduce((sum, line) => sum + line.remaining, 0);
    if (!remaining) {
      return "Nothing is waiting to be reconciled today — no servings have been prepared yet. Prepare servings in POS Selling first, then wrap up the day.";
    }
    return `You still have ${num(remaining)} serving(s) to reconcile today. In POS Selling open Wrap Up: confirm what was sold, then record what is carried over, shared, or discarded. Discarded is calculated for you as Prepared − Sold.`;
  }

  const summary = kpis(data, range);
  if (!summary.prepared) {
    return "No preparation batches are recorded this month yet. Once you prepare food, FoodWise can compare what you prepared against what you sold and point out the dishes that are running over.";
  }
  const flow = productFlow(data, range).filter((row) => row.prepared > 0);
  const weakest = [...flow].sort((a, b) => (a.sellThrough ?? 1) - (b.sellThrough ?? 1))[0];
  const share = summary.sold / summary.prepared;
  const weakestText = weakest
    ? ` The widest gap is ${weakest.name}: ${num(weakest.prepared)} prepared, ${num(weakest.sold)} sold${weakest.sellThrough === null ? "" : ` (${percent(weakest.sellThrough)} sell-through)`}.`
    : "";
  return `This month you prepared ${num(summary.prepared)} servings and sold ${num(summary.sold)} — ${percent(share)} sell-through.${weakestText} Prepare against the recommended servings in Forecasting instead of a fixed guess: it already averages your last five recorded days, so fewer servings end up unsold.`;
}

/** Floating FoodWise chef-mouse assistant (demo mode, rule-based answers). */
export function Assistant({ route }: { route: RouteKey }) {
  const { data } = useStore();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      text: "Hi! I'm your FoodWise Assistant. I can help you understand sales forecasts, food preparation, inventory, and food waste. What would you like to know?",
    },
  ]);
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLButtonElement>(null);
  const isNarrow = useMediaQuery("(max-width: 720px)");

  useEscape(() => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [messages, open]);

  function close() {
    setOpen(false);
    window.setTimeout(() => mascotRef.current?.focus(), 0);
  }

  function send(topic: TopicId, userText: string) {
    const id = nextId.current++;
    setMessages((prev) => [
      ...prev,
      { id, role: "user", text: userText },
      { id: id + 1, role: "assistant", text: answerFor(topic, data) },
    ]);
    nextId.current = id + 2;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const topic = matchTopic(text);
    if (topic) {
      send(topic, text);
      return;
    }
    const id = nextId.current++;
    setMessages((prev) => [
      ...prev,
      { id, role: "user", text },
      {
        id: id + 1,
        role: "assistant",
        text: "I can answer these five questions about your workspace: recommended servings, food waste, ingredient stock, wrapping up the day, and reducing overproduction. Pick one below and I will use your records.",
      },
    ]);
    nextId.current = id + 2;
  }

  return (
    <div className={`assistant${route === "pos" ? " assistant--pos" : ""}`}>
      {open ? (
        <section className="assistant__panel" role="dialog" aria-label="FoodWise Assistant">
          <header className="assistant__head">
            <span className="assistant__avatar">
              <ChefMouse size={46} />
            </span>
            <span className="assistant__titles">
              <b>FoodWise Assistant</b>
              <small>Your restaurant operations guide</small>
              <span className="assistant__mode">Demo Mode</span>
            </span>
            <span className="assistant__actions">
              <button
                type="button"
                className="assistant__icon"
                aria-label="Minimize assistant"
                onClick={close}
              >
                <ChevronDown className="ico" />
              </button>
              <button
                type="button"
                className="assistant__icon"
                aria-label="Close assistant"
                onClick={close}
              >
                <X className="ico" />
              </button>
            </span>
          </header>

          <div className="assistant__messages" ref={listRef} aria-live="polite">
            {messages.map((message) => (
              <p key={message.id} className={`assistant__msg assistant__msg--${message.role}`}>
                {message.text}
              </p>
            ))}
          </div>

          <div className="assistant__quick" role="group" aria-label="Quick questions">
            {QUICK_QUESTIONS.map((question) => (
              <button
                key={question.id}
                type="button"
                className="assistant__chip"
                onClick={() => send(question.id, question.label)}
              >
                {question.label}
              </button>
            ))}
          </div>

          <form className="assistant__composer" onSubmit={submit}>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about servings, waste, stock…"
              aria-label="Ask the FoodWise assistant"
            />
            <button type="submit" className="assistant__send" aria-label="Send question" disabled={!draft.trim()}>
              <Send className="ico" />
            </button>
          </form>

          <p className="assistant__disclaimer">
            Demo Mode · rule-based answers from your records, not a live AI model.
          </p>
        </section>
      ) : null}

      {hidden ? (
        <button type="button" className="assistant__restore" onClick={() => setHidden(false)}>
          Show FoodWise Assistant
        </button>
      ) : isNarrow && open ? null : (
        <div className="assistant__dock">
          <button
            type="button"
            className="assistant__hide"
            aria-label="Hide assistant"
            title="Hide assistant"
            onClick={() => setHidden(true)}
          >
            <X className="ico" />
          </button>
          <button
            ref={mascotRef}
            type="button"
            className="assistant__mascot"
            aria-expanded={open}
            aria-label={open ? "Close FoodWise Assistant" : "Open FoodWise Assistant"}
            onClick={() => (open ? close() : setOpen(true))}
          >
            <ChefMouse size={78} />
            <span className="assistant__badge">Ask</span>
          </button>
        </div>
      )}
    </div>
  );
}
