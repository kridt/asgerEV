import { cn } from "../lib/ui";

export default function BookmakerPills({ list, value, onChange }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {list.map((bm) => {
        const isActive = bm.name === value;
        return (
          <button
            key={bm.name}
            onClick={() => onChange(bm.name)}
            className={cn(
              "rounded-2xl border px-3 py-2 text-sm backdrop-blur-xl transition",
              isActive
                ? "border-cyan-400/40 bg-cyan-400/20 text-cyan-100 shadow-[0_10px_30px_-15px_rgba(34,211,238,0.6)]"
                : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
            )}
            title={decodeURIComponent(bm.name)}
          >
            {decodeURIComponent(bm.name)}
          </button>
        );
      })}
    </div>
  );
}
