import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { FiArrowLeft, FiCheckCircle, FiFileText, FiMail, FiMapPin, FiPhone, FiSend } from "react-icons/fi";
import { serverUrl } from "../App.jsx";
import { can } from "../redux/userSlice.js";
import Invoice from "./Invoice.jsx";
import { Drawer, Modal, SectionLoader, Spinner, StatusBadge, formatDate } from "./ui.jsx";

const NOTE_TYPES = [
  { value: "call", label: "Call note" },
  { value: "follow_up", label: "Follow-up" },
  { value: "note", label: "General note" },
];

const NOTE_STYLE = {
  call: "bg-blue-50 text-blue-700",
  follow_up: "bg-amber-50 text-amber-700",
  note: "bg-slate-100 text-slate-600",
  system: "bg-emerald-50 text-emerald-700",
};
const NOTE_LABEL = { call: "Call", follow_up: "Follow-up", note: "Note", system: "System" };

/**
 * Full-size view of one lead (a Contact enquiry or a Buy Now request).
 * Staff read the message in large type, log call / follow-up notes, and —
 * once the customer agrees to buy — confirm the order and take payment.
 *
 * With `page`, renders inline as a full page instead of a slide-over drawer.
 *
 * kind: "enquiry" | "order_request"
 */
/** Same content as the drawer, but as a full page body with a back link. */
const PageShell = ({ onClose, title, subtitle, children }) => (
  <div className="space-y-4">
    <button type="button" onClick={onClose} className="btn-secondary">
      <FiArrowLeft size={14} /> Back
    </button>
    <div className="card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {children}
    </div>
  </div>
);

