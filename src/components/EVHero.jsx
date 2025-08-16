import { useEffect, useMemo, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { clamp, cn } from "../lib/ui";

export default function EVHero({ ev = 0 }) {
  const pct = Number.isFinite(ev) ? ev : 0;
  const good = pct >= 104;
  const target = clamp(((pct - 100) / 10) * 100, 0, 100); // 0..100 (100% EV->0, 110%->100)

  // Sweep til ringen
  const sweep = useSpring(target, { stiffness: 120, damping: 18, mass: 0.6 });
  const dash = useTransform(sweep, (v) => `${v},100`);

  // Tal-animation -> læg i state (React skal have primitive children)
  const [display, setDisplay] = useState(pct.toFixed(2));
  const count = useSpring(pct, { stiffness: 100, damping: 20 });

  useEffect(() => {
    count.set(pct);
    const unsub = count.on("change", (v) => setDisplay(Number(v).toFixed(2)));
    return () => unsub();
  }, [pct, count]);

  // Glow intensitet efter EV
  const glow = useTransform(sweep, (v) => (v > 40 ? 0.6 : 0.25));
  const gradId = useMemo(
    () => `evgrad-${Math.random().toString(36).slice(2)}`,
    []
  );

  return (
    <div className="relative flex items-center gap-4">
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={good ? "#34d399" : "#fb7185"} />
              <stop offset="100%" stopColor={good ? "#22d3ee" : "#f59e0b"} />
            </linearGradient>
          </defs>
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.15"
            strokeWidth="4"
          />
          <motion.circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={dash}
          />
        </svg>

        {/* glass highlight + adaptive glow */}
        <motion.div
          style={{ opacity: glow }}
          className="pointer-events-none absolute inset-0 rounded-full bg-white/30 backdrop-blur-xl mix-blend-overlay"
        />
        <motion.div
          style={{ opacity: glow }}
          className="pointer-events-none absolute -inset-1 rounded-full blur-xl"
        />
      </div>

      <div className="flex flex-col">
        <div
          className={cn(
            "text-2xl font-semibold leading-none",
            good ? "text-emerald-200" : "text-rose-200"
          )}
        >
          {display}%
        </div>
        <div className="text-xs text-white/60">Expected Value</div>
      </div>
    </div>
  );
}
