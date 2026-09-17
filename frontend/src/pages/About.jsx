import { Link } from "react-router-dom";
import { FiArrowRight, FiAward, FiTool, FiUsers } from "react-icons/fi";
import { SITE_NAME } from "../utils/site.js";

const STATS = [
  { value: "20+", label: "Years of craftsmanship" },
  { value: "10K+", label: "Homes furnished" },
  { value: "500+", label: "Curated designs" },
  { value: "98%", label: "Customer satisfaction" },
];

const VALUES = [
  { icon: FiTool, title: "Built to last", body: "Kiln-dried hardwood frames, high-density foam and reinforced joinery in every piece we make." },
  { icon: FiAward, title: "Design first", body: "In-house designers craft every collection with proportion, comfort and finish in mind." },
  { icon: FiUsers, title: "People first", body: "From our workshop to your living room, every step is handled by people who care about the outcome." },
];

const About = () => (
  <div>
    <section className="bg-slate-900 py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <p className="eyebrow text-slate-500">About us</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2">
          Built by {SITE_NAME}
        </h1>
        <p className="text-[14.5px] text-slate-400 mt-4 leading-relaxed max-w-2xl mx-auto">
          We design and manufacture furniture that's made to be lived with — comfortable, durable
          and finished with the kind of care that shows up years later, not just on day one.
        </p>
      </div>
    </section>

    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
      <div className="grid sm:grid-cols-4 gap-6 text-center">
        {STATS.map((s) => (
          <div key={s.label}>
            <p className="text-3xl font-bold text-brand-600">{s.value}</p>
            <p className="text-[12.5px] text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="bg-slate-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <p className="eyebrow">What we stand for</p>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Our values</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card p-6 text-center">
              <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center mx-auto">
                <Icon size={19} />
              </div>
              <h3 className="font-semibold text-slate-900 mt-4">{title}</h3>
              <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Ready to furnish your space?</h2>
      <p className="text-[14px] text-slate-500 mt-2">Browse the collection or talk to our team about a custom piece.</p>
      <div className="flex items-center justify-center gap-3 mt-6">
        <Link to="/shop" className="btn-brand">
          Shop Now <FiArrowRight size={14} />
        </Link>
        <Link to="/contact" className="btn-brand-outline">
          Contact Us
        </Link>
      </div>
    </section>
  </div>
);

export default About;