const LeadDetailDrawer = ({ kind, lead, statusOptions, onClose, onChange, page = false }) => {
  const { userData } = useSelector((state) => state.user);
  const [notes, setNotes] = useState([]);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [text, setText] = useState("");
  const [noteType, setNoteType] = useState("call");
  const [followUpAt, setFollowUpAt] = useState("");
  const [saving, setSaving] = useState(false);

  const [statusBusy, setStatusBusy] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [bill, setBill] = useState(null);
  const [billLoading, setBillLoading] = useState(false);

  const base = `${serverUrl}/api/lead/${kind}/${lead?._id}`;
  const statusUrl = kind === "enquiry" ? "/api/contact/status/" : "/api/order-request/status/";
  const dtoKey = kind === "enquiry" ? "enquiry" : "request";
  const canOrder = can(userData, kind === "enquiry" ? "enquiries" : "orders");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${base}/notes`, { withCredentials: true });
      setNotes(data.notes || []);
      setOrder(data.order || null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load the notes.");
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    setText("");
    setFollowUpAt("");
    setNoteType("call");
    if (lead) load();
  }, [lead?._id, load]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lead) return null;
  const Shell = page ? PageShell : Drawer;

  const addNote = async (e) => {
    e.preventDefault();
    if (!text.trim()) return toast.error("Write a note first.");
    setSaving(true);
    try {
      const { data } = await axios.post(
        `${base}/notes`,
        { text, type: noteType, followUpAt: followUpAt || undefined },
        { withCredentials: true }
      );
      setNotes((prev) => [data.note, ...prev]);
      setText("");
      setFollowUpAt("");
      if (data.status) onChange?.({ ...lead, status: data.status });
      toast.success("Note added.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save the note.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status) => {
    setStatusBusy(true);
    try {
      const { data } = await axios.put(serverUrl + statusUrl + lead._id, { status }, { withCredentials: true });
      onChange?.(data[dtoKey]);
      toast.success(data.message || "Status updated.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update the status.");
    } finally {
      setStatusBusy(false);
    }
  };

  const openBill = async () => {
    setBillLoading(true);
    try {
      const { data } = await axios.get(`${serverUrl}/api/sales-order/${order._id}`, { withCredentials: true });
      setBill(data.order);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load the bill.");
    } finally {
      setBillLoading(false);
    }
  };

  // Confirming happens on its own page inside the same portal shell (/admin, /sales or /talecaller).
  const goConfirm = () => {
    const base = "/" + pathname.split("/")[1];
    navigate(kind === "enquiry" ? `${base}/confirm-order/enquiry` : `${base}/orders/${lead._id}/confirm`, { state: { lead } });
  };

  return (
    <>
      <Shell
        {...(page ? {} : { open: true, width: "max-w-3xl" })}
        onClose={onClose}
        title={kind === "enquiry" ? lead.subject : `Buy Now: ${lead.productName}`}
        subtitle={`Received ${formatDate(lead.createdAt, true)}`}
      >
        <div className="p-6 space-y-6">
          {/* customer + status */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1.5">
              <p className="text-xl font-semibold text-slate-900">{lead.name}</p>
              <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-[15px] font-medium text-blue-700 hover:underline">
                <FiPhone size={15} /> {lead.phone}
              </a>
              <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-[13px] text-slate-600 hover:underline">
                <FiMail size={14} /> {lead.email}
              </a>
              {kind === "order_request" && lead.address && (
                <p className="flex items-start gap-2 text-[13px] text-slate-600 whitespace-pre-wrap">
                  <FiMapPin size={14} className="mt-0.5 shrink-0" /> {lead.address}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={lead.status} />
              <select
                className="input !w-auto !py-1.5 !text-[12px]"
                value={lead.status}
                disabled={statusBusy}
                onChange={(e) => changeStatus(e.target.value)}
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* message in big type */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
            {kind === "order_request" && (
              <p className="text-[13px] text-slate-500 mb-2">
                Wants <b className="text-slate-800">{lead.quantity} × {lead.productName}</b>
              </p>
            )}
            {lead.message ? (
              <p className="text-[17px] leading-relaxed text-slate-900 whitespace-pre-wrap">{lead.message}</p>
            ) : (
              <p className="text-[15px] italic text-slate-400">The customer left no message.</p>
            )}
          </div>

          {/* order action */}
          {order ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-emerald-800 text-[14px] font-medium">
                <FiCheckCircle size={17} />
                Order confirmed · {order.invoiceNumber}
                {order.paymentStatus === "advance_paid" && <span className="text-[12px] font-normal">(advance paid)</span>}
              </div>
              <button type="button" className="btn-secondary" onClick={openBill} disabled={billLoading}>
                {billLoading ? <Spinner size={14} /> : <FiFileText size={14} />} View bill
              </button>
            </div>
          ) : (
            canOrder && (
              <div className="rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[13px] text-slate-600">Customer agreed to buy? Confirm the order and record payment.</p>
                <button type="button" className="btn-primary" onClick={goConfirm}>
                  <FiCheckCircle size={14} /> Confirm order
                </button>
              </div>
            )
          )}

          {/* add note */}
          <form onSubmit={addNote} className="space-y-3">
            <h3 className="text-[14px] font-semibold text-slate-900">Add a note after the call</h3>
            <textarea
              className="input min-h-[110px] text-[14px]"
              placeholder="What did the customer say? Next steps, objections, requirements..."
              value={text}
              maxLength={4000}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="label">Type</label>
                <select className="input !w-auto" value={noteType} onChange={(e) => setNoteType(e.target.value)}>
                  {NOTE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Next follow-up (optional)</label>
                <input className="input" type="datetime-local" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary ml-auto" disabled={saving || !text.trim()}>
                {saving ? <Spinner size={14} /> : <FiSend size={14} />} Save note
              </button>
            </div>
          </form>

          {/* history */}
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900 mb-3">Call &amp; follow-up history</h3>
            {loading ? (
              <SectionLoader rows={3} />
            ) : notes.length === 0 ? (
              <p className="text-[13px] text-slate-400 italic">No notes yet.</p>
            ) : (
              <ol className="space-y-3">
                {notes.map((n) => (
                  <li key={n._id} className="rounded-lg border border-slate-200 p-3.5">
                    <div className="flex items-center gap-2 flex-wrap text-[12px] text-slate-500">
                      <span className={`px-2 py-0.5 rounded-md font-medium ${NOTE_STYLE[n.type]}`}>{NOTE_LABEL[n.type]}</span>
                      <span>{n.authorName}</span>
                      <span>· {formatDate(n.createdAt, true)}</span>
                      {n.followUpAt && (
                        <span className="text-amber-700">· Follow up {formatDate(n.followUpAt, true)}</span>
                      )}
                    </div>
                    <p className="text-[14px] text-slate-800 mt-1.5 whitespace-pre-wrap">{n.text}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </Shell>

      <Modal open={!!bill} onClose={() => setBill(null)} title="Bill" subtitle={bill?.invoiceNumber} size="lg">
        <div className="p-5">{bill && <Invoice order={bill} />}</div>
      </Modal>
    </>
  );
};

export default LeadDetailDrawer;
