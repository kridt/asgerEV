import { useEffect, useMemo, useState, useCallback } from "react";
import Localbase from "localbase";
import footballLeagues from "./leagues.json";
import bookmakers from "./bookmakers.json";
import useTheme from "./hooks/useTheme";
import { cn } from "./lib/ui";

import HeaderBar from "./components/HeaderBar";
import SegmentedControl from "./components/SegmentedControl";
import BookmakerPills from "./components/BookmakerPills";
import SkeletonCard from "./components/SkeletonCard";
import EmptyState from "./components/EmptyState";
import MatchCard from "./components/MatchCard";

// Local DB
const db = new Localbase("evbets");

// Whitelists/filters
const VALID_SPORTS = ["Football", "Tennis", "Basketball"];
const FOOTBALL_WHITELIST = footballLeagues.map((l) => l.name);

function isRelevantBet(b) {
  const sport = b?.event?.sport;
  const league = b?.event?.league || "";
  if (!VALID_SPORTS.includes(sport)) return false;
  if (sport === "Football")
    return FOOTBALL_WHITELIST.some((l) => league.includes(l));
  if (sport === "Tennis") {
    return [
      "Wimbledon",
      "Grand Slam",
      "ATP",
      "Australian Open",
      "Roland Garros",
      "US Open",
      "French Open",
    ].some((t) => league.includes(t));
  }
  if (sport === "Basketball") return league.includes("NBA Summer League");
  return false;
}

