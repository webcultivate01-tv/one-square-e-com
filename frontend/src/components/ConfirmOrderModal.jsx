import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { FiCheck, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import { serverUrl } from "../App.jsx";
import useDebounced from "../hooks/useDebounced.js";
import Invoice from "./Invoice.jsx";
import { Modal, Spinner, formatMoney } from "./ui.jsx";

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
];

const STEPS = ["Order", "Payment", "Bill"];

const emptyItem = () => ({ key: Math.random().toString(36).slice(2), product: null, name: "", quantity: 1, price: "" });

/**
 * Three-step flow once the customer says "yes, I want to buy":
 * 1. confirm the products and prices, 2. choose advance / full payment, 3. bill.
 */
const ConfirmOrderModal = ({ open, onClose, kind, lead, onConfirmed }) => {
  const [step, setStep] = useState(0);
  const [items, setItems] = useState([emptyItem()]);
  const [taxPercent, setTaxPercent] = useState("0");
  const [paymentType, setPaymentType] = useState("full");
  const [advance, setAdvance] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState(null);

  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q, 300);
  const [results, setResults] = useState([]);

  // Fresh form each time the modal opens; a Buy Now request already names the product.
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setOrder(null);
    setPaymentType("full");
    setAdvance("");
    setMethod("cash");
    setReference("");
    setTaxPercent("0");
    setQ("");
    const first = emptyItem();
    if (kind === "order_request") {
      first.name = lead.productName;
      first.quantity = lead.quantity || 1;
      first.product = lead.product?._id || null;
    }
    setItems([first]);
    // Keyed on the lead's id: the parent swaps in an updated lead after confirming, which must not reset the wizard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind, lead?._id]);

  useEffect(() => {
    if (!open || !debouncedQ.trim()) {
      setResults([]);
      return;
    }
    let live = true;
    axios
      .get(serverUrl + "/api/product/getpublished", { params: { q: debouncedQ, limit: 6 }, withCredentials: true })
      .then(({ data }) => live && setResults(data.products || []))
      .catch(() => live && setResults([]));
    return () => {
      live = false;
    };
  }, [debouncedQ, open]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);
    const tax = (subtotal * (Number(taxPercent) || 0)) / 100;
    return { subtotal, tax, total: subtotal + tax };
  }, [items, taxPercent]);

  const setItem = (key, patch) => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const addProduct = (p) => {
    setItems((prev) => {
      const blank = prev.length === 1 && !prev[0].name && !prev[0].price;
      const next = { ...emptyItem(), product: p._id, name: p.name, price: p.price ?? "" };
      return blank ? [next] : [...prev, next];
    });
    setQ("");
    setResults([]);
  };

  const orderError = () => {
    if (items.some((i) => !i.name.trim())) return "Every line needs a product name.";
    if (items.some((i) => !(Number(i.quantity) >= 1))) return "Quantity must be at least 1.";
    if (items.some((i) => !(Number(i.price) >= 0) || i.price === "")) return "Enter a price for every line.";
    if (totals.total <= 0) return "Order total must be greater than zero.";
    const t = Number(taxPercent);
    if (!(t >= 0 && t <= 100)) return "Tax must be between 0 and 100%.";
    return "";
  };

  const paymentError = () => {
    if (paymentType === "advance") {
      const a = Number(advance);
      if (!(a > 0) || a >= totals.total) return "Advance must be more than 0 and less than the total.";
    }
    return "";
  };

  const next = () => {
    const err = orderError();
    if (err) return toast.error(err);
    setStep(1);
  };

  const confirm = async () => {
    const err = orderError() || paymentError();
    if (err) return toast.error(err);
    setBusy(true);
    try {
      const { data } = await axios.post(
        serverUrl + "/api/sales-order/create",
        {
          sourceType: kind,
          sourceId: lead._id,
          items: items.map((i) => ({ product: i.product, name: i.name, quantity: Number(i.quantity), price: Number(i.price) })),
          taxPercent: Number(taxPercent) || 0,
          paymentType,
          advanceAmount: paymentType === "advance" ? Number(advance) : undefined,
          paymentMethod: method,
          paymentReference: reference,
        },
        { withCredentials: true }
      );
      toast.success(data.message);
      setOrder(data.order);
      setStep(2);
      onConfirmed?.(data.order, data.status);
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not confirm the order.");
    } finally {
      setBusy(false);
    }
  };

  const footer =
    step === 0 ? (
      <>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn-primary" onClick={next}>Continue to payment</button>
      </>
    ) : step === 1 ? (
      <>
        <button type="button" className="btn-secondary" onClick={() => setStep(0)} disabled={busy}>Back</button>
        <button type="button" className="btn-primary" onClick={confirm} disabled={busy}>
          {busy ? <Spinner size={14} /> : <FiCheck size={14} />} Confirm order &amp; generate bill
        </button>
      </>
    ) : (
      <button type="button" className="btn-primary" onClick={onClose}>Done</button>
    );

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      size="lg"
      title={step === 2 ? "Order confirmed" : "Confirm order"}
      subtitle={`${lead?.name} · ${lead?.phone}`}
      footer={footer}
    >
      <div className="px-5 pt-4 flex items-center gap-2 text-[12px]">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                i <= step ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
              }`}
            >
              {i + 1}
            </span>
            <span className={i === step ? "font-medium text-slate-800" : "text-slate-400"}>{s}</span>
            {i < STEPS.length - 1 && <span className="w-6 h-px bg-slate-200" />}
          </div>
        ))}
      </div>

      <div className="p-5">
        {step === 0 && (
          <div className="space-y-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input className="input pl-9" placeholder="Search catalog to add a product..." value={q} onChange={(e) => setQ(e.target.value)} />
              {results.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 card divide-y divide-slate-100 shadow-lg max-h-56 overflow-y-auto">
                  {results.map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => addProduct(p)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <span className="text-[13px] text-slate-800 truncate">{p.name}</span>
                      <span className="text-[12px] text-slate-500 shrink-0">{formatMoney(p.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {items.map((i) => (
                <div key={i.key} className="grid grid-cols-[1fr_70px_110px_auto] gap-2 items-center">
                  <input className="input" placeholder="Product" value={i.name} onChange={(e) => setItem(i.key, { name: e.target.value, product: null })} />
                  <input className="input" type="number" min="1" title="Quantity" value={i.quantity} onChange={(e) => setItem(i.key, { quantity: e.target.value })} />
                  <input className="input" type="number" min="0" placeholder="Price" title="Unit price" value={i.price} onChange={(e) => setItem(i.key, { price: e.target.value })} />
                  <button
                    type="button"
                    disabled={items.length === 1}
                    onClick={() => setItems((prev) => prev.filter((x) => x.key !== i.key))}
                    className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center disabled:opacity-30"
                    title="Remove line"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
              <button type="button" className="btn-secondary" onClick={() => setItems((p) => [...p, emptyItem()])}>
                <FiPlus size={14} /> Add line
              </button>
            </div>

            <div className="flex items-end justify-between gap-4 flex-wrap border-t border-slate-100 pt-4">
              <div className="w-32">
                <label className="label">Tax %</label>
                <input className="input" type="number" min="0" max="100" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
              </div>
              <div className="text-right text-[13px] text-slate-600 space-y-0.5">
                <p>Subtotal {formatMoney(totals.subtotal)}</p>
                {totals.tax > 0 && <p>Tax {formatMoney(totals.tax)}</p>}
                <p className="text-[16px] font-semibold text-slate-900">Total {formatMoney(totals.total)}</p>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { value: "advance", title: "Advance payment", hint: "Customer pays part now, the balance stays due." },
                { value: "full", title: "Full payment", hint: `Customer pays the whole ${formatMoney(totals.total)} now.` },
              ].map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setPaymentType(o.value)}
                  className={`text-left rounded-xl border p-4 transition-colors ${
                    paymentType === o.value ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p className="text-[14px] font-semibold text-slate-900">{o.title}</p>
                  <p className="text-[12px] text-slate-500 mt-1">{o.hint}</p>
                </button>
              ))}
            </div>

            {paymentType === "advance" && (
              <div className="max-w-xs">
                <label className="label">Advance amount received</label>
                <input className="input" type="number" min="0" value={advance} onChange={(e) => setAdvance(e.target.value)} placeholder={`Less than ${formatMoney(totals.total)}`} />
                {Number(advance) > 0 && Number(advance) < totals.total && (
                  <p className="text-[12px] text-slate-500 mt-1">Balance due: {formatMoney(totals.total - Number(advance))}</p>
                )}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Payment method</label>
                <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Reference / transaction ID (optional)</label>
                <input className="input" value={reference} maxLength={120} onChange={(e) => setReference(e.target.value)} />
              </div>
            </div>

            <p className="text-[13px] text-slate-600">
              Paying now: <b>{formatMoney(paymentType === "full" ? totals.total : Number(advance) || 0)}</b> of {formatMoney(totals.total)}
            </p>
          </div>
        )}

        {step === 2 && order && <Invoice order={order} />}
      </div>
    </Modal>
  );
};

export default ConfirmOrderModal;
