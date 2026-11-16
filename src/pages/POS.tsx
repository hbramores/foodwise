import { useMemo, useState } from "react";
import {
  Ban,
  ChefHat,
  Minus,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  ShoppingCart,
  SunMedium,
  Trash2,
  TriangleAlert,
  Undo2,
  X,
} from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, IconButton, Segmented, StatusPill } from "../components/ui";
import { ConfirmDialog } from "../components/overlays";
import { DetailPanel, DetailRows, DetailSection } from "../components/DetailPanel";
import { useStore } from "../data/store";
import { useToast } from "../data/toast";
import { useMediaQuery } from "../hooks";
import {
  MENU_CATEGORIES,
  PAYMENT_METHODS,
  type ClosingLineItem,
  type MenuCategory,
  type PaymentMethod,
  type POSTransaction,
} from "../types";
import {
  availableServings,
  closingDraft,
  forecastFor,
  reconciliationGap,
  requirementFor,
} from "../lib/calc";
import { formatLong, manilaStamp, manilaToday } from "../lib/date";
import { num, peso, parseNumberInput } from "../lib/format";
import { qtyLabel } from "../lib/units";

interface CartLine {
  productId: string;
  qty: number;
}

type View = "sell" | "history";

export function POS() {
  const { data, prepare, checkout, closeDay, reopenDay, setTxnStatus } = useStore();
  const { push } = useToast();
  const today = manilaToday();
  const isNarrow = useMediaQuery("(max-width: 900px)");

  const [view, setView] = useState<View>("sell");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MenuCategory | "all">("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [payment, setPayment] = useState<PaymentMethod>("Cash");
  const [received, setReceived] = useState("");
  const [payOpen, setPayOpen] = useState(false);

  const [prepOpen, setPrepOpen] = useState(false);
  const [prepQty, setPrepQty] = useState<Record<string, string>>({});
  const [prepOverride, setPrepOverride] = useState(false);

  const [closeOpen, setCloseOpen] = useState(false);
  const [closing, setClosing] = useState<Record<string, { discarded: string; carriedOver: string; other: string }>>({});

  const [selected, setSelected] = useState<POSTransaction | null>(null);
  const [voidTarget, setVoidTarget] = useState<POSTransaction | null>(null);

  const day = data.days.find((d) => d.date === today);
  const dayClosed = day?.status === "closed";

  const products = useMemo(() => {
    return data.products
      .filter((p) => p.status === "active")
      .filter((p) => category === "all" || p.category === category)
      .filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));
  }, [data.products, category, query]);

  const cartLines = cart.map((line) => {
    const product = data.products.find((p) => p.id === line.productId);
    return { ...line, product };
  });
  const cartCount = cart.reduce((sum, l) => sum + l.qty, 0);
  const cartTotal = cartLines.reduce((sum, l) => sum + (l.product?.price ?? 0) * l.qty, 0);

  const transactions = useMemo(
    () =>
      [...data.transactions]
        .filter((t) => t.code.toLowerCase().includes(query.trim().toLowerCase()) || query.trim() === "")
        .sort((a, b) => (a.at < b.at ? 1 : -1)),
    [data.transactions, query]
  );

  /* ------------------------------------------------------------ cart ops */

  function addToCart(productId: string) {
    const available = availableServings(data, productId);
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      const nextQty = (existing?.qty ?? 0) + 1;
      if (nextQty > available) return prev;
      return existing
        ? prev.map((l) => (l.productId === productId ? { ...l, qty: nextQty } : l))
        : [...prev, { productId, qty: 1 }];
    });
  }

  function setQty(productId: string, qty: number) {
    const available = availableServings(data, productId);
    const clamped = Math.max(0, Math.min(available, Math.floor(qty)));
    setCart((prev) =>
      clamped === 0
        ? prev.filter((l) => l.productId !== productId)
        : prev.map((l) => (l.productId === productId ? { ...l, qty: clamped } : l))
    );
  }

  /** Opening checkout pre-fills cash with the exact total (one-tap sale). */
  function openCheckout() {
    setReceived(String(cartTotal));
    setPayOpen(true);
  }

  function completeCheckout() {
    const result = checkout({
      cart,
      payment,
      received: payment === "Cash" ? Number(received || 0) : cartTotal,
    });
    if (!result.ok) {
      push(result.error, "danger");
      return;
    }
    push(`Order ${result.txn.code} completed · ${peso(result.txn.total)}`, "good");
    setCart([]);
    setReceived("");
    setPayOpen(false);
    setCartOpen(false);
  }

  /* ----------------------------------------------------- preparation ops */

  const prepRows = data.products
    .filter((p) => p.status === "active")
    .map((product) => ({
      product,
      suggested: forecastFor(data, product.id).recommended,
      value: prepQty[product.id] ?? "",
    }));
  const prepTotal = prepRows.reduce((sum, row) => sum + (parseNumberInput(row.value) ?? 0), 0);
  const prepBlockers = prepRows.flatMap((row) => {
    const qty = parseNumberInput(row.value) ?? 0;
    if (qty <= 0) return [];
    return requirementFor(data, row.product.id, qty).filter((line) => !line.ok);
  });

  function confirmPreparation() {
    const rows = prepRows.filter((row) => (parseNumberInput(row.value) ?? 0) > 0);
    if (!rows.length) {
      push("Enter at least one prepared quantity.", "danger");
      return;
    }
    let applied = 0;
    for (const row of rows) {
      const qty = parseNumberInput(row.value) ?? 0;
      const result = prepare(row.product.id, qty, prepOverride);
      if (!result.ok) {
        push(`${row.product.name}: ${result.error}`, "danger");
        return;
      }
      applied += 1;
    }
    push(`Prepared ${num(prepTotal)} servings across ${applied} dish(es). Availability and inventory updated.`, "good");
    setPrepQty({});
    setPrepOverride(false);
    setPrepOpen(false);
  }

  /* --------------------------------------------------------- closing ops */

  const draft = closingDraft(data, today);
  const closeRows: ClosingLineItem[] = draft.map((line) => {
    const entry = closing[line.productId];
    return {
      productId: line.productId,
      opening: line.opening,
      prepared: line.prepared,
      sold: line.sold,
      remaining: line.remaining,
      discarded: entry ? Math.max(0, Math.floor(parseNumberInput(entry.discarded) ?? 0)) : line.discarded,
      carriedOver: entry ? Math.max(0, Math.floor(parseNumberInput(entry.carriedOver) ?? 0)) : line.carriedOver,
      other: entry ? Math.max(0, Math.floor(parseNumberInput(entry.other) ?? 0)) : line.other,
    };
  });
  const closeGaps = closeRows.filter((line) => Math.abs(reconciliationGap(line)) > 0.0001);

  function confirmClosing() {
    const result = closeDay(today, closeRows);
    if (!result.ok) {
      push(result.error ?? "Could not close the day.", "danger");
      return;
    }
    push(`Operating day closed. ${num(closeRows.reduce((s, l) => s + l.discarded, 0))} serving(s) recorded as discarded.`, "good");
    setCloseOpen(false);
    setClosing({});
  }

  /* ------------------------------------------------------------- render */

  return (
    <div className="stack">
      <header className="head">
        <div className="head__lead">
          <h1 className="head__title">POS Selling</h1>
          <p className="head__sub">
            {formatLong(today)} · prepare food, sell servings and close the operating day.
          </p>
        </div>
        <div className="head__actions">
          <Segmented
            value={view}
            options={[
              { value: "sell" as View, label: "Selling" },
              { value: "history" as View, label: "Sales History" },
            ]}
            onChange={setView}
            ariaLabel="POS view"
          />
          <Button variant="accent" icon={<ChefHat className="ico" />} onClick={() => setPrepOpen(true)}>
            Add Prepared Food
          </Button>
          <Button
            variant={dayClosed ? "soft" : "ghost"}
            icon={<SunMedium className="ico" />}
            onClick={() => (dayClosed ? reopenDay(today) : setCloseOpen(true))}
          >
            {dayClosed ? "Reopen Day" : "Close Day"}
          </Button>
        </div>
      </header>

      {dayClosed ? (
        <div className="banner banner--info">
          <SunMedium className="ico" />
          <div>
            <b>Today is closed and reconciled.</b>
            <p>The figures below include the closing record. Reopen the day to keep selling.</p>
          </div>
        </div>
      ) : null}

      {view === "sell" ? (
        <div className={`poslayout${isNarrow ? " poslayout--narrow" : ""}`}>
          <section className="stack">
            <div className="toolbar">
              <label className="search">
                <Search className="ico" />
                <input
                  placeholder="Search dishes"
                  aria-label="Search dishes"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="pillrow" role="group" aria-label="Filter by category">
                <button
                  type="button"
                  className={`filter-pill${category === "all" ? " is-on" : ""}`}
                  aria-pressed={category === "all"}
                  onClick={() => setCategory("all")}
                >
                  All
                </button>
                {MENU_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`filter-pill${category === c ? " is-on" : ""}`}
                    aria-pressed={category === c}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {products.length ? (
              <div className="posgrid">
                {products.map((product) => {
                  const available = availableServings(data, product.id);
                  const soldOut = available <= 0;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      className={`poscard${soldOut ? " is-soldout" : ""}`}
                      disabled={soldOut}
                      onClick={() => addToCart(product.id)}
                    >
                      <span className="poscard__media">
                        {product.image ? <img src={product.image} alt="" loading="lazy" /> : <span className="poscard__ph">{product.name.slice(0, 1)}</span>}
                      </span>
                      <span className="poscard__name">{product.name}</span>
                      <span className="poscard__meta">
                        <span>{product.category}</span>
                        <b>{peso(product.price)}</b>
                      </span>
                      <span className={`poscard__avail${soldOut ? " is-out" : available <= 5 ? " is-low" : ""}`}>
                        {soldOut ? "Sold Out" : `${num(available)} available`}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <Card>
                <EmptyState
                  icon={<ShoppingCart className="ico" />}
                  title="No dishes match"
                  description="Try another search or category."
                />
              </Card>
            )}
          </section>

          {!isNarrow ? (
            <aside className="cartcol">
              <CartPanel
                lines={cartLines}
                total={cartTotal}
                count={cartCount}
                onQty={setQty}
                onClear={() => setCart([])}
                onCheckout={openCheckout}
              />
            </aside>
          ) : null}
        </div>
      ) : (
        <Card title="Sales History" icon={<Receipt className="ico" />} sub={`${transactions.length} transaction(s) recorded`}>
          <div className="toolbar">
            <label className="search">
              <Search className="ico" />
              <input
                placeholder="Search receipt number"
                aria-label="Search receipts"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          {transactions.length ? (
            <div className="tablewrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Receipt</th>
                    <th scope="col">Date &amp; time</th>
                    <th scope="col">Items</th>
                    <th scope="col">Total</th>
                    <th scope="col">Payment</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr
                      key={txn.id}
                      className="table__row"
                      tabIndex={0}
                      role="button"
                      aria-label={`Open receipt ${txn.code}`}
                      onClick={() => setSelected(txn)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(txn);
                        }
                      }}
                    >
                      <td><b>{txn.code}</b></td>
                      <td>{manilaStamp(txn.at)}</td>
                      <td>{txn.items.reduce((s, l) => s + l.qty, 0)} serving(s)</td>
                      <td>{peso(txn.total)}</td>
                      <td>{txn.payment}</td>
                      <td>
                        <StatusPill tone={txn.status === "completed" ? "good" : txn.status === "voided" ? "danger" : "amber"}>
                          {txn.status}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={<Receipt className="ico" />} title="No transactions yet" description="Completed sales appear here." />
          )}
        </Card>
      )}

      {/* Mobile sticky cart bar */}
      {isNarrow && view === "sell" ? (
        <div className="cartbar">
          <span>
            <b>{num(cartCount)}</b> item(s) · {peso(cartTotal)}
          </span>
          <Button variant="primary" onClick={() => setCartOpen(true)} disabled={!cart.length}>
            View Cart
          </Button>
        </div>
      ) : null}

      {isNarrow ? (
        <DetailPanel open={cartOpen} onClose={() => setCartOpen(false)} eyebrow="Order" title="Cart" subtitle={`${num(cartCount)} item(s)`}>
          <CartPanel
            lines={cartLines}
            total={cartTotal}
            count={cartCount}
            onQty={setQty}
            onClear={() => setCart([])}
            onCheckout={() => {
              setCartOpen(false);
              openCheckout();
            }}
          />
        </DetailPanel>
      ) : null}

      {/* Checkout */}
      <DetailPanel
        open={payOpen}
        onClose={() => setPayOpen(false)}
        eyebrow="Checkout"
        title="Confirm Payment"
        subtitle={`${num(cartCount)} item(s) · ${peso(cartTotal)}`}
        footer={
          <div className="dpanel__actions">
            <Button variant="ghost" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={completeCheckout} disabled={!cart.length}>Confirm Payment</Button>
          </div>
        }
      >
        <DetailSection title="Order summary">
          <ul className="lines">
            {cartLines.map((line) => (
              <li key={line.productId}>
                <span>{line.qty} × {line.product?.name}</span>
                <b>{peso((line.product?.price ?? 0) * line.qty)}</b>
              </li>
            ))}
          </ul>
          <div className="lines lines--total">
            <span>Total</span>
            <b>{peso(cartTotal)}</b>
          </div>
        </DetailSection>

        <DetailSection title="Payment">
          <div className="paymethods" role="group" aria-label="Payment method">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                className={`paymethod${payment === m ? " is-on" : ""}`}
                aria-pressed={payment === m}
                onClick={() => setPayment(m)}
              >
                {m}
              </button>
            ))}
          </div>
          {payment === "Cash" ? (
            <>
              <Field label="Amount received" htmlFor="pos-received">
                <input
                  id="pos-received"
                  className="input"
                  inputMode="decimal"
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                  placeholder={String(cartTotal)}
                />
              </Field>
              <div className="lines lines--total">
                <span>Change due</span>
                <b>{peso(Math.max(0, Number(received || 0) - cartTotal))}</b>
              </div>
            </>
          ) : (
            <p className="note">Simulated {payment} payment — no real processing.</p>
          )}
        </DetailSection>
      </DetailPanel>

      {/* Add prepared food */}
      <DetailPanel
        open={prepOpen}
        onClose={() => setPrepOpen(false)}
        size="wide"
        eyebrow="Preparation"
        title="Add Prepared Food"
        subtitle="Forecast suggestions load automatically. Ingredient stock is deducted when you confirm."
        footer={
          <div className="dpanel__actions">
            <span className="dpanel__total">{num(prepTotal)} serving(s) to prepare</span>
            <Button variant="ghost" onClick={() => setPrepOpen(false)}>Cancel</Button>
            <Button onClick={confirmPreparation}>Confirm Preparation</Button>
          </div>
        }
      >
        {prepBlockers.length ? (
          <div className="banner banner--warn">
            <TriangleAlert className="ico" />
            <div>
              <b>Not enough ingredients for {prepBlockers.length} item(s)</b>
              <p>
                {prepBlockers
                  .slice(0, 5)
                  .map((b) => `${b.ingredient.name} needs ${qtyLabel(b.qty)} ${b.ingredient.unit}, ${qtyLabel(b.available)} available`)
                  .join(" · ")}
              </p>
              <label className="checkrow">
                <input type="checkbox" checked={prepOverride} onChange={(e) => setPrepOverride(e.target.checked)} />
                Override and prepare anyway (prototype only)
              </label>
            </div>
          </div>
        ) : null}

        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Food item</th>
                <th scope="col">Available now</th>
                <th scope="col">Suggested</th>
                <th scope="col">Prepared</th>
              </tr>
            </thead>
            <tbody>
              {prepRows.map((row) => (
                <tr key={row.product.id}>
                  <td>
                    <span className="dishcell">
                      {row.product.image ? <img src={row.product.image} alt="" /> : null}
                      <span>
                        <b>{row.product.name}</b>
                        <small>{row.product.category}</small>
                      </span>
                    </span>
                  </td>
                  <td>{num(availableServings(data, row.product.id))}</td>
                  <td>
                    {row.suggested === null ? <span className="muted">—</span> : <Badge tone="sage">{num(row.suggested)}</Badge>}
                  </td>
                  <td>
                    <input
                      className="input input--num"
                      inputMode="numeric"
                      aria-label={`Prepared servings for ${row.product.name}`}
                      value={row.value}
                      placeholder="0"
                      onChange={(e) =>
                        setPrepQty((prev) => ({ ...prev, [row.product.id]: e.target.value }))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DetailPanel>

      {/* Close day */}
      <DetailPanel
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        size="wide"
        eyebrow="End of day"
        title="Close Operating Day"
        subtitle={formatLong(today)}
        footer={
          <div className="dpanel__actions">
            <span className={`dpanel__total${closeGaps.length ? " is-warn" : ""}`}>
              {closeGaps.length ? `${closeGaps.length} row(s) not reconciled` : "All rows reconciled"}
            </span>
            <Button variant="ghost" onClick={() => setCloseOpen(false)}>Cancel</Button>
            <Button onClick={confirmClosing} disabled={closeGaps.length > 0}>Close Day</Button>
          </div>
        }
      >
        <p className="note">
          Remaining = discarded + carried over + other accounted-for. Carried-over servings stay
          sellable tomorrow; nothing is discarded automatically.
        </p>
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Dish</th>
                <th scope="col">Opening</th>
                <th scope="col">Prepared</th>
                <th scope="col">Sold</th>
                <th scope="col">Remaining</th>
                <th scope="col">Discarded</th>
                <th scope="col">Carried over</th>
                <th scope="col">Other</th>
                <th scope="col">Gap</th>
              </tr>
            </thead>
            <tbody>
              {draft.map((row) => {
                const line = closeRows.find((l) => l.productId === row.productId) as ClosingLineItem;
                const gap = reconciliationGap(line);
                const entry = closing[row.productId] ?? { discarded: "", carriedOver: "", other: "" };
                const setEntry = (patch: Partial<typeof entry>) =>
                  setClosing((prev) => ({ ...prev, [row.productId]: { ...entry, ...patch } }));
                return (
                  <tr key={row.productId}>
                    <td>
                      <b>{row.name}</b>
                      <small className="muted"> {row.category}</small>
                    </td>
                    <td>{num(row.opening)}</td>
                    <td>{num(row.prepared)}</td>
                    <td>{num(row.sold)}</td>
                    <td><b>{num(row.remaining)}</b></td>
                    <td>
                      <input className="input input--num" inputMode="numeric" aria-label={`Discarded ${row.name}`} value={entry.discarded} placeholder="0" onChange={(e) => setEntry({ discarded: e.target.value })} />
                    </td>
                    <td>
                      <input className="input input--num" inputMode="numeric" aria-label={`Carried over ${row.name}`} value={entry.carriedOver} placeholder="0" onChange={(e) => setEntry({ carriedOver: e.target.value })} />
                    </td>
                    <td>
                      <input className="input input--num" inputMode="numeric" aria-label={`Other ${row.name}`} value={entry.other} placeholder="0" onChange={(e) => setEntry({ other: e.target.value })} />
                    </td>
                    <td>{gap === 0 ? <StatusPill tone="good">OK</StatusPill> : <StatusPill tone="danger">{qtyLabel(gap)}</StatusPill>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="dpanel__actions dpanel__actions--inline">
          {draft.map((row) => (
            <button
              key={row.productId}
              type="button"
              className="linky"
              onClick={() =>
                setClosing((prev) => ({
                  ...prev,
                  [row.productId]: {
                    discarded: String(row.remaining),
                    carriedOver: "0",
                    other: "0",
                  },
                }))
              }
            >
              Discard all remaining · {row.name}
            </button>
          ))}
        </div>
      </DetailPanel>

      {/* Transaction details */}
      <DetailPanel
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        eyebrow={selected ? selected.code : ""}
        title="Transaction Details"
        subtitle={selected ? manilaStamp(selected.at) : ""}
        footer={
          selected ? (
            <div className="dpanel__actions">
              {selected.status === "completed" ? (
                <>
                  <Button variant="danger" icon={<Ban className="ico" />} onClick={() => setVoidTarget(selected)}>
                    Void
                  </Button>
                  <Button
                    variant="soft"
                    icon={<Undo2 className="ico" />}
                    onClick={() => {
                      setTxnStatus(selected.id, "refunded", "Refunded at the counter");
                      setSelected(null);
                      push("Transaction marked as refunded.", "good");
                    }}
                  >
                    Refund
                  </Button>
                </>
              ) : (
                <Button
                  variant="soft"
                  icon={<RotateCcw className="ico" />}
                  onClick={() => {
                    setTxnStatus(selected.id, "completed", "");
                    setSelected(null);
                    push("Transaction restored.", "good");
                  }}
                >
                  Restore
                </Button>
              )}
            </div>
          ) : null
        }
      >
        {selected ? (
          <>
            <DetailSection title="Items">
              <ul className="lines">
                {selected.items.map((line) => (
                  <li key={line.productId}>
                    <span>{line.qty} × {line.name} <span className="muted">({peso(line.price)})</span></span>
                    <b>{peso(line.price * line.qty)}</b>
                  </li>
                ))}
              </ul>
              <div className="lines lines--total">
                <span>Total</span>
                <b>{peso(selected.total)}</b>
              </div>
            </DetailSection>
            <DetailRows
              rows={[
                { label: "Payment", value: selected.payment },
                { label: "Received", value: peso(selected.received) },
                { label: "Change", value: peso(selected.change) },
                { label: "Status", value: <StatusPill tone={selected.status === "completed" ? "good" : selected.status === "voided" ? "danger" : "amber"}>{selected.status}</StatusPill> },
                ...(selected.note ? [{ label: "Note", value: selected.note }] : []),
              ]}
            />
          </>
        ) : null}
      </DetailPanel>

      <ConfirmDialog
        open={Boolean(voidTarget)}
        title="Void this transaction?"
        description="The receipt stays in history and net sales are adjusted. Prepared servings become available again if they are still sellable."
        confirmLabel="Void Transaction"
        onConfirm={() => {
          if (voidTarget) {
            setTxnStatus(voidTarget.id, "voided", "Voided at the counter");
            push("Transaction voided.", "good");
          }
          setVoidTarget(null);
          setSelected(null);
        }}
        onClose={() => setVoidTarget(null)}
      />
    </div>
  );
}

function CartPanel({
  lines,
  total,
  count,
  onQty,
  onClear,
  onCheckout,
}: {
  lines: Array<{ productId: string; qty: number; product?: { name: string; price: number; image: string | null } }>;
  total: number;
  count: number;
  onQty: (productId: string, qty: number) => void;
  onClear: () => void;
  onCheckout: () => void;
}) {
  return (
    <Card
      title="Cart"
      icon={<ShoppingCart className="ico" />}
      tools={
        lines.length ? (
          <IconButton label="Clear cart" ghost size="sm" onClick={onClear}>
            <Trash2 className="ico" />
          </IconButton>
        ) : null
      }
      sub={`${num(count)} item(s)`}
    >
      {lines.length ? (
        <>
          <ul className="cartlines">
            {lines.map((line) => (
              <li key={line.productId}>
                <span className="cartlines__media">
                  {line.product?.image ? <img src={line.product.image} alt="" /> : null}
                </span>
                <span className="cartlines__body">
                  <b>{line.product?.name}</b>
                  <small>{peso(line.product?.price ?? 0)} each</small>
                </span>
                <span className="stepper">
                  <button type="button" aria-label="Decrease" onClick={() => onQty(line.productId, line.qty - 1)}>
                    <Minus className="ico" />
                  </button>
                  <b>{line.qty}</b>
                  <button type="button" aria-label="Increase" onClick={() => onQty(line.productId, line.qty + 1)}>
                    <Plus className="ico" />
                  </button>
                </span>
                <span className="cartlines__price">{peso((line.product?.price ?? 0) * line.qty)}</span>
                <IconButton label={`Remove ${line.product?.name}`} ghost size="sm" onClick={() => onQty(line.productId, 0)}>
                  <X className="ico" />
                </IconButton>
              </li>
            ))}
          </ul>
          <div className="lines lines--total">
            <span>Total</span>
            <b>{peso(total)}</b>
          </div>
          <Button block onClick={onCheckout}>Confirm Payment</Button>
        </>
      ) : (
        <p className="note">Tap a dish to add it to the order.</p>
      )}
    </Card>
  );
}
