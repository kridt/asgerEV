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
const VALID_SPORTS = [
  "Football",
  "Tennis",
  "Basketball",
  "Esports",
  "Baseball",
];
const FOOTBALL_WHITELIST = footballLeagues.map((l) => l.name);

// --- Helpers (v3-safe) ---
const toNum = (v) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    if (v.trim().toUpperCase() === "N/A") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

const getHdp = (b) => {
  const m = b?.market;
  const bm = b?.bookmakerOdds;
  const fromMarket = m && m.hdp != null ? Number(m.hdp) : undefined;
  const fromBook = bm && bm.hdp != null ? toNum(bm.hdp) : undefined;
  return fromMarket ?? fromBook;
};

function isRelevantBet(b) {
  const sport = b?.event?.sport;
  const league = b?.event?.league || "";

  if (!VALID_SPORTS.includes(sport)) {
    console.log("FILTERED@sport", { reason: "invalid_sport", sport, b });
    return false;
  }

  if (sport === "Football") {
    const ok = FOOTBALL_WHITELIST.some((l) => league.includes(l));
    if (!ok)
      console.log("FILTERED@football", {
        reason: "league_not_whitelisted",
        league,
        b,
      });
    return ok;
  }

  if (sport === "Tennis") {
    const ok = [
      "Wimbledon",
      "Grand Slam",
      "ATP",
      "Australian Open",
      "Roland Garros",
      "US Open",
      "French Open",
    ].some((t) => league.includes(t));
    if (!ok)
      console.log("FILTERED@tennis", {
        reason: "league_not_relevant",
        league,
        b,
      });
    return ok;
  }

  if (sport === "Basketball") {
    const ok = league.includes("NBA Summer League");
    if (!ok)
      console.log("FILTERED@basketball", {
        reason: "league_not_relevant",
        league,
        b,
      });
    return ok;
  }
  if (sport === "Esports") {
    return true;
  }

  if (sport === "Baseball") {
    return true;
  }
  console.log("FILTERED@sport", { reason: "unknown_sport", sport, b });
  return false;
}

