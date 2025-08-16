import { motion } from "framer-motion";
import GlassBadge from "./GlassBadge";
import EVHero from "./EVHero";
import BetRow from "./BetRow";
import { formatDanishTime } from "../lib/ui";
import useCountdown from "../hooks/useCountdown";
import CountdownPill from "./CountdownPill";

export default function MatchCard({ group, myBets, onToggleBet }) {
  const first = group[0];
  const title = `${first?.event?.home} vs ${first?.event?.away}`;
  const bestEV = Math.max(...group.map((g) => g.expectedValue ?? 0));

  const cd = useCountdown(first?.event?.date);
  const tone = cd.isLive
    ? "live"
    : cd.totalMs <= 30 * 60 * 1000
    ? "soon"
    : "default";

  return (
    <motion.div
      initial={{ y: 16, opacity: 0, scale: 0.98 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.995 }}
      className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-2xl shadow-[0_30px_80px_-40px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-6"
      style={{
        transformStyle: "preserve-3d",
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
            {title}
          </h3>
          <div className="text-sm text-white/70">{first?.event?.league}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <GlassBadge>{formatDanishTime(first?.event?.date)}</GlassBadge>
            <CountdownPill
              label={cd.formatted}
              tone={tone}
              totalMs={cd.totalMs}
              className="whitespace-nowrap"
            />
          </div>
        </div>
        <div className="shrink-0 will-change-transform">
          <EVHero ev={bestEV} />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {group.map((bet) => {
          const isStarred = myBets.some((b) => b.id === bet.id);
          return (
            <motion.div
              key={bet.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.03 }}
            >
              <BetRow
                bet={bet}
                isStarred={isStarred}
                onToggleStar={onToggleBet}
              />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
