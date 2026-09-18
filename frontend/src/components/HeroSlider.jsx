import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiArrowRight, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { HERO_SLIDES } from "../utils/site.js";

const AUTOPLAY_MS = 5000;
const IMAGE_TRANSITION_S = 0.6;
const EASE = [0.16, 1, 0.3, 1];

const imageVariants = {
  enter: (direction) => ({ x: direction >= 0 ? "100%" : "-100%" }),
  center: { x: 0 },
  exit: (direction) => ({ x: direction >= 0 ? "-100%" : "100%" }),
};

const textContainerVariants = {
  hidden: {},
  visible: { transition: { delayChildren: IMAGE_TRANSITION_S, staggerChildren: 0.1 } },
};

const textItemVariants = (fromRight) => ({
  hidden: { opacity: 0, x: fromRight ? 40 : -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
});

const bulletListVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const HeroSlider = () => {
  const [[index, direction], setSlide] = useState([0, 0]);
  const count = HERO_SLIDES.length;
  const indexRef = useRef(index);
  indexRef.current = index;

  const paginate = useCallback(
    (delta) => setSlide(() => [(indexRef.current + delta + count) % count, delta]),
    [count]
  );
  const goTo = useCallback(
    (i) => setSlide(() => [i, i >= indexRef.current ? 1 : -1]),
    []
  );

  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => paginate(1), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [count, paginate]);

  const slide = HERO_SLIDES[index];
  const fromRight = index % 2 === 1;
  const textRight = slide.textAlign ? slide.textAlign === "right" : fromRight;
  const positionClass = fromRight ? "justify-end" : "justify-start";
  const alignClass = textRight ? "text-right items-end" : "text-left items-start";
  const sideClass = `${positionClass} ${alignClass}`;
  const itemVariants = textItemVariants(fromRight);

  return (
    <section className="relative h-[calc(100vh-64px)] md:h-[calc(100vh-100px)] min-h-[420px] max-h-[640px] overflow-hidden bg-slate-900">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={index}
          custom={direction}
          variants={imageVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: IMAGE_TRANSITION_S, ease: EASE }}
          className="absolute inset-0"
        >
          <img
            src={slide.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading={index === 0 ? "eager" : "lazy"}
          />
          <div
            className={`absolute inset-0 ${
              fromRight
                ? "bg-gradient-to-l from-slate-900/75 via-slate-900/35 to-transparent"
                : "bg-gradient-to-r from-slate-900/75 via-slate-900/35 to-transparent"
            }`}
          />
        </motion.div>
      </AnimatePresence>

      <div
        className={`relative h-full max-w-7xl mx-auto pl-5 sm:pl-8 flex items-center ${sideClass} ${
          fromRight ? "pr-1 sm:pr-2" : "pr-5 sm:pr-8"
        }`}
      >
        <motion.div
          key={index}
          variants={textContainerVariants}
          initial="hidden"
          animate="visible"
          className={`max-w-lg flex flex-col ${sideClass}`}
        >
          {slide.eyebrow && (
            <motion.p
              variants={itemVariants}
              className="text-[12px] font-semibold uppercase tracking-[0.22em] text-white/80"
            >
              {slide.eyebrow}
            </motion.p>
          )}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mt-4 leading-[1.08] text-white"
          >
            {slide.title}
          </motion.h1>
          {slide.subtitle && (
            <motion.p
              variants={itemVariants}
              className="text-[15px] sm:text-base text-white/85 mt-5 max-w-md leading-relaxed"
            >
              {slide.subtitle}
            </motion.p>
          )}
          <motion.ul variants={bulletListVariants} className="mt-5 space-y-2 w-full">
            {slide.bullets.map((b) => (
              <motion.li
                key={b}
                variants={itemVariants}
                className={`flex items-center gap-2 text-[14px] sm:text-[15px] text-white/90 ${
                  textRight ? "justify-end" : ""
                }`}
              >
                <span className="h-1 w-1 rounded-full bg-white/70 shrink-0" />
                {b}
              </motion.li>
            ))}
          </motion.ul>
          <motion.div variants={itemVariants} className="mt-8">
            <Link
              to={slide.buttonLink || "/products"}
              className="bg-white text-slate-900 hover:bg-white/90 text-sm font-semibold px-6 py-3 rounded-full shadow-sm transition-colors inline-flex items-center gap-2"
            >
              {slide.buttonText || "Shop Now"}
              <FiArrowRight size={15} />
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => paginate(-1)}
            aria-label="Previous slide"
            className="group absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white/80 hover:bg-white/20 hover:text-white transition-colors focus:outline-none"
          >
            <FiChevronLeft size={22} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => paginate(1)}
            aria-label="Next slide"
            className="group absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white/80 hover:bg-white/20 hover:text-white transition-colors focus:outline-none"
          >
            <FiChevronRight size={22} strokeWidth={2} />
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {HERO_SLIDES.map((s, i) => (
              <button
                key={s.image}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default HeroSlider;