export default function App({ isMyBets }) {
  const apiKey = import.meta.env.VITE_API_KEY;
  const [theme, setTheme] = useTheme("dark");
  const dark = theme === "dark";

  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null); // NEW
  const [activeSport, setActiveSport] = useState("Football");
  const [activeLeague, setActiveLeague] = useState(null);
  const [showAllEV, setShowAllEV] = useState(false);
  const [sortDirection, setSortDirection] = useState("asc");
  const [myBets, setMyBets] = useState([]);
  const [selectedBookmaker, setSelectedBookmaker] = useState(
    bookmakers?.[0]?.name || "bet365"
  );

  // Star/unstar
  const toggleBet = useCallback(
    async (bet) => {
      const exists = myBets.find((b) => b.id === bet.id);
      if (exists) {
        await db.collection("mybets").delete(bet.id);
        setMyBets((prev) => prev.filter((b) => b.id !== bet.id));
      } else {
        await db.collection("mybets").add(bet, bet.id);
        setMyBets((prev) => [...prev, bet]);
      }
    },
    [myBets]
  );

  // Fetch (wrap i useCallback så vi kan kalde refetch manuelt)
  const fetchData = useCallback(
    async (signal) => {
      // læs stjernede bets
      const saved = await db.collection("mybets").get();
      setMyBets(saved);

      if (isMyBets) {
        const filtered = saved.filter((b) => b.bookmaker === selectedBookmaker);
        setBets(filtered);
        setLoading(false);
        setLastUpdated(new Date());
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(
          `https://api.odds-api.io/v2/value-bets?apiKey=${apiKey}&bookmaker=${selectedBookmaker}&includeEventDetails=true`,
          signal ? { signal } : undefined
        );
        const data = await res.json();

        if (Array.isArray(data)) {
          const now = new Date();
          const threeDaysAhead = new Date(
            now.getTime() + 3 * 24 * 60 * 60 * 1000
          );

          const filteredAndEnhanced = data
            .filter((b) => {
              const matchDate = new Date(b.event?.date);
              return matchDate <= threeDaysAhead && isRelevantBet(b);
            })
            .map((b) => {
              const fairOdds = parseFloat(b.market?.[b.betSide]);
              const bookmakerOdds = parseFloat(b.bookmakerOdds?.[b.betSide]);
              const expectedValue =
                fairOdds && bookmakerOdds
                  ? (bookmakerOdds / fairOdds) * 100
                  : 0;
              return { ...b, expectedValue };
            });

          setBets(filteredAndEnhanced);
        }
        setLastUpdated(new Date());
      } catch (e) {
        if (e?.name !== "AbortError") {
          console.error("Fejl ved hentning:", e);
        }
      } finally {
        setLoading(false);
      }
    },
    [apiKey, isMyBets, selectedBookmaker]
  );

  // Effekt med AbortController (patch #1)
  useEffect(() => {
    const ac = new AbortController();
    fetchData(ac.signal);
    return () => ac.abort();
  }, [fetchData]);

  // Manuelt refetch (patch #4)
  const refetch = useCallback(() => {
    fetchData(); // uden signal — vi er ikke i en effect
  }, [fetchData]);

  // Groupings
  const groupedBySport = useMemo(() => {
    return bets.reduce((acc, bet) => {
      const sport = bet?.event?.sport || "Ukendt";
      (acc[sport] ||= []).push(bet);
      return acc;
    }, {});
  }, [bets]);

  const activeBets = groupedBySport[activeSport] || [];

  const leaguesWithBets = useMemo(() => {
    if (activeSport !== "Football") return [];
    const available = FOOTBALL_WHITELIST.filter((name) =>
      activeBets.some((b) => b.event?.league === name)
    );
    return ["Alle", ...available];
  }, [activeBets]);

  const groupedMatches = useMemo(() => {
    const base = activeBets
      .filter((b) =>
        activeSport === "Football"
          ? !activeLeague ||
            activeLeague === "Alle" ||
            b.event?.league === activeLeague
          : true
      )
      .filter((b) => (showAllEV ? true : b.expectedValue > 104))
      .sort((a, b) => {
        const da = new Date(a.event?.date).getTime();
        const dbt = new Date(b.event?.date).getTime();
        return sortDirection === "asc" ? da - dbt : dbt - da;
      });

    const grouped = base.reduce((acc, bet) => {
      const key = `${bet.event?.home}-${bet.event?.away}-${bet.event?.date}`;
      (acc[key] ||= []).push(bet);
      return acc;
    }, {});
    return grouped;
  }, [activeBets, activeLeague, activeSport, showAllEV, sortDirection]);

  const totalGroups = Object.keys(groupedMatches).length;

  return (
    <div
      className={cn(
        "relative min-h-screen w-full overflow-x-hidden",
        dark ? "dark bg-slate-950 text-white" : "bg-slate-100 text-slate-900"
      )}
    >
      {/* BG (forenklet) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-b",
            dark
              ? "from-slate-900/80 to-black/90"
              : "from-white/80 to-slate-100/90"
          )}
        />
        <div className="absolute -top-24 -left-20 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-[90px]" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-emerald-500/10 blur-[100px]" />
        <div className="liquid-blob absolute left-8 top-24 h-40 w-40 rounded-[40%_60%_60%_40%/40%_40%_60%_60%] bg-white/10" />
        <div className="liquid-blob2 absolute right-8 top-56 h-48 w-48 rounded-[60%_40%_40%_60%/60%_60%_40%_40%] bg-white/10" />
      </div>

      {/* PAGE */}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-24 pt-4 sm:gap-6 sm:px-6 lg:px-8">
        {/*  <HeaderBar
          isMyBets={isMyBets}
          dark={dark}
          onToggleTheme={() =>
            setTheme((t) => (t === "dark" ? "light" : "dark"))
          }
        /> */}

        {/* Statuslinje: sidst opdateret + Opdater-knap (patch #4) */}
        <div className="flex items-center justify-between text-xs text-white/70">
          <span>
            {lastUpdated
              ? `Opdateret ${new Date(lastUpdated).toLocaleTimeString("da-DK")}`
              : "Henter…"}
          </span>
          <button
            onClick={refetch}
            className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 backdrop-blur-xl hover:bg-white/15"
          >
            Opdater
          </button>
        </div>

        {/* Bookmakers */}
        <section className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-6">
          <div className="mb-2 text-xs uppercase tracking-wider text-white/70">
            Bookmakere
          </div>
          <div className="no-scrollbar -mx-1 flex snap-x items-center gap-2 overflow-x-auto px-1">
            <BookmakerPills
              list={bookmakers}
              value={selectedBookmaker}
              onChange={setSelectedBookmaker}
            />
          </div>
        </section>

        {/* Sport & Controls */}
        <section className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SegmentedControl
              options={VALID_SPORTS}
              value={activeSport}
              onChange={(v) => {
                setActiveSport(v);
                setActiveLeague(null);
              }}
            />
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/80">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border-white/30 bg-transparent text-emerald-400 focus:ring-emerald-400"
                  checked={showAllEV}
                  onChange={(e) => setShowAllEV(e.target.checked)}
                />
                Vis EV under 104%
              </label>
              <select
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value)}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/90 backdrop-blur-xl focus:outline-none"
              >
                <option value="asc">Tidligste kamp først</option>
                <option value="desc">Seneste kamp først</option>
              </select>
            </div>
          </div>

          {activeSport === "Football" && leaguesWithBets.length > 1 && (
            <div className="mt-4">
              {/* Mobil: behold horisontal scroll (bedre UX) */}
              <div className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 sm:hidden">
                {leaguesWithBets.map((lg) => {
                  const active =
                    lg === activeLeague ||
                    (activeLeague === null && lg === "Alle");
                  return (
                    <button
                      key={lg}
                      onClick={() => setActiveLeague(lg)}
                      className={
                        "shrink-0 snap-start rounded-2xl border px-3 h-10 text-sm backdrop-blur-xl transition " +
                        (active
                          ? "border-emerald-400/40 bg-emerald-400/20 text-emerald-100"
                          : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10")
                      }
                    >
                      {lg}
                    </button>
                  );
                })}
              </div>

              {/* Tablet/desktop: wrap til flere linjer */}
              <div className="hidden sm:flex sm:flex-wrap sm:gap-2">
                {leaguesWithBets.map((lg) => {
                  const active =
                    lg === activeLeague ||
                    (activeLeague === null && lg === "Alle");
                  return (
                    <button
                      key={lg}
                      onClick={() => setActiveLeague(lg)}
                      className={
                        "rounded-2xl border px-3 h-10 text-sm backdrop-blur-xl transition " +
                        (active
                          ? "border-emerald-400/40 bg-emerald-400/20 text-emerald-100"
                          : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10")
                      }
                    >
                      {lg}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Counter */}
        <div className="text-center text-sm text-white/70">
          {totalGroups} kamp(e) vises lige nu
        </div>

        {/* Content — stabile keys (patch #2) */}
        {loading ? (
          <div className="grid gap-5 sm:gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : Object.values(groupedMatches).length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-5 sm:gap-6">
            {Object.values(groupedMatches).map((group) => {
              const first = group[0];
              const stableKey = `${first?.event?.id ?? "noid"}-${
                first?.event?.date
              }-${first?.event?.home}-${first?.event?.away}`;
              return (
                <MatchCard
                  key={stableKey}
                  group={group}
                  myBets={myBets}
                  onToggleBet={toggleBet}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* sticky bottom bar på mobil */}
      <div className="fixed inset-x-0 bottom-0 z-40 block sm:hidden">
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-2xl shadow-[0_10px_40px_-20px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between text-xs text-white/80">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/30 bg-transparent text-emerald-400 focus:ring-emerald-400"
                  checked={showAllEV}
                  onChange={(e) => setShowAllEV(e.target.checked)}
                />
                EV &lt; 104%
              </label>
              <select
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value)}
                className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 backdrop-blur-xl"
              >
                <option value="asc">Tidligst</option>
                <option value="desc">Senest</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* blob animation */}
      <style>{`
        @keyframes blobFloat {
          0%, 100% { transform: translate3d(0,0,0) rotate(0deg); }
          50% { transform: translate3d(10px, -12px, 0) rotate(8deg); }
        }
        .liquid-blob { animation: blobFloat 12s ease-in-out infinite; filter: blur(12px); }
        .liquid-blob2 { animation: blobFloat 14s ease-in-out infinite reverse; filter: blur(10px); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
