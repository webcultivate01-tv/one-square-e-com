import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiClock, FiMail, FiMapPin, FiPhone, FiSend } from "react-icons/fi";
import { serverUrl } from "../App.jsx";
import { Spinner } from "../components/ui.jsx";
import { CONTACT_ADDRESS, CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "../utils/site.js";

const INFO = [
  { icon: FiMapPin, title: "Visit us", body: CONTACT_ADDRESS },
  { icon: FiPhone, title: "Call us", body: CONTACT_PHONE_DISPLAY, href: `tel:${CONTACT_PHONE_TEL}` },
  { icon: FiMail, title: "Email us", body: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
  { icon: FiClock, title: "Working hours", body: "Mon – Sat, 10:00 AM – 7:00 PM" },
];

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
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
      const { data } = await axios.post(serverUrl + "/api/contact/send", form);
      toast.success(data.message || "Message sent.");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not send your message.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-12">
        <p className="eyebrow">Get in touch</p>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mt-2">Contact us</h1>
        <p className="text-[14px] text-slate-500 mt-2 max-w-lg mx-auto">
          Questions about a product, a custom order, or just want to say hello? We'd love to hear from you.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-10">
        <div className="lg:col-span-2 space-y-5">
          {INFO.map(({ icon: Icon, title, body, href }) => (
            <div key={title} className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-500 flex items-center justify-center shrink-0">
                <Icon size={17} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-800">{title}</p>
                {href ? (
                  <a href={href} className="text-[13px] text-slate-500 hover:text-brand-500 transition-colors">
                    {body}
                  </a>
                ) : (
                  <p className="text-[13px] text-slate-500">{body}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="lg:col-span-3 card p-6 sm:p-8 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full name</label>
              <input className="input" value={form.name} onChange={set("name")} disabled={busy} />
            </div>
            <div>
              <label className="label">Phone (optional)</label>
              <input className="input" value={form.phone} onChange={set("phone")} disabled={busy} />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={set("email")} disabled={busy} />
          </div>
          <div>
            <label className="label">Subject</label>
            <input className="input" value={form.subject} onChange={set("subject")} disabled={busy} />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea
              className="input min-h-[130px] resize-none"
              value={form.message}
              onChange={set("message")}
              disabled={busy}
            />
          </div>
          <button type="submit" className="btn-brand" disabled={busy}>
            {busy ? <Spinner size={15} /> : <FiSend size={14} />}
            {busy ? "Sending..." : "Send message"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Contact;
