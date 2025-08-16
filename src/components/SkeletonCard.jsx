export default function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/7 p-5 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_80px_-40px_rgba(0,0,0,0.6)] animate-pulse sm:p-6">
      <div className="mb-3 h-6 w-2/3 rounded bg-white/10" />
      <div className="mb-5 h-4 w-1/3 rounded bg-white/10" />
      <div className="flex gap-3">
        <div className="h-4 w-24 rounded bg-white/10" />
        <div className="h-4 w-20 rounded bg-white/10" />
        <div className="h-4 w-16 rounded bg-white/10" />
      </div>
    </div>
  );
}
