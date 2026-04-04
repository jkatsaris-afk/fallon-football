import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function HomePage({ setPage }) {
  const [liveGames, setLiveGames] = useState([]);
  const [upcomingGames, setUpcomingGames] = useState([]);

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchGames = async () => {
    const { data } = await supabase
      .from("schedule_master")
      .select("*");

    const now = new Date();

    const processed = (data || [])
      .filter(g => g.event_type?.toLowerCase().includes("game"))

      .map(game => {
        const normalized = normalizeDate(game.event_date);

        const [y, m, d] = normalized.split("-");
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

      {/* HEADER TILE */}
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

/* ========================= */
/* GAME ROW */
/* ========================= */
function GameRow({ game, index, live }) {
  return (
    <div>
      {index !== 0 && <div className="divider" />}

      <div className="inner-tile">

        {live && <div className="sub live">● LIVE</div>}

        <div className="game-row">

          <div className="game-top">
            <div className="team">{game.team}</div>
            <div className="game-time">{game.event_time}</div>
          </div>

          <div className="vs">vs</div>

          <div className="game-bottom">
            <div className="team">{game.opponent}</div>
            <div className="field-badge">{game.field}</div>
          </div>

        </div>

      </div>
    </div>
  );
}

/* ========================= */
/* HELPERS */
/* ========================= */

function normalizeDate(dateStr) {
  if (!dateStr) return "";

  if (dateStr.includes("-")) return dateStr;

  const [m, d, y] = dateStr.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function convertTo24Hour(timeStr) {
  const [time, mod] = timeStr.split(" ");
  let [h, m] = time.split(":");

  if (mod === "PM" && h !== "12") h = +h + 12;
  if (mod === "AM" && h === "12") h = "00";

  return `${h}:${m}`;
}
