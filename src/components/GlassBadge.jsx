import { cn } from "../lib/ui";

export default function GlassBadge({ className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs backdrop-blur-md",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_10px_30px_-10px_rgba(0,0,0,0.45)]",
        "border-white/10 bg-white/10 text-white/80",
        className
      )}
    >
      {children}
    </span>
  );
}