export default function App({ isMyBets }) {
  const apiKey = import.meta.env.VITE_API_KEY;
  const [theme, setTheme] = useTheme("dark");
  const dark = theme === "dark";

  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [activeSport, setActiveSport] = useState("Football");
  const [activeLeague, setActiveLeague] = useState(null);
  const [showAllEV, setShowAllEV] = useState(false);
  const [sortDirection, setSortDirection] = useState("asc");
  const [maxOddsFilter, setMaxOddsFilter] = useState("none"); // "none" | "2" | "3"

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
        console.log("MYBETS: removed", bet.id);
      } else {
        await db.collection("mybets").add(bet, bet.id);
        setMyBets((prev) => [...prev, bet]);
        console.log("MYBETS: added", bet.id);
      }
    },
    [myBets]
  );

  // Robust extractor (v3 kan returnere array eller wrapper)
  const extractItems = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.valueBets)) return data.valueBets;
    return [];
  };

  // Fetch (useCallback så vi kan kalde refetch manuelt) – med dybe logs
  const fetchData = useCallback(
    async (signal) => {
      const saved = await db.collection("mybets").get();
      setMyBets(saved);
      console.log("MYBETS: savedCount", saved?.length ?? 0);

      if (isMyBets) {
        const filtered = saved.filter((b) => b.bookmaker === selectedBookmaker);
        console.log(
          "MYBETS: showing",
          filtered.length,
          "for",
          selectedBookmaker
        );
        setBets(filtered);
        setLoading(false);
        setLastUpdated(new Date());
        return;
      }

      try {
        setLoading(true);
        const url = `https://api.odds-api.io/v3/value-bets?apiKey=${apiKey}&bookmaker=${selectedBookmaker}&includeEventDetails=true`;
        console.log("FETCH: url", url);
        const res = await fetch(url, signal ? { signal } : undefined);
        const raw = await res.json();
        const data = extractItems(raw);

        console.log("FETCH: rawKeys", Object.keys(raw || {}));
        console.log(
          "FETCH: items.count",
          Array.isArray(data) ? data.length : "not_array"
        );

        if (Array.isArray(data)) {
          const now = new Date();
          const threeDaysAhead = new Date(
            now.getTime() + 3 * 24 * 60 * 60 * 1000
          );

          let invalidDate = 0;
          let tooFar = 0;
          let sportLeagueFiltered = 0;

          const filteredAndEnhanced = data
            .filter((b) => {
              const dStr = b.event?.date;
              const matchDate = new Date(dStr);
              if (Number.isNaN(matchDate.getTime())) {
                invalidDate++;
                console.log("FILTERED@time", {
                  reason: "invalid_date",
                  dStr,
                  b,
                });
                return false;
              }
              if (matchDate > threeDaysAhead) {
                tooFar++;
                console.log("FILTERED@time", {
                  reason: "too_far_in_future",
                  date: dStr,
                  b,
                });
                return false;
              }
              const ok = isRelevantBet(b);
              if (!ok) sportLeagueFiltered++;
              return ok;
            })
            .map((b) => {
              // EV calc fra odds
              const fairOdds = toNum(b.market?.[b.betSide]);
              const bmOdds = toNum(b.bookmakerOdds?.[b.betSide]);
              const expectedValue =
                fairOdds && bmOdds ? (bmOdds / fairOdds) * 100 : 0;

              const hdp = getHdp(b);
              if (hdp != null && Number.isFinite(hdp)) {
                // valgfri log – nyttig til at se hvor spread bet findes
                // console.log("INFO@hdp", { id: b.id, hdp });
              }

              // Log edge cases
              if (!bmOdds)
                console.log("WARN@bookmakerOdds", {
                  reason: "missing_or_NA",
                  side: b.betSide,
                  odds: b.bookmakerOdds?.[b.betSide],
                  id: b.id,
                });
              if (!fairOdds)
                console.log("WARN@marketOdds", {
                  reason: "missing_or_NA",
                  side: b.betSide,
                  odds: b.market?.[b.betSide],
                  id: b.id,
                });

              return {
                ...b,
                expectedValue,
                _hdp: hdp,
              };
            });

          console.log("FILTER_SUMMARY", {
            total: data.length,
            invalidDate,
            tooFar,
            sportLeagueFiltered,
            remaining: filteredAndEnhanced.length,
          });

          setBets(filteredAndEnhanced);
        } else {
          console.log("ERROR", "Data was not an array after extraction");
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

  // Effect med AbortController
  useEffect(() => {
    const ac = new AbortController();
    fetchData(ac.signal);
    return () => ac.abort();
  }, [fetchData]);

  // Manuelt refetch
  const refetch = useCallback(() => {
    console.log("REFETCH: manual");
    fetchData(); // uden signal
  }, [fetchData]);

  // Groupings
  const groupedBySport = useMemo(() => {
    const g = bets.reduce((acc, bet) => {
      const sport = bet?.event?.sport || "Ukendt";
      (acc[sport] ||= []).push(bet);
      return acc;
    }, {});
    console.log(
      "GROUP@sport",
      Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.length]))
    );
    return g;
  }, [bets]);

  const activeBets = groupedBySport[activeSport] || [];

  const leaguesWithBets = useMemo(() => {
    if (activeSport !== "Football") return [];
    // Brug includes for at matche varierende liganavne i v3
    const available = FOOTBALL_WHITELIST.filter((name) =>
      activeBets.some((b) => (b.event?.league || "").includes(name))
    );
    console.log("UI@leaguesWithBets", { availableCount: available.length });
    return ["Alle", ...available];
  }, [activeBets]);

  const groupedMatches = useMemo(() => {
    console.log("GROUPED: start with", activeBets.length, "bets");

    const afterLeague = activeBets.filter((b) => {
      if (activeSport === "Football") {
        const ok =
          !activeLeague ||
          activeLeague === "Alle" ||
          (b.event?.league || "").includes(activeLeague);
        if (!ok)
          console.log("FILTERED@league", {
            expected: activeLeague,
            got: b.event?.league,
            id: b.id,
          });
        return ok;
      }
      return true;
    });

    console.log("GROUPED: afterLeague", afterLeague.length);

    const afterEV = afterLeague.filter((b) => {
      if (showAllEV) return true;
      const ok = b.expectedValue > 104;
      if (!ok)
        console.log("FILTERED@ev", {
          ev: b.expectedValue,
          threshold: 104,
          id: b.id,
        });
      return ok;
    });

    console.log("GROUPED: afterEV", afterEV.length);

    const afterMaxOdds = afterEV.filter((b) => {
      if (maxOddsFilter === "none") return true;
      const bm = toNum(b.bookmakerOdds?.[b.betSide]);
      if (!Number.isFinite(bm)) {
        console.log("FILTERED@odds", {
          reason: "not_finite",
          value: b.bookmakerOdds?.[b.betSide],
          id: b.id,
        });
        return false;
      }
      const cap = maxOddsFilter === "2" ? 2.0 : 3.0;
      const ok = bm <= cap;
      if (!ok)
        console.log("FILTERED@odds", { reason: "too_high", bm, cap, id: b.id });
      return ok;
    });

    console.log("GROUPED: afterMaxOdds", afterMaxOdds.length);

    const sorted = afterMaxOdds.sort((a, b) => {
      const da = new Date(a.event?.date).getTime();
      const db = new Date(b.event?.date).getTime();
      return sortDirection === "asc" ? da - db : db - da;
    });

    console.log("GROUPED: afterSort", sorted.length);

    const grouped = sorted.reduce((acc, bet) => {
      const key = `${bet.event?.home}-${bet.event?.away}-${bet.event?.date}`;
      (acc[key] ||= []).push(bet);
      return acc;
    }, {});
    console.log("GROUPED: groupsCount", Object.keys(grouped).length);

    return grouped;
  }, [
    activeBets,
    activeLeague,
    activeSport,
    showAllEV,
    sortDirection,
    maxOddsFilter,
  ]);

  const totalGroups = Object.keys(groupedMatches).length;

  return (
    <div
      className={cn(
        "relative min-h-screen w-full overflow-x-hidden",
        dark ? "dark bg-slate-950 text-white" : "bg-slate-100 text-slate-900"
      )}
    >
      {/* BG */}
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
        <HeaderBar
          isMyBets={isMyBets}
          dark={dark}
          onToggleTheme={() => {
            console.log("UI@themeToggle");
            setTheme((t) => (t === "dark" ? "light" : "dark"));
          }}
        />

        {/* Statuslinje */}
        <div className="flex items-center justify-between text-xs text-white/70">
          <span>
            {lastUpdated
              ? `Opdateret ${new Date(lastUpdated).toLocaleTimeString("da-DK", {
                  timeZone: "Europe/Malta",
                })}`
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
              onChange={(v) => {
                console.log("UI@bookmakerChange", v);
                setSelectedBookmaker(v);
              }}
            />
          </div>
        </section>

        {/* Sport & Controls */}
        <section className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <SegmentedControl
              options={VALID_SPORTS}
              value={activeSport}
              onChange={(v) => {
                console.log("UI@sportChange", v);
                setActiveSport(v);
                setActiveLeague(null);
              }}
            />

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-white/80">
              {/* EV filter */}
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border-white/30 bg-transparent text-emerald-400 focus:ring-emerald-400"
                  checked={showAllEV}
                  onChange={(e) => {
                    console.log("UI@showAllEV", e.target.checked);
                    setShowAllEV(e.target.checked);
                  }}
                />
                Vis EV under 104%
              </label>

              {/* Max odds */}
              <select
                value={maxOddsFilter}
                onChange={(e) => {
                  console.log("UI@maxOddsFilter", e.target.value);
                  setMaxOddsFilter(e.target.value);
                }}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/90 backdrop-blur-xl focus:outline-none"
                title="Maks. bookmaker-odds"
              >
                <option value="none">Ingen grænse</option>
                <option value="2">Max 2.00</option>
                <option value="3">Max 3.00</option>
              </select>

              {/* Sortering */}
              <select
                value={sortDirection}
                onChange={(e) => {
                  console.log("UI@sortDirection", e.target.value);
                  setSortDirection(e.target.value);
                }}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/90 backdrop-blur-xl focus:outline-none"
                title="Sortering"
              >
                <option value="asc">Tidligste kamp først</option>
                <option value="desc">Seneste kamp først</option>
              </select>
            </div>
          </div>

          {/* Ligaer – wrap til flere linjer */}
          {activeSport === "Football" && leaguesWithBets.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {leaguesWithBets.map((lg) => {
                const active =
                  lg === activeLeague ||
                  (activeLeague === null && lg === "Alle");
                return (
                  <button
                    key={lg}
                    onClick={() => {
                      console.log("UI@leagueChange", lg);
                      setActiveLeague(lg);
                    }}
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
          )}
        </section>

        {/* Counter */}
        <div className="text-center text-sm text-white/70">
          {totalGroups} kamp(e) vises lige nu
        </div>

        {/* Content */}
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
              // v3: brug eventId i stedet for event.id
              const stableKey = `${first?.eventId ?? "noid"}-${
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
            <div className="flex items-center justify-between gap-2 text-xs text-white/80">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/30 bg-transparent text-emerald-400 focus:ring-emerald-400"
                  checked={showAllEV}
                  onChange={(e) => {
                    console.log("UI@showAllEV_mobile", e.target.checked);
                    setShowAllEV(e.target.checked);
                  }}
                />
                EV &lt; 104%
              </label>

              {/* Max odds på mobil */}
              <select
                value={maxOddsFilter}
                onChange={(e) => {
                  console.log("UI@maxOddsFilter_mobile", e.target.value);
                  setMaxOddsFilter(e.target.value);
                }}
                className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 backdrop-blur-xl"
                title="Maks. bookmaker-odds"
              >
                <option value="none">Ingen</option>
                <option value="2">≤ 2.00</option>
                <option value="3">≤ 3.00</option>
              </select>

              <select
                value={sortDirection}
                onChange={(e) => {
                  console.log("UI@sortDirection_mobile", e.target.value);
                  setSortDirection(e.target.value);
                }}
                className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 backdrop-blur-xl"
                title="Sortering"
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
