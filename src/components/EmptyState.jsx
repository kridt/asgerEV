export default function EmptyState({ label = "Ingen kampe i øjeblikket" }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/7 p-10 text-center text-white/70 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_80px_-40px_rgba(0,0,0,0.6)]">
      {label}
    </div>
  );
}
