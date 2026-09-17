import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiSend } from "react-icons/fi";
import { serverUrl } from "../App.jsx";
import { Modal, Spinner } from "./ui.jsx";

/** Product-enquiry form — posts to /api/contact/send, same endpoint as the Contact page. */
const EnquiryModal = ({ open, onClose, productName = "" }) => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill in your name, email and message.");
      return;
    }

    setBusy(true);
    try {
      await axios.post(serverUrl + "/api/contact/send", { ...form, productName });
      toast.success("Enquiry sent — our team will reach out shortly.");
      setForm({ name: "", email: "", phone: "", message: "" });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not send your enquiry.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={productName ? `Enquire about ${productName}` : "Send an enquiry"}
      subtitle="We usually respond within one business day."
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
        <div>
          <label className="label">Message</label>
          <textarea
            className="input min-h-[96px] resize-none"
            value={form.message}
            onChange={set("message")}
            placeholder={productName ? `I'd like more details about ${productName}...` : "How can we help?"}
            disabled={busy}
          />
        </div>
        <button type="submit" className="btn-brand w-full" disabled={busy}>
          {busy ? <Spinner size={15} /> : <FiSend size={14} />}
          {busy ? "Sending..." : "Send enquiry"}
        </button>
      </form>
    </Modal>
  );
};

export default EnquiryModal;
