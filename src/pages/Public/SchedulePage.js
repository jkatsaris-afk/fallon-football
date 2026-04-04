import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function SchedulePage() {
  const [games, setGames] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data, error } = await supabase
      .from("schedule_master")
      .select("*");

    console.log("SCHEDULE DATA:", data);
    console.log("SCHEDULE ERROR:", error);

    if (!data) return;

    setGames(data);
  };

  /* CLEAN DATA */
  const cleanGames = games.map(g => ({
    ...g,
    clean_date: normalizeDate(g.event_date),
    clean_type: (g.event_type || "").toLowerCase().trim()
  }));

  /* GROUP BY DATE */
  const grouped = cleanGames.reduce((acc, game) => {
    if (!game.clean_date) return acc;

    if (!acc[game.clean_date]) acc[game.clean_date] = [];
    acc[game.clean_date].push(game);

    return acc;
  }, {});

  /* SORT DATES */
  const dates = Object.keys(grouped).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  return (
    <div>

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
              {grouped[date].length} events
            </div>
          </div>
        ))}

      {/* ================= TYPE SELECT ================= */}
      {selectedDate && !selectedType && (
        <div>

          <div className="card active-card">
            <div className="title">{formatDate(selectedDate)}</div>
          </div>

          <div
            className="card"
            onClick={() => setSelectedType("game")}
          >
            <div className="title">Games</div>
          </div>

          <div
            className="card"
            onClick={() => setSelectedType("practice")}
          >
            <div className="title">Practices</div>
          </div>

          <div
            className="card"
            onClick={() => {
              setSelectedDate(null);
              setSelectedType(null);
            }}
          >
            <div className="sub">← Back</div>
          </div>

        </div>
      )}

      {/* ================= RESULTS ================= */}
      {selectedDate && selectedType && (
        <div>

          <div className="card active-card">
            <div className="title">
              {formatDate(selectedDate)} - {selectedType.toUpperCase()}
            </div>
          </div>

          <div
            className="card"
            onClick={() => setSelectedType(null)}
          >
            <div className="sub">← Back</div>
          </div>

          {grouped[selectedDate]
            .filter(g => g.clean_type.includes(selectedType))
            .sort((a, b) => toTime(a.event_time) - toTime(b.event_time))
            .map((item, i) => (
              <div key={item.id}>

                {i !== 0 && <div className="divider" />}

                <div className="inner-tile">

                  {selectedType === "game" ? (
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
                  ) : (
                    <div className="practice-row">

                      <div className="team">{item.team}</div>
                      <div className="game-time">{item.event_time}</div>
                      <div className="field-badge">{item.field}</div>

                    </div>
                  )}

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

  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;

  const [m, d, y] = parts;
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
