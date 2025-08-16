import { useEffect, useMemo, useState } from "react";

export default function useCountdown(utcDateStr, { tickMs = 1000 } = {}) {
  const target = useMemo(() => {
    if (!utcDateStr) return null;
    const d = new Date(utcDateStr);
    // Fastfrys til DK-tid på datoens basis? Nej – vi viser reel tid til UTC-datoen.
    return d.getTime();
  }, [utcDateStr]);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [target, tickMs]);

  const totalMs = target ? Math.max(0, target - now) : 0;

  const parts = useMemo(() => {
    let ms = totalMs;
    const day = Math.floor(ms / (24 * 60 * 60 * 1000));
    ms -= day * 24 * 60 * 60 * 1000;
    const hour = Math.floor(ms / (60 * 60 * 1000));
    ms -= hour * 60 * 60 * 1000;
    const minute = Math.floor(ms / (60 * 1000));
    ms -= minute * 60 * 1000;
    const second = Math.floor(ms / 1000);
    return { day, hour, minute, second };
  }, [totalMs]);

  const formatted = useMemo(() => {
    if (!target) return "—";
    if (totalMs <= 0) return "I gang";
    if (parts.day > 0) return `${parts.day}d ${parts.hour}t`;
    if (parts.hour > 0) return `${parts.hour}t ${parts.minute}m`;
    if (parts.minute > 0) return `${parts.minute}m ${parts.second}s`;
    return `${parts.second}s`;
  }, [parts, target, totalMs]);

  return { totalMs, parts, formatted, isLive: totalMs === 0 };
}
