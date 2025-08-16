import { cn } from "../lib/ui";

export default function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-xl">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs transition sm:px-4 sm:py-2 sm:text-sm",
              active
                ? "bg-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
