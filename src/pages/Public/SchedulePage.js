import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function SchedulePage() {
  const [games, setGames] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

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
  /* GROUP + SORT */
  /* ========================= */
  const grouped = games.reduce((acc, game) => {
    const date = normalizeDate(game.event_date);

    if (!acc[date]) acc[date] = [];
    acc[date].push(game);

    return acc;
  }, {});

  const dates = Object.keys(grouped).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  return (
    <div>

      {/* DATE SELECT */}
      {!selectedDate &&
        dates.map(date => (
          <div
            className="card"
            key={date}
            onClick={() => setSelectedDate(date)}
          >
            <div className="title">{formatDate(date)}</div>
            <div className="sub">
              {grouped[date].length} games
            </div>
          </div>
        ))}

      {/* SELECTED DATE */}
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

          {grouped[selectedDate].map((game, i) => (
            <div key={game.id}>

              {i !== 0 && <div className="divider" />}

              <div className="inner-tile">

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
  if (!dateStr) return "";

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
