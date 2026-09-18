import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiSend } from "react-icons/fi";
import { serverUrl } from "../App.jsx";
import { Modal, Spinner } from "./ui.jsx";

/** "Buy Now" request form — posts to /api/order-request/create, lands in the admin panel as a pending request. */
const EnquiryModal = ({ open, onClose, productId = "", productName = "" }) => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", message: "", quantity: 1 });
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.address.trim()) {
      toast.error("Please fill in your name, email, phone and address.");
      return;
    }
    if (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 1) {
      toast.error("Quantity must be at least 1.");
      return;
    }

    setBusy(true);
    try {
      const { data } = await axios.post(serverUrl + "/api/order-request/create", {
        ...form,
        quantity: Number(form.quantity),
        productId,
        productName,
      });
      toast.success(data.message || "Request received — our team will contact you shortly.");
      setForm({ name: "", email: "", phone: "", address: "", message: "", quantity: 1 });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not send your request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={productName ? `Buy Now — ${productName}` : "Buy Now"}
      subtitle="Share your details and our team will reach out to confirm your order."
      size="sm"
    >
      <form onSubmit={submit} className="p-5 space-y-4">
        <div>
          <label className="label">Full name</label>
          <input className="input" value={form.name} onChange={set("name")} disabled={busy} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={set("email")} disabled={busy} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={set("phone")} disabled={busy} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Quantity</label>
            <input
              type="number"
              min={1}
              step={1}
              className="input"
              value={form.quantity}
              onChange={set("quantity")}
              disabled={busy}
            />
          </div>
        </div>
        <div>
          <label className="label">Delivery address</label>
          <textarea
            className="input min-h-[72px] resize-none"
            value={form.address}
            onChange={set("address")}
            placeholder="House/flat no, street, city, state, PIN code"
            disabled={busy}
          />
        </div>
        <div>
          <label className="label">Message (optional)</label>
          <textarea
            className="input min-h-[72px] resize-none"
            value={form.message}
            onChange={set("message")}
            placeholder={productName ? `Anything we should know about your order of ${productName}...` : "Anything we should know?"}
            disabled={busy}
          />
        </div>
        <button type="submit" className="btn-brand w-full" disabled={busy}>
          {busy ? <Spinner size={15} /> : <FiSend size={14} />}
          {busy ? "Sending..." : "Submit request"}
        </button>
      </form>
    </Modal>
  );
};

export default EnquiryModal;
