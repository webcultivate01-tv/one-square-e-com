import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import { motion } from "framer-motion";
import { STYLING_GUIDE } from "../utils/site.js";

const RULES = [
  "Choose pieces in a single colour palette and finish",
  "Measure your space before you fall in love with a piece",
  "Let one statement piece lead — don't overcrowd the room",
];

const StylingGuide = () => (
  <section className="bg-brand-50/40 py-16 sm:py-20">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 lg:grid-rows-[auto_1fr] gap-x-12 xl:gap-x-16 gap-y-8">
      {/* Heading — top-left, above the image */}
      <h2 className="lg:row-start-1 lg:col-start-1 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight self-start">
        Rules for choosing home décor
      </h2>

      {/* Sculpture image on an organic brand-coloured blob, with scatter dots like the reference */}
      <motion.div
        initial={{ opacity: 0, x: -60 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative flex items-center justify-center lg:row-start-2 lg:col-start-1 min-h-[320px] sm:min-h-[400px]"
      >
        <div
          className="absolute w-72 h-72 sm:w-96 sm:h-96 bg-brand-100/70"
          style={{ borderRadius: "62% 38% 33% 67% / 60% 32% 68% 40%" }}
        />
        <img
          src={STYLING_GUIDE.sculptureImage}
          alt="Decorative ginkgo leaf sculpture, part of the One Square accents collection"
          loading="lazy"
          className="relative w-56 sm:w-72 lg:w-80 drop-shadow-xl"
        />

        {/* Scatter dots, bottom-left of the image — decorative accent like the reference */}
        <div className="absolute left-0 bottom-4 w-28 h-20 sm:w-36 sm:h-24 pointer-events-none">
          {[
            { x: "4%", y: "10%", s: 14 },
            { x: "26%", y: "0%", s: 9 },
            { x: "0%", y: "45%", s: 10 },
            { x: "40%", y: "35%", s: 16 },
            { x: "16%", y: "70%", s: 8 },
            { x: "55%", y: "60%", s: 11 },
            { x: "62%", y: "15%", s: 7 },
          ].map((dot, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-brand-300/70"
              style={{ left: dot.x, top: dot.y, width: dot.s, height: dot.s }}
            />
          ))}
        </div>
      </motion.div>

      {/* Copy + bullets + lifestyle image — right column, spans both rows */}
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="lg:row-start-1 lg:row-span-2 lg:col-start-2 flex flex-col justify-center"
      >
        <p className="text-[15px] font-semibold text-slate-800">
          Whether you're furnishing your first home or refreshing a family living room, the right accent pieces make the space.
        </p>
        <p className="text-[13.5px] text-slate-500 mt-3 leading-relaxed">
          A living room is where everyone gathers and every guest lingers. Sculptures, showpieces and wall décor from our
          collection are designed to create a warm, welcoming look while holding up to everyday life.
        </p>

        <ul className="mt-5 space-y-2.5">
          {RULES.map((rule) => (
            <li key={rule} className="flex items-start gap-2.5 text-[13.5px] text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
              {rule}
            </li>
          ))}
        </ul>

        <Link to="/products" className="btn-brand mt-6 self-start">
          Shop décor & accents
          <FiArrowRight size={14} />
        </Link>

        {/* Lifestyle image card, no play/video affordance — a styled still */}
        <div className="relative mt-8 rounded-[2rem] overflow-hidden aspect-[16/10] sm:aspect-[16/9]">
          <img
            src={STYLING_GUIDE.lifestyleImage}
            alt="One Square sculpture styled in a living room"
            loading="lazy"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-brand-900/35" />
          <div className="absolute inset-0 flex items-center justify-center text-center px-6">
            <p className="text-white text-xl sm:text-2xl font-bold tracking-tight leading-snug">
              One Square Signature
              <br />
              Accents Collection
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default StylingGuide;
