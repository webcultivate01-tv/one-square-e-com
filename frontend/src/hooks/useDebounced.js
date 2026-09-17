import { useEffect, useState } from "react";

/** Debounce a fast-changing value (search boxes, filter inputs). */
const useDebounced = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export default useDebounced;
