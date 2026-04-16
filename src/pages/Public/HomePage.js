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
  const [allGames, setAllGames] = useState([]);
  const [liveGames, setLiveGames] = useState([]);
  const [upcomingGames, setUpcomingGames] = useState([]);
  const [now, setNow] = useState(new Date()); // 🔥 NEW

  useEffect(() => {
    fetchGames();
  }, []);

  // 🔥 LIVE UPDATE (every minute)
  useEffect(() => {
    const interval = setInterval(() => {
      processGames();
    }, 60000);

    return () => clearInterval(interval);
  }, [allGames]);

  // 🔥 COUNTDOWN TIMER (every second)
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchGames = async () => {
    const { data } = await supabase
      .from("schedule_master")
      .select("*");

    if (!data) return;

    setAllGames(data);
    processGames(data);
  };

  const processGames = (source = allGames) => {
    const now = new Date();

    const processed = source
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

      <div className="card">
        <div className="title">Fallon Flag Football</div>
        <div className="sub">2026 Season</div>
      </div>

      <div className="card">

        <div className="title">
          {liveGames.length > 0 ? "Live Games" : "Upcoming Games"}
        </div>

        {liveGames.length > 0 &&
          liveGames.map((g, i) => (
            <GameRow key={g.id} game={g} index={i} live now={now} />
          ))}

        {liveGames.length === 0 &&
          upcomingGames.slice(0, 3).map((g, i) => (
            <GameRow key={g.id} game={g} index={i} now={now} />
          ))}

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
function GameRow({ game, index, live, now }) {

  const countdown = getCountdown(game.start, game.end, now);

  return (
    <div>
      {index !== 0 && <div className="divider" />}

      <div className="inner-tile">

        {/* 🔥 COUNTDOWN */}
        {countdown === "LIVE" ? (
          <div className="sub live">● LIVE</div>
        ) : (
          <div className="sub countdown">
            Starts in {countdown}
          </div>
        )}

        <div className="game-row">
          <div className="game-top">

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

            <div className="team-row">
              {getLogo(game.opponent) && (
                <img src={getLogo(game.opponent)} style={logo} />
              )}
              <span>{game.opponent || "TBD"}</span>
            </div>

            <div className="field-badge">
              {game.division} • {game.field}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

/* 🔥 COUNTDOWN FUNCTION */
function getCountdown(start, end, now) {
  if (!start) return "";

  if (now >= start && now < end) return "LIVE";

  const diff = start - now;
  if (diff <= 0) return "";

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) return `${hours}h ${mins}m`;

  return `${mins}m ${seconds}s`;
}

/* HELPERS */
function normalizeDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes("-")) return dateStr;

  const [m, d, y] = dateStr.split("/");
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

const logo = {
  width: 20,
  height: 20,
  marginRight: 6
};
