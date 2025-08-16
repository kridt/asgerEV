import GlassBadge from "./GlassBadge";
import { cn } from "../lib/ui";

export default function BetRow({ bet, isStarred, onToggleStar }) {
  const fair = parseFloat(bet.market?.[bet.betSide]);
  const bookmaker = parseFloat(bet.bookmakerOdds?.[bet.betSide]);
  const minOdds = fair ? fair * 1.04 : null;
  const good = (bet.expectedValue ?? 0) >= 104;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/7 p-4 backdrop-blur-xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/60">
            Marked
          </div>
          <div className="text-base font-medium">
            {bet.market?.name} {bet.market?.hdp}
          </div>
          <div className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div>
              Vi spiller: <span className="font-semibold">{bet.betSide}</span>
            </div>
            <div>
              Fair: <span className="font-semibold">{fair}</span>
            </div>
            <div>
              Bookmaker: <span className="font-semibold">{bookmaker}</span>
            </div>
            <GlassBadge
              className={cn(
                "font-semibold",
                good ? "text-emerald-200" : "text-rose-200"
              )}
            >
              EV {bet.expectedValue?.toFixed?.(2)}%
            </GlassBadge>
          </div>

          {/* EV bar */}
          {Number.isFinite(bet.expectedValue) && (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full border border-white/10 bg-white/10">
              <div
                className={cn(
                  "h-full transition-all",
                  good
                    ? "bg-gradient-to-r from-emerald-400/80 to-cyan-400/80"
                    : "bg-gradient-to-r from-rose-400/80 to-amber-400/80"
                )}
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, ((bet.expectedValue - 100) / 10) * 100)
                  )}%`,
                }}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {minOdds && good && (
            <GlassBadge>
              Min. 104%:{" "}
              <span className="ml-1 font-semibold">{minOdds.toFixed(3)}</span>
            </GlassBadge>
          )}
          <button
            onClick={() => onToggleStar(bet)}
            aria-pressed={isStarred}
            aria-label={isStarred ? "Fjern stjernemarkering" : "Stjernemarkér"}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm backdrop-blur-xl transition",
              isStarred
                ? "border-yellow-400/30 bg-yellow-300/20 text-yellow-100"
                : "border-white/10 bg-white/10 text-white/90 hover:bg-white/15"
            )}
            title={isStarred ? "Fjern stjerne" : "Stjernemarkér"}
          >
            <span className="text-lg leading-none">★</span>
            {isStarred ? "Stjernemarkeret" : "Marker"}
          </button>

          <a
            href={bet.bookmakerOdds?.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 backdrop-blur-xl transition hover:bg-cyan-400/20"
          >
            Gå til odds ↗
          </a>
        </div>
      </div>
    </div>
  );
}
