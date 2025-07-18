import { useEffect, useState } from "react";
import footballLeagues from "./leagues.json";

function formatDanishTime(utcDateStr) {
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

function App() {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSport, setActiveSport] = useState(null);
  const [activeLeague, setActiveLeague] = useState(null);
  const [showAllEV, setShowAllEV] = useState(false);
  const [sortDirection, setSortDirection] = useState("asc");

  const validSports = ["Football", "Tennis", "Basketball"];
  const footballLeagueWhitelist = footballLeagues.map((l) => l.name);
  const apiKey = import.meta.env.VITE_API_KEY;

  const isRelevantBet = (b) => {
    const sport = b.event?.sport;
    const league = b.event?.league || "";
    if (!validSports.includes(sport)) return false;

    if (sport === "Football") {
      return footballLeagueWhitelist.some((l) => league.includes(l));
    }

    if (sport === "Tennis") {
      return (
        league.includes("Wimbledon") ||
        league.includes("Grand Slam") ||
        league.includes("ATP") ||
        league.includes("Australian Open") ||
        league.includes("Roland Garros") ||
        league.includes("US Open") ||
        league.includes("French Open")
      );
    }

    if (sport === "Basketball") {
      return league.includes("NBA Summer League");
    }

    return false;
  };

  useEffect(() => {
    async function fetchBets() {
      try {
        const res = await fetch(
          `https://api.odds-api.io/v2/value-bets?apiKey=${apiKey}&bookmaker=Bet365&includeEventDetails=true`
        );
        const data = await res.json();
        console.log(data);

        if (Array.isArray(data)) {
          const now = new Date();
          const threeDaysAhead = new Date(
            now.getTime() + 3 * 24 * 60 * 60 * 1000
          );

          const filtered = data.filter((b) => {
            const matchDate = new Date(b.event?.date);
            return matchDate <= threeDaysAhead && isRelevantBet(b);
          });

          setBets(filtered);
          setActiveSport("Football");
        } else {
          console.error("Fejl: Ikke et array", data);
        }
      } catch (err) {
        console.error("Fejl ved hentning:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchBets();
  }, []);

  const grouped = bets.reduce((acc, bet) => {
    const sport = bet.event?.sport || "Ukendt";
    acc[sport] = acc[sport] || [];
    acc[sport].push(bet);
    return acc;
  }, {});

  const activeBets = grouped[activeSport] || [];

  const leaguesWithBets =
    activeSport === "Football"
      ? [
          "Alle",
          ...footballLeagueWhitelist.filter((name) =>
            activeBets.some((b) => b.event?.league === name)
          ),
        ]
      : [];

  const filteredBetsRaw = activeBets
    .filter((b) =>
      activeSport === "Football"
        ? !activeLeague ||
          activeLeague === "Alle" ||
          b.event?.league === activeLeague
        : true
    )
    .filter((b) => showAllEV || b.expectedValue > 104)
    .sort((a, b) =>
      sortDirection === "asc"
        ? new Date(a.event?.date) - new Date(b.event?.date)
        : new Date(b.event?.date) - new Date(a.event?.date)
    );

  const groupedBets = filteredBetsRaw.reduce((acc, bet) => {
    const key = `${bet.event?.home}-${bet.event?.away}-${bet.event?.date}`;
    acc[key] = acc[key] || [];
    acc[key].push(bet);
    return acc;
  }, {});

  return (
    <div
      style={{
        fontFamily: "sans-serif",
        background: "#121212",
        color: "#e0e0e0",
        minHeight: "100vh",
        padding: "1rem",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ color: "#ffffff", fontSize: "1.8rem", textAlign: "center" }}>
        EV Bets
      </h1>

      {loading ? (
        <p>Henter data...</p>
      ) : (
        <>
          {/* Sport Tabs */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: "1rem",
            }}
          >
            {["Football", "Tennis", "Basketball"].map((sport) => (
              <button
                key={sport}
                onClick={() => {
                  setActiveSport(sport);
                  setActiveLeague(null);
                }}
                style={{
                  padding: "0.4rem 1rem",
                  borderRadius: "5px",
                  border: "1px solid #555",
                  background: sport === activeSport ? "#1e1e1e" : "#2a2a2a",
                  color: sport === activeSport ? "#00ff88" : "#ccc",
                  cursor: "pointer",
                }}
              >
                {sport}
              </button>
            ))}
          </div>

          {/* EV Checkbox */}
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <label>
              <input
                type="checkbox"
                checked={showAllEV}
                onChange={(e) => setShowAllEV(e.target.checked)}
                style={{ marginRight: "0.5rem" }}
              />
              Vis alle EV%, også under 104%
            </label>
          </div>

          {/* Sortering dropdown */}
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <label>
              Sortering:{" "}
              <select
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value)}
                style={{
                  padding: "0.3rem",
                  background: "#1e1e1e",
                  color: "#fff",
                  border: "1px solid #555",
                  borderRadius: "4px",
                }}
              >
                <option value="asc">Tidligste kamp først</option>
                <option value="desc">Seneste kamp først</option>
              </select>
            </label>
          </div>

          {/* League Tabs */}
          {activeSport === "Football" && leaguesWithBets.length > 1 && (
            <div
              style={{
                display: "flex",
                gap: "0.4rem",
                flexWrap: "wrap",
                marginBottom: "1rem",
              }}
            >
              {leaguesWithBets.map((league) => (
                <button
                  key={league}
                  onClick={() => setActiveLeague(league)}
                  style={{
                    padding: "0.3rem 0.8rem",
                    fontSize: "0.85rem",
                    borderRadius: "4px",
                    border: "1px solid #555",
                    background:
                      league === activeLeague ||
                      (activeLeague === null && league === "Alle")
                        ? "#1e1e1e"
                        : "#2a2a2a",
                    color:
                      league === activeLeague ||
                      (activeLeague === null && league === "Alle")
                        ? "#00ff88"
                        : "#ccc",
                    cursor: "pointer",
                  }}
                >
                  {league}
                </button>
              ))}
            </div>
          )}

          <p style={{ color: "#aaa", textAlign: "center" }}>
            {Object.keys(groupedBets).length} kamp(e) vises lige nu
          </p>

          {Object.entries(groupedBets).length === 0 && (
            <p style={{ textAlign: "center", color: "#777" }}>
              Ingen kampe i øjeblikket
            </p>
          )}

          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {Object.entries(groupedBets).map(([key, group]) => {
              const first = group[0];
              return (
                <div
                  key={key}
                  style={{
                    background: "#1e1e1e",
                    padding: "1rem",
                    borderRadius: "8px",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.4)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                      color: "#fff",
                    }}
                  >
                    {first.event?.home} vs {first.event?.away}
                  </div>

                  <div style={{ color: "#aaa", fontSize: "0.9rem" }}>
                    {first.event?.league}
                  </div>

                  <div style={{ margin: "0.5rem 0" }}>
                    Starttid (DK):{" "}
                    <strong>{formatDanishTime(first.event?.date)}</strong>
                  </div>

                  {group.map((bet, i) => {
                    const fair = parseFloat(bet.market?.[bet.betSide]);
                    const bookmaker = parseFloat(
                      bet.bookmakerOdds?.[bet.betSide]
                    );
                    const safetyFactor = 1.04 / 0.9393;
                    const minOdds = fair * safetyFactor;

                    return (
                      <div
                        key={bet.id}
                        style={{ marginTop: i === 0 ? 0 : "1rem" }}
                      >
                        {i !== 0 && <hr style={{ border: "1px solid #333" }} />}
                        <div style={{ marginTop: "0.5rem" }}>
                          Marked:{" "}
                          <strong>
                            {bet.market?.name} {bet.market?.hdp}
                          </strong>
                        </div>
                        <div>
                          Vi spiller: <strong>{bet.betSide}</strong>
                        </div>
                        <div>
                          Fair odds: <strong>{fair}</strong>
                        </div>
                        <div>
                          Bookmaker odds: <strong>{bookmaker}</strong>
                        </div>
                        <div style={{ margin: "0.5rem 0" }}>
                          EV%:{" "}
                          <strong
                            style={{
                              color:
                                bet.expectedValue > 104 ? "#00ff88" : "#f44336",
                            }}
                          >
                            {bet.expectedValue.toFixed(2)}%
                          </strong>
                        </div>
                        {bet.expectedValue > 104 && (
                          <div>
                            Mindste odds for 104% EV (sikker justeret):{" "}
                            <strong style={{ color: "#ffd54f" }}>
                              {minOdds.toFixed(3)}
                            </strong>
                          </div>
                        )}
                        <a
                          href={bet.bookmakerOdds?.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#4fc3f7",
                            textDecoration: "underline",
                          }}
                        >
                          Gå til odds
                        </a>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
