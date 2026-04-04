import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function ScoreboardManager() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("schedule_master")
      .select("*");

    setGames(data || []);
  };

  /* ========================= */
  /* CLEAN DATA */
  /* ========================= */
  const cleanGames = games
    .map(g => ({
      ...g,
      clean_date: normalizeDate(g.event_date),
      clean_type: (g.event_type || "").toLowerCase()
    }))
    .filter(g => g.clean_type.includes("game"));

  /* ========================= */
  /* GROUP BY DATE */
  /* ========================= */
  const grouped = cleanGames.reduce((acc, g) => {
    if (!g.clean_date) return acc;

    if (!acc[g.clean_date]) acc[g.clean_date] = [];
    acc[g.clean_date].push(g);

    return acc;
  }, {});

  const dates = Object.keys(grouped).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  /* ========================= */
  /* ACTIONS */
  /* ========================= */
  const startGame = async (g) => {
    await supabase.from("scoreboard_live").insert({
      game_id: g.id,
      team: g.team,
      opponent: g.opponent,
      division: g.division,
      game_time: g.event_time,
      field: g.field,
      is_live: true
    });
  };

  return (
    <div>

      <div className="card">
        <div className="title">Scoreboard Manager</div>
      </div>

      {dates.map(date => (
        <div key={date}>

          {/* DATE HEADER */}
          <div className="card active-card">
            <div className="title">{formatDate(date)}</div>
          </div>

          {/* GAMES */}
          {grouped[date]
            .sort((a, b) => toTime(a.event_time) - toTime(b.event_time))
            .map((g, i) => (
              <div key={g.id}>

                {i !== 0 && <div className="divider" />}

                <div className="inner-tile">

                  <div className="game-row">

                    <div className="game-top">
                      <div className="team">{g.team}</div>
                      <div className="game-time">{g.event_time}</div>
                    </div>

                    <div className="vs">vs</div>

                    <div className="game-bottom">
                      <div className="team">{g.opponent}</div>
                      <div className="field-badge">{g.field}</div>
                    </div>

                  </div>

                  <button
                    className="button"
                    onClick={() => startGame(g)}
                  >
                    Start Game
                  </button>

                </div>

              </div>
            ))}

        </div>
      ))}

    </div>
  );
}

/* ========================= */
/* HELPERS */
/* ========================= */

function normalizeDate(dateStr) {
  if (!dateStr) return null;

  if (dateStr.includes("-")) return dateStr;

  const [m, d, y] = dateStr.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric"
  });
}

function toTime(timeStr) {
  if (!timeStr) return 0;

  const [time, mod] = timeStr.split(" ");
  let [h, m] = time.split(":");

  if (mod === "PM" && h !== "12") h = +h + 12;
  if (mod === "AM" && h === "12") h = "00";

  return parseInt(h) * 60 + parseInt(m);
}
