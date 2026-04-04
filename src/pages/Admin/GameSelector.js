import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function GameSelector({ onGameStart }) {
  const [games, setGames] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    const { data } = await supabase
      .from("schedule_master")
      .select("*");

    if (!data) return;

    const clean = data
      .map(g => ({
        ...g,
        clean_date: normalizeDate(g.event_date),
        clean_type: (g.event_type || "").toLowerCase().trim()
      }))
      .filter(g => g.clean_type.includes("game"));

    setGames(clean);
  }

  async function startGame(game) {
    const { data: existing } = await supabase
      .from("games_live")
      .select("*")
      .eq("schedule_id", game.id)
      .maybeSingle();

    if (existing) {
      onGameStart(existing, game);
      return;
    }

    const { data, error } = await supabase
      .from("games_live")
      .insert([
        {
          schedule_id: game.id,
          home_score: 0,
          away_score: 0,
          half: 1,
          clock: "24:00",
        },
      ])
      .select()
      .single();

    if (!error) onGameStart(data, game);
  }

  // ===== GROUP BY DATE =====
  const grouped = games.reduce((acc, g) => {
    if (!g.clean_date) return acc;

    if (!acc[g.clean_date]) acc[g.clean_date] = [];
    acc[g.clean_date].push(g);

    return acc;
  }, {});

  const dates = Object.keys(grouped).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  return (
    <div style={container}>

      {/* ================= DATE LIST ================= */}
      {!selectedDate &&
        dates.map(date => (
          <div
            key={date}
            className="card"
            onClick={() => setSelectedDate(date)}
          >
            <div className="title">{formatDate(date)}</div>
            <div className="sub">
              {grouped[date].length} games
            </div>
          </div>
        ))}

      {/* ================= GAMES ================= */}
      {selectedDate && (
        <div>

          <div className="card active-card">
            <div className="title">{formatDate(selectedDate)}</div>
          </div>

          <div
            className="card"
            onClick={() => setSelectedDate(null)}
          >
            <div className="sub">← Back</div>
          </div>

          {grouped[selectedDate]
            .sort((a, b) => toTime(a.event_time) - toTime(b.event_time))
            .map((item, i) => (
              <div key={item.id}>

                {i !== 0 && <div className="divider" />}

                <div
                  className="inner-tile"
                  onClick={() => startGame(item)}
                >
                  <div className="game-row">

                    <div className="game-top">
                      <div className="team">{item.team}</div>
                      <div className="game-time">{item.event_time}</div>
                    </div>

                    <div className="vs">vs</div>

                    <div className="game-bottom">
                      <div className="team">{item.opponent}</div>
                      <div className="field-badge">{item.field}</div>
                    </div>

                  </div>

                </div>

              </div>
            ))}

        </div>
      )}

    </div>
  );
}

/* ================= HELPERS ================= */

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

/* ================= STYLE ================= */

const container = {
  width: 300,
  padding: 10,
  overflowY: "auto",
  borderRight: "1px solid #e5e7eb"
};
