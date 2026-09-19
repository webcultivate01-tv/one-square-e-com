import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiClock, FiMail, FiMapPin, FiPhone, FiSend, FiUser } from "react-icons/fi";
import { FaFacebookF, FaInstagram, FaWhatsapp } from "react-icons/fa";
import { serverUrl } from "../App.jsx";
import Reveal from "../components/Reveal.jsx";
import { Spinner } from "../components/ui.jsx";
import {
  CONTACT_ADDRESS,
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
  SOCIAL_LINKS,
} from "../utils/site.js";

const INFO = [
  { icon: FiMapPin, title: "Visit us", body: CONTACT_ADDRESS },
  { icon: FiPhone, title: "Call us", body: CONTACT_PHONE_DISPLAY, href: `tel:${CONTACT_PHONE_TEL}` },
  { icon: FiMail, title: "Email us", body: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
  { icon: FiClock, title: "Working hours", body: "Mon – Sat, 10:00 AM – 7:00 PM" },
];

const FIELDS = [
  { key: "name", label: "Full name", icon: FiUser, placeholder: "e.g. Aarav Sharma", required: true },
  { key: "email", label: "Email address", icon: FiMail, type: "email", placeholder: "you@example.com", required: true },
  { key: "phone", label: "Phone number", icon: FiPhone, placeholder: "+91 98765 43210", required: true },
];

const SOCIALS = [
  { Icon: FaInstagram, href: SOCIAL_LINKS.instagram, label: "Instagram" },
  { Icon: FaFacebookF, href: SOCIAL_LINKS.facebook, label: "Facebook" },
  { Icon: FaWhatsapp, href: SOCIAL_LINKS.whatsapp, label: "WhatsApp" },
];

const EMPTY_FORM = { name: "", email: "", phone: "", message: "" };

const Contact = () => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const missing = FIELDS.filter((f) => f.required && !form[f.key].trim());
    if (missing.length) {
      toast.error(`Please fill in your ${missing.map((f) => f.label.toLowerCase()).join(", ")}.`);
      return;
    }

    setBusy(true);
    try {
      const { data } = await axios.post(serverUrl + "/api/contact/send", form);
      toast.success(data.message || "Message sent.");
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not send your message.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-14 relative">
        <Reveal className="grid lg:grid-cols-5 rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-200 overflow-hidden bg-white">
          <div className="order-2 lg:order-1 lg:col-span-2 bg-gradient-to-br from-brand-500 to-brand-600 text-white p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-white/10 rounded-full" aria-hidden="true" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full translate-x-1/3 -translate-y-1/3" aria-hidden="true" />

            <div className="relative">
              <h2 className="text-base font-semibold">Contact information</h2>
              <p className="text-[12.5px] text-brand-100 mt-1">
                Fill up the form and our team will get back to you within 24 hours.
              </p>

              <div className="mt-6 space-y-4">
                {INFO.map(({ icon: Icon, title, body, href }) => (
                  <div key={title} className="flex items-start gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 transition-colors group-hover:bg-white/25">
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-brand-100">{title}</p>
                      {href ? (
                        <a href={href} className="text-[13px] font-medium hover:underline break-words">
                          {body}
                        </a>
                      ) : (
                        <p className="text-[13px] font-medium break-words">{body}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mt-6 flex items-center gap-2.5">
              {SOCIALS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 transition-colors flex items-center justify-center"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          <form onSubmit={submit} className="order-1 lg:order-2 lg:col-span-3 p-6 sm:p-7 space-y-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Send us a message</h2>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Fields marked <span className="text-brand-500 font-semibold">*</span> are required.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              {FIELDS.map(({ key, label, icon: Icon, type = "text", placeholder, required }) => (
                <div key={key}>
                  <label className="label" htmlFor={`contact-${key}`}>
                    {label} {required && <span className="text-brand-500">*</span>}
                  </label>
                  <div className="relative">
                    <Icon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      id={`contact-${key}`}
                      type={type}
                      className="input pl-10"
                      placeholder={placeholder}
                      value={form[key]}
                      onChange={set(key)}
                      disabled={busy}
                      required={required}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="label" htmlFor="contact-message">
                Message <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="contact-message"
                className="input min-h-[90px] resize-none"
                placeholder="Tell us a bit more about what you need..."
                value={form.message}
                onChange={set("message")}
                disabled={busy}
              />
            </div>

            <button type="submit" className="btn-brand w-full sm:w-auto" disabled={busy}>
              {busy ? <Spinner size={15} /> : <FiSend size={14} />}
              {busy ? "Sending..." : "Send message"}
            </button>
          </form>
        </Reveal>

        <Reveal className="mt-8 rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-56">
          <iframe
            title="Our location"
            src={`https://www.google.com/maps?q=${encodeURIComponent(CONTACT_ADDRESS)}&output=embed`}
            className="w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </Reveal>
      </div>
    </div>
  );
};

export default Contact;
