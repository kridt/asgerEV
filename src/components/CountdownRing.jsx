import { useMemo } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

export default function CountdownRing({
  totalMs,
  horizonMs = 48 * 60 * 60 * 1000,
  size = 18,
}) {
  const clamped = Math.max(0, Math.min(totalMs, horizonMs));
  const target = 1 - clamped / horizonMs; // 0..1 hvor 1=nu
  const p = useSpring(target, { stiffness: 120, damping: 18 });
  const r = 7; // stroke radius
  const c = 2 * Math.PI * r;

  // strokeDasharray direkte som motion value
  const dash = useTransform(p, (v) => `${v * c} ${c}`);

  const gradId = useMemo(
    () => `cdgrad-${Math.random().toString(36).slice(2)}`,
    []
  );

  return (
    <svg viewBox="0 0 20 20" width={size} height={size} className="-rotate-90">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="3"
      />
      <motion.circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={dash}
      />
    </svg>
  );
}
