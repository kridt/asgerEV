import { cn } from "../lib/ui";
import CountdownRing from "./CountdownRing";

export default function CountdownPill({
  label,
  tone = "default",
  className,
  totalMs,
  horizonMs,
}) {
  const tones = {
    default: "border-white/15 bg-white/10 text-white/85",
    soon: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    live: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    late: "border-rose-400/30 bg-rose-400/10 text-rose-100",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs backdrop-blur-xl",
        tones[tone] || tones.default,
        className
      )}
      aria-live="polite"
    >
      <CountdownRing
        totalMs={totalMs ?? 0}
        horizonMs={horizonMs ?? 48 * 60 * 60 * 1000}
      />
      {label}
    </span>
  );
}
