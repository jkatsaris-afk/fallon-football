import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

// ===== LOGOS =====
import sf from "../../resources/San Francisco 49ers.png";
import bengals from "../../resources/Cincinnati Bengals.png";
import bills from "../../resources/Buffalo Bills.png";
import broncos from "../../resources/Denver Broncos.png";
import chiefs from "../../resources/Kansas City Chiefs.png";
import colts from "../../resources/Indianapolis Colts.png";
import eagles from "../../resources/Philadelphia Eagles.png";
import jets from "../../resources/New York Jets.png";
import lions from "../../resources/Detroit Lions.png";
import raiders from "../../resources/Las Vegas Raiders.png";
import rams from "../../resources/Los Angeles Rams.png";
import steelers from "../../resources/Pittsburgh Steelers.png";

// ===== MAP =====
const teamLogos = {
  "49ers": sf,
  "Bengals": bengals,
  "Bills": bills,
  "Broncos": broncos,
  "Chiefs": chiefs,
  "Colts": colts,
  "Eagles": eagles,
  "Jets": jets,
  "Lions": lions,
  "Raiders": raiders,
  "Rams": rams,
  "Steelers": steelers,
};

// ===== HELPER =====
function getLogo(name) {
  if (!name) return null;
  return teamLogos[name.trim()] || null;
}

export default function HomePage({ setPage }) {
  const [liveGames, setLiveGames] = useState([]);
  const [upcomingGames, setUpcomingGames] = useState([]);

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchGames = async () => {
    const { data, error } = await supabase
      .from("schedule_master")
      .select("*");

    console.log("HOME DATA:", data);
    console.log("HOME ERROR:", error);

    if (!data) return;

    const now = new Date();

    const processed = data
      .map(g => ({
        ...g,
        clean_date: normalizeDate(g.event_date),
        clean_type: (g.event_type || "").toLowerCase().trim()
      }))
      .filter(g => g.clean_type.includes("game"))
      .map(game => {
        const [y, m, d] = game.clean_date.split("-");
        const time24 = convertTo24Hour(game.event_time);
        const [hour, minute] = time24.split(":");

        const start = new Date(y, m - 1, d, hour, minute);
        const end = new Date(start.getTime() + 15 * 60000);

        return {
          ...game,
          start,
          end
        };
      });

    const live = processed.filter(g => g.start <= now && g.end > now);

    const upcoming = processed
      .filter(g => g.start > now)
      .sort((a, b) => a.start - b.start);

    setLiveGames(live);
    setUpcomingGames(upcoming);
  };

  return (
    <div>

      {/* HEADER */}
      <div className="card">
        <div className="title">Fallon Flag Football</div>
        <div className="sub">2026 Season</div>
      </div>

      {/* LIVE / UPCOMING */}
      <div className="card">

        <div className="title">
          {liveGames.length > 0 ? "Live Games" : "Upcoming Games"}
        </div>

        {/* LIVE */}
        {liveGames.length > 0 &&
          liveGames.map((g, i) => (
            <GameRow key={g.id} game={g} index={i} live />
          ))}

        {/* UPCOMING */}
        {liveGames.length === 0 &&
          upcomingGames.slice(0, 3).map((g, i) => (
            <GameRow key={g.id} game={g} index={i} />
          ))}

        {/* EMPTY */}
        {liveGames.length === 0 && upcomingGames.length === 0 && (
          <div className="sub">No games found</div>
        )}

        <button className="button" onClick={() => setPage("schedule")}>
          View Schedule
        </button>

      </div>

    </div>
  );
}

/* GAME ROW */
function GameRow({ game, index, live }) {
  return (
    <div>
      {index !== 0 && <div className="divider" />}

      <div className="inner-tile">

        {live && <div className="sub live">● LIVE</div>}

        <div className="game-row">
          <div className="game-top">

            {/* TEAM 1 */}
            <div className="team-row">
              {getLogo(game.team) && (
                <img src={getLogo(game.team)} style={logo} />
              )}
              <span>{game.team}</span>
            </div>

            <div className="game-time">{game.event_time}</div>
          </div>

          <div className="vs">vs</div>

          <div className="game-bottom">

            {/* TEAM 2 */}
            <div className="team-row">
              {getLogo(game.opponent) && (
                <img src={getLogo(game.opponent)} style={logo} />
              )}
              <span>{game.opponent || "TBD"}</span>
            </div>

            <div className="field-badge">{game.field}</div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* HELPERS */
function normalizeDate(dateStr) {
  if (!dateStr) return null;

  if (dateStr.includes("-")) return dateStr;

  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;

  const [m, d, y] = parts;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function convertTo24Hour(timeStr) {
  if (!timeStr) return "00:00";

  const [time, mod] = timeStr.split(" ");
  let [h, m] = time.split(":");

  if (mod === "PM" && h !== "12") h = +h + 12;
  if (mod === "AM" && h === "12") h = "00";

  return `${h}:${m}`;
}

/* STYLE */
const logo = {
  width: 20,
  height: 20,
  marginRight: 6
};
