import { motion } from "framer-motion";

const DIRECTIONS = {
  up: { y: 28 },
  down: { y: -28 },
  left: { x: 28 },
  right: { x: -28 },
  none: {},
};

/**
 * Fades + slides children into view as the user scrolls past them.
 * Wraps a single block-level section/div — animation plays once.
 */
const Reveal = ({
  as = "div",
  direction = "up",
  delay = 0,
  duration = 0.6,
  amount = 0.2,
  className = "",
  children,
  ...rest
}) => {
  const Component = motion[as] || motion.div;
  const offset = DIRECTIONS[direction] || {};

  return (
    <Component
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
      {...rest}
    >
      {children}
    </Component>
  );
};

export default Reveal;
