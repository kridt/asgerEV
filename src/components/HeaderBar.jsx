import { Link } from "react-router-dom";
import { cn } from "../lib/ui";
import { motion } from "framer-motion";

export default function HeaderBar({ isMyBets, dark, onToggleTheme }) {
  return (
    <div className="sticky top-2 z-50">
      <header className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 backdrop-blur-2xl shadow-[0_10px_40px_-20px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] sm:px-5 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="truncate text-lg font-semibold tracking-tight sm:text-2xl">
            {isMyBets ? "Mine Væddemål" : "EV Bets"}
          </h1>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onToggleTheme}
              role="switch"
              aria-checked={dark}
              onMouseDown={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty(
                  "--x",
                  `${e.clientX - r.left}px`
                );
                e.currentTarget.style.setProperty(
                  "--y",
                  `${e.clientY - r.top}px`
                );
              }}
              className={cn(
                "button-ripple relative inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs backdrop-blur-xl transition sm:px-3 sm:py-2 sm:text-sm",
                dark
                  ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
                  : "border-zinc-900/10 bg-white/70 text-zinc-900 hover:bg-white/80"
              )}
              aria-label={dark ? "Skift til lyst tema" : "Skift til mørkt tema"}
              title={dark ? "Skift til lyst tema" : "Skift til mørkt tema"}
            >
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 600, damping: 30 }}
                className="relative inline-flex h-5 w-10 items-center rounded-full border border-black/10 bg-white/80 dark:border-white/20 dark:bg-white/10"
              >
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 700, damping: 35 }}
                  className="absolute left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-md"
                  style={{ x: dark ? 22 : 0 }}
                />
              </motion.span>
              <span className="hidden sm:inline">
                {dark ? "Dark" : "Light"}
              </span>
            </button>

            {isMyBets ? (
              <Link
                to="/"
                className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-white/90 backdrop-blur-xl transition hover:bg-white/15 sm:text-sm"
              >
                Alle bets
              </Link>
            ) : (
              <Link
                to="/mybets"
                className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100 backdrop-blur-xl transition hover:bg-cyan-400/20 sm:text-sm"
              >
                Mine Væddemål
              </Link>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
