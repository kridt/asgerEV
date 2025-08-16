// Små UI-helpers
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function formatDanishTime(utcDateStr) {
  if (!utcDateStr) return "—";
  const date = new Date(utcDateStr);
  const dkDate = new Date(
    date.toLocaleString("en-US", { timeZone: "Europe/Copenhagen" })
  );
  const now = new Date();
  const today = new Date(
    now.toLocaleDateString("en-US", { timeZone: "Europe/Copenhagen" })
  );
  const isToday = dkDate.toDateString() === today.toDateString();
  const time = dkDate.toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dayMonth = dkDate.toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
  });
  return isToday ? `I dag kl. ${time}` : `${dayMonth} kl. ${time}`;
}
