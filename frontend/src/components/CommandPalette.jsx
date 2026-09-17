import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCornerDownLeft, FiSearch } from "react-icons/fi";

/**
 * Ctrl-K / Cmd-K command palette. Jumps between console sections.
 * Only shows entries the signed-in admin actually has permission for.
 */
const CommandPalette = ({ open, onClose, commands = [] }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      // Focus after paint so the input is mounted.
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (c.section || "").toLowerCase().includes(q) ||
        (c.keywords || "").toLowerCase().includes(q)
    );
  }, [query, commands]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  const run = (command) => {
    onClose();
    if (command?.to) navigate(command.to);
    else command?.run?.();
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(results[active]);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden animate-fadeSlideDown">
        <div className="flex items-center gap-2.5 px-4 border-b border-slate-100">
          <FiSearch className="text-slate-400 shrink-0" size={16} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a section..."
            className="flex-1 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
            aria-label="Command palette search"
          />
          <kbd className="text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 shrink-0">
            Esc
          </kbd>
        </div>

        <ul className="max-h-[320px] overflow-y-auto scrollbar-refined py-1.5">
          {results.length === 0 && (
            <li className="px-4 py-8 text-center text-[13px] text-slate-400">
              Nothing matches “{query}”.
            </li>
          )}
          {results.map((c, i) => {
            const Icon = c.icon;
            return (
              <li key={c.to || c.label}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(c)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === active ? "bg-indigo-50" : "hover:bg-slate-50"
                  }`}
                >
                  {Icon && (
                    <Icon
                      size={15}
                      className={i === active ? "text-indigo-600" : "text-slate-400"}
                    />
                  )}
                  <span
                    className={`text-[13px] flex-1 ${
                      i === active ? "text-indigo-700 font-medium" : "text-slate-700"
                    }`}
                  >
                    {c.label}
                  </span>
                  {c.section && (
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      {c.section}
                    </span>
                  )}
                  {i === active && <FiCornerDownLeft size={13} className="text-indigo-500" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default CommandPalette;
