import { useRef } from "react";
import { FiPrinter } from "react-icons/fi";
import { formatDate, formatMoney } from "./ui.jsx";

const METHOD_LABEL = { cash: "Cash", upi: "UPI", card: "Card", bank_transfer: "Bank transfer", cheque: "Cheque" };

/** Printable bill for a confirmed sales order. */
const Invoice = ({ order }) => {
  const ref = useRef(null);

  const print = () => {
    const win = window.open("", "_blank", "width=820,height=900");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>${order.invoiceNumber}</title>
      <style>
        body{font-family:Inter,Arial,sans-serif;color:#0f172a;margin:32px;font-size:13px}
        table{width:100%;border-collapse:collapse}
        th,td{padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:left}
        th{font-size:11px;text-transform:uppercase;color:#64748b}
        .r{text-align:right}.muted{color:#64748b}.brand{color:#264796;font-weight:800;letter-spacing:1px;font-size:18px}
        .tot td{border:none;padding:4px 6px}.big{font-weight:700;font-size:15px}
      </style></head><body>${ref.current.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const balance = order.balanceDue > 0;

  return (
    <div>
      <div ref={ref} className="bg-white border border-slate-200 rounded-xl p-6 text-[13px] text-slate-800">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <div>
            <p className="brand text-[#264796] font-extrabold tracking-wider text-lg">ONE SQUARE ASSOCIATES</p>
            <p className="muted text-slate-500 text-[12px] mt-0.5">Tax invoice / bill</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p className="font-semibold">{order.invoiceNumber}</p>
            <p className="muted text-slate-500 text-[12px]">{formatDate(order.createdAt, true)}</p>
          </div>
        </div>

        <div style={{ margin: "18px 0" }}>
          <p className="muted text-slate-500 text-[11px] uppercase">Billed to</p>
          <p className="font-semibold">{order.customer.name}</p>
          {order.customer.phone && <p>{order.customer.phone}</p>}
          {order.customer.email && <p>{order.customer.email}</p>}
          {order.customer.address && <p style={{ whiteSpace: "pre-wrap" }}>{order.customer.address}</p>}
        </div>

        <table className="w-full">
          <thead>
            <tr>
              <th>Item</th>
              <th className="r" style={{ textAlign: "right" }}>Qty</th>
              <th className="r" style={{ textAlign: "right" }}>Price</th>
              <th className="r" style={{ textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i, idx) => (
              <tr key={idx}>
                <td>{i.name}</td>
                <td style={{ textAlign: "right" }}>{i.quantity}</td>
                <td style={{ textAlign: "right" }}>{formatMoney(i.price)}</td>
                <td style={{ textAlign: "right" }}>{formatMoney(i.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="tot" style={{ width: "50%", marginLeft: "auto", marginTop: 12 }}>
          <tbody>
            <tr>
              <td>Subtotal</td>
              <td style={{ textAlign: "right" }}>{formatMoney(order.subtotal)}</td>
            </tr>
            {order.taxPercent > 0 && (
              <tr>
                <td>Tax ({order.taxPercent}%)</td>
                <td style={{ textAlign: "right" }}>{formatMoney(order.tax)}</td>
              </tr>
            )}
            <tr className="big">
              <td className="big">Total</td>
              <td className="big" style={{ textAlign: "right" }}>{formatMoney(order.total)}</td>
            </tr>
            <tr>
              <td>{order.paymentType === "advance" ? "Advance paid" : "Paid in full"}</td>
              <td style={{ textAlign: "right" }}>{formatMoney(order.amountPaid)}</td>
            </tr>
            {balance && (
              <tr className="big">
                <td className="big">Balance due</td>
                <td className="big" style={{ textAlign: "right" }}>{formatMoney(order.balanceDue)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <p className="muted text-slate-500 text-[12px]" style={{ marginTop: 18 }}>
          Payment via {METHOD_LABEL[order.paymentMethod] || order.paymentMethod}
          {order.paymentReference ? ` · Ref ${order.paymentReference}` : ""} · Status:{" "}
          {balance ? "Advance received — order confirmed" : "Paid — order confirmed"}
          {order.createdByName ? ` · Handled by ${order.createdByName}` : ""}
        </p>
      </div>

      <div className="flex justify-end mt-3">
        <button type="button" className="btn-secondary" onClick={print}>
          <FiPrinter size={14} /> Print bill
        </button>
      </div>
    </div>
  );
};

export default Invoice;
