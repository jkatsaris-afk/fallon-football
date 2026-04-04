import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function ScoreboardManager() {
  const [games, setGames] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState(null);

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
      clean_type: (g.event_type || "").toLowerCase().trim()
    }))
    .filter(g => g.clean_type.includes("game"));

  /* ========================= */
  /* GROUP BY DATE */
  /* ========================= */
  const groupedDates = cleanGames.reduce((acc, g) => {
    if (!acc[g.clean_date]) acc[g.clean_date] = [];
    acc[g.clean_date].push(g);
    return acc;
  }, {});

  const dates = Object.keys(groupedDates).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  /* ========================= */
  /* DIVISIONS */
  /* ========================= */
  const divisions = selectedDate
    ? [...new Set(groupedDates[selectedDate].map(g => g.division))]
    : [];

  /* ========================= */
  /* GAMES */
  /* ========================= */
  const filteredGames =
    selectedDate && selectedDivision
      ? groupedDates[selectedDate]
          .filter(g => g.division === selectedDivision)
          .sort((a, b) => toTime(a.event_time) - toTime(b.event_time))
      : [];

  /* ========================= */
  /* ACTION */
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

      {/* ========================= */}
      {/* STEP 1: DATE */}
      {/* ========================= */}
      {!selectedDate &&
        dates.map(date => (
          <div
            key={date}
            className="card"
            onClick={() => setSelectedDate(date)}
          >
            <div className="title">{formatDate(date)}</div>
          </div>
        ))}

      {/* ========================= */}
      {/* STEP 2: DIVISION */}
      {/* ========================= */}
      {selectedDate && !selectedDivision && (
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

          {divisions.map(div => (
            <div
              key={div}
              className="card"
              onClick={() => setSelectedDivision(div)}
            >
              <div className="title">{div}</div>
            </div>
          ))}

        </div>
      )}

      {/* ========================= */}
      {/* STEP 3: GAMES */}
      {/* ========================= */}
      {selectedDate && selectedDivision && (
        <div>

          <div className="card active-card">
            <div className="title">
              {formatDate(selectedDate)} - {selectedDivision}
            </div>
          </div>

          <div
            className="card"
            onClick={() => setSelectedDivision(null)}
          >
            <div className="sub">← Back</div>
          </div>

          {filteredGames.map((g, i) => (
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
      )}

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
